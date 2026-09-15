"use client";

import { NeighborList } from "@/components/neighbor-list";
import { StatusLine } from "@/components/status-line";
import { readAlphaXivKey } from "@/lib/client-auth";
import type { AlphaXivNeighborhood } from "@/lib/alphaxiv";
import Link from "next/link";
import { useEffect, useState } from "react";

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: AlphaXivNeighborhood }
  | { kind: "needs-key" }
  | { kind: "error"; message: string };

export function AlphaXivDiscovery({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const key = readAlphaXivKey();
    fetch(`/api/alphaxiv?id=${encodeURIComponent(id)}`, {
      headers: key ? { "x-alphaxiv-key": key } : undefined,
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as
          | AlphaXivNeighborhood
          | { error?: string; needsKey?: boolean };
        if (response.status === 401 && "needsKey" in payload) {
          setState({ kind: "needs-key" });
          return;
        }
        if (!response.ok || !("similar" in payload)) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "alphaXiv did not finish the search.",
          );
        }
        setState({ kind: "ready", data: payload });
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "alphaXiv did not finish the search.",
        });
      });
    return () => controller.abort();
  }, [id, attempt]);

  return (
    <section className="border-t border-neutral-950/10 pt-8" aria-busy={state.kind === "loading"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="text-base font-medium tracking-tight text-neutral-950">
            Beyond the bibliography
          </h2>
          <p className="mt-2 max-w-[60ch] text-base text-pretty text-neutral-600 sm:text-sm">
            alphaXiv searches the wider corpus for related work and actual
            follow-ups.
          </p>
        </div>
        <a
          href={`https://www.alphaxiv.org/abs/${id}`}
          target="_blank"
          rel="noreferrer"
          className="text-base text-teal-800 hover:text-teal-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 sm:text-sm"
        >
          Open on alphaXiv
        </a>
      </div>

      {state.kind === "loading" ? (
        <div className="mt-6" role="status" aria-live="polite">
          <StatusLine>alphaXiv is searching for related work…</StatusLine>
        </div>
      ) : null}

      {state.kind === "needs-key" ? (
        <p className="mt-6 max-w-[60ch] text-base text-pretty text-neutral-600 sm:text-sm">
          <Link
            href="/settings"
            className="text-teal-800 hover:text-teal-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            Connect alphaXiv
          </Link>{" "}
          to turn on deeper discovery. Your key is stored in this browser and
          sent to Around only for the search.
        </p>
      ) : null}

      {state.kind === "error" ? (
        <div className="mt-6" role="status">
          <p className="max-w-[60ch] text-base text-pretty text-neutral-600 sm:text-sm">
            {state.message}
          </p>
          <button
            type="button"
            onClick={() => {
              setState({ kind: "loading" });
              setAttempt((value) => value + 1);
            }}
            className="mt-3 text-base text-teal-800 hover:text-teal-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 sm:text-sm"
          >
            Try alphaXiv again
          </button>
        </div>
      ) : null}

      {state.kind === "ready" ? (
        state.data.similar.length || state.data.followUps.length ? (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <NeighborList heading="Related" items={state.data.similar} />
            <NeighborList heading="Follow-ups" items={state.data.followUps} />
          </div>
        ) : (
          <p className="mt-6 text-base text-pretty text-neutral-600 sm:text-sm">
            alphaXiv did not find a confident match yet.
          </p>
        )
      ) : null}
    </section>
  );
}
