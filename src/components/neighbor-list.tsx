import type { Neighbor } from "@/lib/types";
import Link from "next/link";

function internalHref(id: string) {
  return /^\d{4}\.\d{4,5}$/.test(id) ? `/p/${id}` : null;
}

export function NeighborList({
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
                  ) : (
                    title
                  )}
                </p>
                {paper.arxivId ? (
                  <p className="mt-1 text-base sm:text-sm">
                    <a
                      href={`https://arxiv.org/abs/${paper.arxivId}`}
                      className="text-teal-800 hover:text-teal-950"
                    >
                      Original
                    </a>
                  </p>
                ) : null}
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
