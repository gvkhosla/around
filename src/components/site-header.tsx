"use client";

import Link from "next/link";
import { useModelStatus } from "@/lib/client-auth";

export function SiteHeader() {
  const status = useModelStatus();

  return (
    <header>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <Link
          href="/"
          aria-label="Homepage"
          className="text-base font-medium text-neutral-950"
        >
          Around
        </Link>
        <Link
          href="/settings"
          className="min-w-0 text-base text-neutral-500 hover:text-teal-800 sm:text-sm"
        >
          {status}
        </Link>
      </div>
    </header>
  );
}
