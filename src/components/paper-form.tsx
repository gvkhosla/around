"use client";

import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { useActionState } from "react";
import { aroundPaper, type AroundState } from "@/lib/actions";

const initial: AroundState = {};

export function PaperForm() {
  const [state, action, pending] = useActionState(aroundPaper, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="q"
          name="q"
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
          aria-label="Paper link"
          placeholder="arxiv.org/abs/1706.03762"
          className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2.5 text-base text-neutral-950 outline-none ring-1 ring-neutral-950/10 placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-teal-800 sm:py-2 sm:text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-teal-800 py-2.5 pr-2.5 pl-3 text-base font-medium text-white ring-1 ring-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-60 sm:py-2 sm:pr-2 sm:pl-3 sm:text-sm"
        >
          {pending ? "Looking" : "Around this"}
          <ArrowRightIcon className="size-4 shrink-0 fill-white" />
          <span
            className="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2"
            aria-hidden="true"
          />
        </button>
      </div>
      {state.error ? (
        <p className="text-base text-pretty text-red-800 sm:text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
