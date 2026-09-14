type ChatJson = {
  choices?: { message?: { content?: string } }[];
};

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? trimmed;
  return JSON.parse(raw) as unknown;
}

export async function completeJson(prompt: string): Promise<unknown | null> {
  const openrouter = process.env.OPENROUTER_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  if (!openrouter && !openai) return null;

  const model =
    process.env.LLM_MODEL ||
    (openrouter ? "openai/gpt-4o-mini" : "gpt-4o-mini");

  const url = openrouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${openrouter || openai}`,
  };
  if (openrouter) {
    headers["HTTP-Referer"] =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    headers["X-Title"] = "Around";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write brief, opinionated orientation for working AI people. Not a reviewer summary. Return JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
    cache: "no-store",
  });

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
