const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const AUTH_BASE = "https://auth.openai.com";
const TOKEN_URL = `${AUTH_BASE}/oauth/token`;
const DEVICE_USER_CODE_URL = `${AUTH_BASE}/api/accounts/deviceauth/usercode`;
const DEVICE_TOKEN_URL = `${AUTH_BASE}/api/accounts/deviceauth/token`;
const DEVICE_REDIRECT_URI = `${AUTH_BASE}/deviceauth/callback`;
export const DEVICE_VERIFICATION_URI = `${AUTH_BASE}/codex/device`;
const JWT_CLAIM = "https://api.openai.com/auth";
const CODEX_URL = "https://chatgpt.com/backend-api/codex/responses";

export type CodexTokens = {
  accessToken: string;
  refreshToken: string;
  expires: number;
  accountId: string;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

function accountIdFrom(access: string) {
  const payload = JSON.parse(
    Buffer.from(access.split(".")[1] ?? "", "base64url").toString("utf8"),
  ) as { [JWT_CLAIM]?: { chatgpt_account_id?: string } };
  const id = payload[JWT_CLAIM]?.chatgpt_account_id;
  if (!id) throw new Error("No ChatGPT account on this token.");
  return id;
}

function asTokens(json: TokenResponse): CodexTokens {
  if (!json.access_token || !json.refresh_token || typeof json.expires_in !== "number") {
    throw new Error("Codex token response missing fields.");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expires: Date.now() + json.expires_in * 1000,
    accountId: accountIdFrom(json.access_token),
  };
}

export async function startCodexDevice() {
  const res = await fetch(DEVICE_USER_CODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Codex device start ${res.status}`);
  }
  const json = (await res.json()) as {
    device_auth_id?: string;
    user_code?: string;
    interval?: number | string;
  };
  const interval =
    typeof json.interval === "string" ? Number(json.interval) : json.interval;
  if (!json.device_auth_id || !json.user_code || !interval) {
    throw new Error("Invalid Codex device response.");
  }
  return {
    deviceAuthId: json.device_auth_id,
    userCode: json.user_code,
    intervalSeconds: interval,
    verificationUri: DEVICE_VERIFICATION_URI,
  };
}

export async function pollCodexDevice(opts: {
  deviceAuthId: string;
  userCode: string;
}): Promise<{ pending: true } | { tokens: CodexTokens }> {
  const res = await fetch(DEVICE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_auth_id: opts.deviceAuthId,
      user_code: opts.userCode,
    }),
    cache: "no-store",
  });
  if (res.status === 403 || res.status === 404) return { pending: true };
  const body = await res.text();
  if (!res.ok) {
    try {
      const json = JSON.parse(body) as { error?: string | { code?: string } };
      const code = typeof json.error === "object" ? json.error?.code : json.error;
      if (code === "deviceauth_authorization_pending" || code === "slow_down") {
        return { pending: true };
      }
    } catch {
      /* fall through */
    }
    throw new Error(`Codex poll ${res.status}: ${body.slice(0, 180)}`);
  }
  const json = JSON.parse(body) as {
    authorization_code?: string;
    code_verifier?: string;
  };
  if (!json.authorization_code || !json.code_verifier) {
    throw new Error("Codex poll missing code.");
  }
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code: json.authorization_code,
      code_verifier: json.code_verifier,
      redirect_uri: DEVICE_REDIRECT_URI,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) {
    throw new Error(`Codex exchange ${tokenRes.status}`);
  }
  return { tokens: asTokens((await tokenRes.json()) as TokenResponse) };
}

export async function refreshCodex(refreshToken: string): Promise<CodexTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Codex refresh ${res.status}`);
  return asTokens((await res.json()) as TokenResponse);
}

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced?.[1] ?? trimmed) as unknown;
}

async function collectSseText(res: Response) {
  const raw = await res.text();
  let text = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const event = JSON.parse(data) as {
        type?: string;
        delta?: string;
        text?: string;
      };
      if (event.delta) text += event.delta;
      else if (event.type?.includes("output_text") && event.text) {
        text += event.text;
      }
    } catch {
      /* ignore malformed sse */
    }
  }
  return text;
}

export async function completeJsonWithCodex(
  prompt: string,
  auth: { accessToken: string; accountId: string },
): Promise<unknown | null> {
  const system =
    "You write brief, opinionated orientation for working AI people. Not a reviewer summary. Return JSON only. No markdown.";
  const body = {
    model: process.env.CODEX_MODEL || "gpt-5.4",
    store: false,
    stream: true,
    instructions: system,
    input: [{ role: "user", content: prompt }],
  };
  const res = await fetch(CODEX_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "chatgpt-account-id": auth.accountId,
      "Content-Type": "application/json",
      originator: "around",
      "OpenAI-Beta": "responses=experimental",
      accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Codex ${res.status}: ${err.slice(0, 200)}`);
  }
  const text = await collectSseText(res);
  if (!text) return null;
  try {
    return extractJson(text);
  } catch {
    return null;
  }
}
