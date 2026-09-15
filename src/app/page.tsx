import { PaperForm } from "@/components/paper-form";
import { SiteHeader } from "@/components/site-header";
import { getLatestPapers } from "@/lib/latest";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export default async function Home() {
  const latest = await getLatestPapers();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="pt-16 pb-10 sm:pt-24">
          <div className="mx-auto max-w-5xl px-6">
            <div>
              <h1 className="max-w-[20ch] text-5xl font-semibold tracking-tight text-balance">
                Around this paper.
              </h1>
              <p className="mt-5 max-w-[48ch] text-lg text-pretty text-neutral-600">
                See what a paper sits on, what’s next to it, and what came after.
              </p>
            </div>
            <div className="mt-10 max-w-xl">
              <PaperForm />
            </div>
          </div>
        </section>
        <section className="pb-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-base font-medium tracking-tight">Latest</h2>
            {latest.length === 0 ? (
              <p className="mt-4 text-base text-pretty text-neutral-600 sm:text-sm">
                Nothing loaded yet. Paste a paper above.
              </p>
            ) : (
              <ul role="list" className="mt-6 divide-y divide-neutral-950/10">
                {latest.map((paper) => (
                  <li key={paper.id} className="py-4 first:pt-0">
                    <Link
                      href={`/p/${paper.id}`}
                      className="text-base text-pretty text-neutral-950 hover:text-teal-800 sm:text-sm"
                    >
                      {paper.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
