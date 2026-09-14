import { SiteHeader } from "@/components/site-header";
import { getBrief } from "@/lib/brief";
import type { Neighbor } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function internalHref(id: string) {
  if (/^\d{4}\.\d{4,5}$/.test(id) || id.startsWith("s2-")) return `/p/${id}`;
  return null;
}

function authors(names: string[]) {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} et al.`;
}

function NeighborList({
  heading,
  items,
}: {
  heading: string;
  items: Neighbor[];
}) {
  return (
    <section className="min-w-0">
      <h2 className="text-base font-medium tracking-tight text-neutral-950">
        {heading}
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-base text-pretty text-neutral-600 sm:text-sm">
          Nothing clear enough to list yet.
        </p>
      ) : (
        <ul role="list" className="mt-4 flex flex-col gap-3">
          {items.map((paper) => {
            const href = internalHref(paper.id);
            const title = (
              <span className="text-pretty text-neutral-950">{paper.title}</span>
            );
            return (
              <li
                key={paper.id}
                className="rounded-xl p-4 ring-1 ring-neutral-950/10"
              >
                <p className="text-base font-medium sm:text-sm">
                  {href ? (
                    <Link href={href} className="hover:text-teal-800">
                      {title}
                    </Link>
                  ) : paper.url ? (
                    <a
                      href={paper.url}
                      className="hover:text-teal-800"
                      rel="noreferrer"
                    >
                      {title}
                    </a>
                  ) : (
                    title
                  )}
                </p>
                <p className="mt-1 text-base text-neutral-500 sm:text-sm">
                  {[paper.authors, paper.year].filter(Boolean).join(" · ")}
                  {typeof paper.citationCount === "number" ? (
                    <span className="tabular-nums">
                      {` · ${paper.citationCount.toLocaleString()} cites`}
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 text-base text-pretty text-neutral-600 sm:text-sm">
                  {paper.why}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const brief = await getBrief(id);
    return {
      title: `${brief.title} · Around`,
      description: brief.claim,
    };
  } catch {
    return { title: "Around" };
  }
}

export default async function PaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let brief;
  try {
    brief = await getBrief(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not found")) notFound();
    throw error;
  }

  const arxiv = brief.arxivId
    ? `https://arxiv.org/abs/${brief.arxivId}`
    : null;
  const tweet = new URL("https://x.com/intent/tweet");
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  tweet.searchParams.set(
    "text",
    `${brief.title}${base ? `\n${base}/p/${brief.id}` : ""}`,
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <article>
          <section className="pt-10 pb-8 sm:pt-14">
            <div className="mx-auto max-w-5xl px-6">
              <p className="font-mono text-base tracking-wide text-neutral-500 uppercase sm:text-sm">
                {[brief.venue, brief.year].filter(Boolean).join(" · ") ||
                  "Paper"}
              </p>
              <h1 className="mt-3 max-w-[35ch] text-4xl font-semibold tracking-tight text-balance">
                {brief.title}
              </h1>
              <p className="mt-4 max-w-[56ch] text-base text-pretty text-neutral-600">
                {authors(brief.authors)}
                {typeof brief.citationCount === "number" ? (
                  <span className="tabular-nums">
                    {` · ${brief.citationCount.toLocaleString()} citations`}
                  </span>
                ) : null}
              </p>
              <ul
                role="list"
                className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-base sm:text-sm"
              >
                {arxiv ? (
                  <li>
                    <a href={arxiv} className="text-teal-800 hover:text-teal-950">
                      arXiv
                    </a>
                  </li>
                ) : null}
                {brief.pdfUrl ? (
                  <li>
                    <a
                      href={brief.pdfUrl}
                      className="text-teal-800 hover:text-teal-950"
                    >
                      PDF
                    </a>
                  </li>
                ) : null}
                {brief.s2Url ? (
                  <li>
                    <a
                      href={brief.s2Url}
                      className="text-teal-800 hover:text-teal-950"
                    >
                      Semantic Scholar
                    </a>
                  </li>
                ) : null}
                {brief.openAlexUrl ? (
                  <li>
                    <a
                      href={brief.openAlexUrl}
                      className="text-teal-800 hover:text-teal-950"
                    >
                      OpenAlex
                    </a>
                  </li>
                ) : null}
                <li>
                  <a
                    href={tweet.toString()}
                    className="text-teal-800 hover:text-teal-950"
                  >
                    Post on X
                  </a>
                </li>
              </ul>
            </div>
          </section>

          <section className="pb-10">
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="text-base font-medium tracking-tight text-neutral-950">
                Understand
              </h2>
              <p className="mt-4 max-w-[56ch] text-lg text-pretty">
                {brief.claim}
              </p>
              {brief.how.length > 0 ? (
                <ul className="mt-6 max-w-[56ch] list-disc space-y-2 pl-5 text-base text-pretty text-neutral-700 sm:text-sm">
                  {brief.how.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <dl className="mt-8 max-w-[56ch] flex flex-col gap-5">
                <div>
                  <dt className="font-medium text-neutral-950">What is new</dt>
                  <dd className="mt-1 text-base text-pretty text-neutral-600 sm:text-sm">
                    {brief.whatsNew}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-neutral-950">Ignore if</dt>
                  <dd className="mt-1 text-base text-pretty text-neutral-600 sm:text-sm">
                    {brief.ignoreIf}
                  </dd>
                </div>
                {brief.prerequisites.length > 0 ? (
                  <div>
                    <dt className="font-medium text-neutral-950">
                      Prerequisites
                    </dt>
                    <dd className="mt-1 text-base text-pretty text-neutral-600 sm:text-sm">
                      {brief.prerequisites.join(" · ")}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </section>

          <section className="pb-20">
            <div className="mx-auto max-w-5xl px-6">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <NeighborList heading="Built on" items={brief.builtOn} />
                <NeighborList heading="Similar" items={brief.similar} />
                <NeighborList heading="Then" items={brief.then} />
              </div>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
