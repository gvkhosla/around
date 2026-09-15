"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authHeaders, useModelStatus } from "@/lib/client-auth";

export function RewriteButton({ id }: { id: string }) {
  const router = useRouter();
  const status = useModelStatus();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "Heuristic") return null;

  async function rewrite() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeaders()),
        },
        body: JSON.stringify({ q: id, refresh: true }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Rewrite failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rewrite failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={pending}
        onClick={() => void rewrite()}
        className="rounded-lg px-3 py-2 text-base text-teal-800 ring-1 ring-neutral-950/10 hover:text-teal-950 disabled:opacity-60 sm:text-sm"
      >
        {pending ? "Rewriting" : "Rewrite with my model"}
      </button>
      {error ? (
        <p className="mt-2 text-base text-pretty text-red-800 sm:text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
