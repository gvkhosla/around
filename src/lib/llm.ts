type ChatJson = {
  choices?: { message?: { content?: string } }[];
};

type Target = {
  url: string;
  model: string;
  headers: Record<string, string>;
  jsonMode: boolean;
};

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? trimmed;
  return JSON.parse(raw) as unknown;
}

function resolveTarget(): Target | null {
  const model = process.env.LLM_MODEL;
  const local = process.env.LLM_BASE_URL?.replace(/\/$/, "");
  if (local) {
    if (!model) {
      throw new Error("Set LLM_MODEL for the local server (e.g. qwen2.5:14b).");
    }
    return {
      url: `${local}/chat/completions`,
      model,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LLM_API_KEY || "local"}`,
      },
      jsonMode: process.env.LLM_JSON_MODE !== "0",
    };
  }

  const openrouter = process.env.OPENROUTER_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  if (openrouter) {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: model || "google/gemini-2.5-flash",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openrouter}`,
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
        "X-Title": "Around",
      },
      jsonMode: true,
    };
  }
  if (openai) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      model: model || "gpt-4o-mini",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai}`,
      },
      jsonMode: true,
    };
  }
  return null;
}

export async function completeJson(prompt: string): Promise<unknown | null> {
  const target = resolveTarget();
  if (!target) return null;

  const payload = (jsonMode: boolean) => {
    const body: Record<string, unknown> = {
      model: target.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You write brief, opinionated orientation for working AI people. Not a reviewer summary. Return JSON only. No markdown.",
        },
        { role: "user", content: prompt },
      ],
    };
    if (jsonMode) body.response_format = { type: "json_object" };
    return body;
  };

  const jsonMode = target.jsonMode;
  let res = await fetch(target.url, {
    method: "POST",
    headers: target.headers,
    body: JSON.stringify(payload(jsonMode)),
    cache: "no-store",
  });

  if (!res.ok && jsonMode && (res.status === 400 || res.status === 422)) {
    res = await fetch(target.url, {
      method: "POST",
      headers: target.headers,
      body: JSON.stringify(payload(false)),
      cache: "no-store",
    });
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as ChatJson;
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return extractJson(content);
  } catch {
    return null;
  }
}
