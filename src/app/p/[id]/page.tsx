import { Neighborhood } from "@/components/neighborhood";
import { RewriteButton } from "@/components/rewrite-button";
import { SiteHeader } from "@/components/site-header";
import {
  bulletsFromAbstract,
  claimFromAbstract,
  getArxiv,
} from "@/lib/arxiv";
import { parseQuery } from "@/lib/parse";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

function authors(names: string[]) {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} et al.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const paper = await getArxiv(id);
    return {
      title: `${paper.title} · Around`,
      description: claimFromAbstract(paper.summary),
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
  if (!parseQuery(id).arxivId && !/^\d{4}\.\d{4,5}$/.test(id)) notFound();
  let paper;
  try {
    paper = await getArxiv(id);
  } catch {
    notFound();
  }

  const claim = claimFromAbstract(paper.summary);
  const how = bulletsFromAbstract(paper.summary);
  const tweet = new URL("https://x.com/intent/tweet");
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  tweet.searchParams.set(
    "text",
    `${paper.title}${base ? `\n${base}/p/${paper.id}` : ""}`,
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <article>
          <section className="pt-10 pb-8 sm:pt-14">
            <div className="mx-auto max-w-5xl px-6">
              <p className="font-mono text-base tracking-wide text-neutral-500 uppercase sm:text-sm">
                {paper.year ? `arXiv · ${paper.year}` : "arXiv"}
              </p>
              <h1 className="mt-3 max-w-[35ch] text-4xl font-semibold tracking-tight text-balance">
                {paper.title}
              </h1>
              <p className="mt-4 max-w-[56ch] text-base text-pretty text-neutral-600">
                {authors(paper.authors)}
              </p>
              <ul
                role="list"
                className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-base sm:text-sm"
              >
                <li>
                  <a
                    href={paper.absUrl}
                    className="text-teal-800 hover:text-teal-950"
                  >
                    arXiv
                  </a>
                </li>
                <li>
                  <a
                    href={paper.pdfUrl}
                    className="text-teal-800 hover:text-teal-950"
                  >
                    PDF
                  </a>
                </li>
                <li>
                  <a
                    href={tweet.toString()}
                    className="text-teal-800 hover:text-teal-950"
                  >
                    Post on X
                  </a>
                </li>
              </ul>
              <RewriteButton id={paper.id} />
            </div>
          </section>

          <section className="pb-10">
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="text-base font-medium tracking-tight text-neutral-950">
                Understand
              </h2>
              <p className="mt-4 max-w-[56ch] text-lg text-pretty">{claim}</p>
              {how.length > 1 ? (
                <ul className="mt-6 max-w-[56ch] list-disc space-y-2 pl-5 text-base text-pretty text-neutral-700 sm:text-sm">
                  {how.slice(1).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>

          <section className="pb-20">
            <div className="mx-auto max-w-5xl px-6">
              <Neighborhood id={paper.id} />
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
