"use client";

import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

export default function PaperError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-6 pt-16">
        <h1 className="max-w-[20ch] text-4xl font-semibold tracking-tight text-balance">
          Could not load that paper.
        </h1>
        <p className="mt-4 max-w-[48ch] text-base text-pretty text-neutral-600">
          {error.message || "Semantic Scholar or OpenAlex did not respond."}
        </p>
        <div className="mt-6 flex gap-4 text-base sm:text-sm">
          <button
            type="button"
            onClick={() => reset()}
            className="text-teal-800 hover:text-teal-950"
          >
            Try again
          </button>
          <Link href="/" className="text-teal-800 hover:text-teal-950">
            Back to Around
          </Link>
        </div>
      </main>
    </div>
  );
}
