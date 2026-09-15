"use client";

import { useState } from "react";
import {
  useByok,
  useCodex,
  writeByok,
  writeCodex,
  type CodexStore,
} from "@/lib/client-auth";

export function SettingsForm() {
  const storedByok = useByok();
  const codex = useCodex();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [device, setDevice] = useState<{
    userCode: string;
    verificationUri: string;
    deviceAuthId: string;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function saveKey(event: React.FormEvent) {
    event.preventDefault();
    if (!apiKey.trim()) {
      writeByok(null);
      setMessage("API key cleared.");
      return;
    }
    writeByok({
      apiKey: apiKey.trim(),
      model: model.trim() || undefined,
      baseUrl: baseUrl.trim() || undefined,
    });
    writeCodex(null);
    setApiKey("");
    setMessage("Key saved in this browser.");
  }

  async function connectChatgpt() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/codex/start", { method: "POST" });
      const data = (await res.json()) as {
        deviceAuthId?: string;
        userCode?: string;
        verificationUri?: string;
        intervalSeconds?: number;
        error?: string;
      };
      if (!res.ok || !data.deviceAuthId || !data.userCode || !data.verificationUri) {
        throw new Error(data.error || "Could not start ChatGPT login.");
      }
      setDevice({
        deviceAuthId: data.deviceAuthId,
        userCode: data.userCode,
        verificationUri: data.verificationUri,
      });
      const interval = Math.max(2, data.intervalSeconds || 3) * 1000;
      const started = Date.now();
      while (Date.now() - started < 15 * 60 * 1000) {
        await new Promise((r) => setTimeout(r, interval));
        const poll = await fetch("/api/codex/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceAuthId: data.deviceAuthId,
            userCode: data.userCode,
          }),
        });
        const result = (await poll.json()) as {
          pending?: boolean;
          tokens?: CodexStore;
          error?: string;
        };
        if (result.tokens) {
          writeCodex(result.tokens);
          writeByok(null);
          setDevice(null);
          setMessage("ChatGPT connected.");
          return;
        }
        if (!poll.ok && !result.pending) {
          throw new Error(result.error || "ChatGPT login failed.");
        }
      }
      throw new Error("Login timed out.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
      setDevice(null);
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-white px-3 py-2.5 text-base text-neutral-950 outline-none ring-1 ring-neutral-950/10 placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-teal-800 sm:py-2 sm:text-sm";

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-base font-medium tracking-tight">ChatGPT Plus or Pro</h2>
        <p className="mt-2 text-base text-pretty text-neutral-600 sm:text-sm">
          Same Codex login Amp and coding agents use. Usage hits your ChatGPT
          quota.
        </p>
        {codex ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-base text-neutral-950 sm:text-sm">Connected.</p>
            <button
              type="button"
              onClick={() => {
                writeCodex(null);
                setMessage("ChatGPT disconnected.");
              }}
              className="self-start rounded-lg px-3 py-2 text-base text-teal-800 ring-1 ring-neutral-950/10 hover:text-teal-950 sm:text-sm"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => void connectChatgpt()}
              className="self-start rounded-lg bg-teal-800 px-3 py-2 text-base font-medium text-white ring-1 ring-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-60 sm:text-sm"
            >
              {pending ? "Waiting" : "Log in with ChatGPT"}
            </button>
            {device ? (
              <p className="text-base text-pretty text-neutral-600 sm:text-sm">
                Open{" "}
                <a
                  href={device.verificationUri}
                  className="text-teal-800 hover:text-teal-950"
                  target="_blank"
                  rel="noreferrer"
                >
                  {device.verificationUri}
                </a>{" "}
                and enter{" "}
                <span className="font-mono font-medium text-neutral-950">
                  {device.userCode}
                </span>
                .
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-medium tracking-tight">Bring your own key</h2>
        <p className="mt-2 text-base text-pretty text-neutral-600 sm:text-sm">
          OpenAI (sk-), OpenRouter (sk-or-), or any OpenAI-compatible base URL.
          {storedByok ? " A key is already saved in this browser." : ""}
        </p>
        <form onSubmit={saveKey} className="mt-4 flex flex-col gap-3">
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            aria-label="API key"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={inputClass}
          />
          <input
            name="model"
            type="text"
            aria-label="Model"
            placeholder="Model (optional)"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputClass}
          />
          <input
            name="baseUrl"
            type="url"
            aria-label="Base URL"
            placeholder="http://localhost:11434/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            className="self-start rounded-lg px-3 py-2 text-base text-teal-800 ring-1 ring-neutral-950/10 hover:text-teal-950 sm:text-sm"
          >
            Save key
          </button>
        </form>
      </section>

      {message ? (
        <p className="text-base text-pretty text-neutral-600 sm:text-sm">{message}</p>
      ) : null}
    </div>
  );
}
