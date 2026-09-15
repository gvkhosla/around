import { useSyncExternalStore } from "react";

export const BYOK_KEY = "around.byok";
export const CODEX_KEY = "around.codex";
export const ALPHAXIV_KEY = "around.alphaxiv";

export type ByokStore = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
};

export type CodexStore = {
  accessToken: string;
  refreshToken: string;
  expires: number;
  accountId: string;
};

function emit() {
  window.dispatchEvent(new Event("around-auth"));
}

export function subscribeAuth(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("around-auth", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("around-auth", onStoreChange);
  };
}

export function readByok(): ByokStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BYOK_KEY);
    return raw ? (JSON.parse(raw) as ByokStore) : null;
  } catch {
    return null;
  }
}

export function writeByok(value: ByokStore | null) {
  if (value) localStorage.setItem(BYOK_KEY, JSON.stringify(value));
  else localStorage.removeItem(BYOK_KEY);
  emit();
}

export function readCodex(): CodexStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CODEX_KEY);
    return raw ? (JSON.parse(raw) as CodexStore) : null;
  } catch {
    return null;
  }
}

export function writeCodex(value: CodexStore | null) {
  if (value) localStorage.setItem(CODEX_KEY, JSON.stringify(value));
  else localStorage.removeItem(CODEX_KEY);
  emit();
}

export function readAlphaXivKey() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ALPHAXIV_KEY) || "";
}

export function writeAlphaXivKey(value: string) {
  if (value) localStorage.setItem(ALPHAXIV_KEY, value);
  else localStorage.removeItem(ALPHAXIV_KEY);
  emit();
}

export function alphaXivStatus() {
  return readAlphaXivKey() ? "Connected" : "Connect";
}

export function useAlphaXivStatus() {
  return useSyncExternalStore(subscribeAuth, alphaXivStatus, () => "Connect");
}

export function modelStatus() {
  if (readByok()?.apiKey) return "Your key";
  if (readCodex()) return "ChatGPT";
  return "Connect";
}

export function useModelStatus() {
  return useSyncExternalStore(subscribeAuth, modelStatus, () => "Connect");
}

export function useByok() {
  return useSyncExternalStore(subscribeAuth, readByok, () => null);
}

export function useCodex() {
  return useSyncExternalStore(subscribeAuth, readCodex, () => null);
}

export async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const byok = readByok();
  if (byok?.apiKey) {
    headers["x-llm-key"] = byok.apiKey;
    if (byok.model) headers["x-llm-model"] = byok.model;
    if (byok.baseUrl) headers["x-llm-base"] = byok.baseUrl;
    return headers;
  }
  let codex = readCodex();
  if (!codex) return headers;
  if (codex.expires < Date.now() + 60_000 && codex.refreshToken) {
    const res = await fetch("/api/codex/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: codex.refreshToken }),
    });
    if (res.ok) {
      const next = (await res.json()) as CodexStore;
      writeCodex(next);
      codex = next;
    }
  }
  headers["x-codex-access"] = codex.accessToken;
  headers["x-codex-account"] = codex.accountId;
  return headers;
}
