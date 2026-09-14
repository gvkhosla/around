import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

export default function NotFoundPaper() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-6 pt-16">
        <h1 className="max-w-[20ch] text-4xl font-semibold tracking-tight text-balance">
          No paper there.
        </h1>
        <p className="mt-4 max-w-[48ch] text-base text-pretty text-neutral-600">
          Semantic Scholar did not recognize that id. Try an arXiv abs link.
        </p>
        <p className="mt-6 text-base sm:text-sm">
          <Link href="/" className="text-teal-800 hover:text-teal-950">
            Back to Around
          </Link>
        </p>
      </main>
    </div>
  );
}
