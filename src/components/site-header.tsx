"use client";

import Link from "next/link";

export function SiteHeader() {
  return (
    <header>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          aria-label="Homepage"
          className="text-base font-medium text-neutral-950"
        >
          Around
        </Link>
        <p className="text-base text-neutral-500 sm:text-sm">
          Paper neighborhood
        </p>
      </div>
    </header>
  );
}
