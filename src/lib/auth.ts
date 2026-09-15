export type LlmAuth =
  | {
      kind: "byok";
      apiKey: string;
      model?: string;
      baseUrl?: string;
    }
  | {
      kind: "codex";
      accessToken: string;
      accountId: string;
    };

export function authFromRequest(request: Request): LlmAuth | undefined {
  const apiKey = request.headers.get("x-llm-key")?.trim();
  if (apiKey) {
    return {
      kind: "byok",
      apiKey,
      model: request.headers.get("x-llm-model")?.trim() || undefined,
      baseUrl: request.headers.get("x-llm-base")?.trim() || undefined,
    };
  }
  const accessToken = request.headers.get("x-codex-access")?.trim();
  const accountId = request.headers.get("x-codex-account")?.trim();
  if (accessToken && accountId) {
    return { kind: "codex", accessToken, accountId };
  }
  return undefined;
}
