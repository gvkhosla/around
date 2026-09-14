import { PaperForm } from "@/components/paper-form";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

const examples = [
  { id: "1706.03762", title: "Attention Is All You Need" },
  { id: "2106.09685", title: "LoRA" },
  { id: "2501.12948", title: "DeepSeek-R1" },
];

export default function Home() {
  const handle = process.env.NEXT_PUBLIC_X_HANDLE;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="pt-16 pb-16 sm:pt-24">
          <div className="mx-auto max-w-5xl px-6">
            <div>
              <h1 className="max-w-[30ch] text-5xl font-semibold tracking-tight text-balance">
                Around this paper.
              </h1>
              <p className="mt-5 max-w-[48ch] text-lg text-pretty text-neutral-600">
                Paste an arXiv, DOI, AlphaXiv, or tweet link. Get the claim, the
                lineage, and what to read next.
              </p>
            </div>
            <div className="mt-10 max-w-xl">
              <PaperForm />
            </div>
            <ul role="list" className="mt-8 flex flex-col gap-2">
              {examples.map((paper) => (
                <li key={paper.id} className="text-base sm:text-sm">
                  <Link
                    href={`/p/${paper.id}`}
                    className="text-teal-800 hover:text-teal-950"
                  >
                    {paper.title}
                  </Link>
                  <span className="text-neutral-500"> {paper.id}</span>
                </li>
              ))}
            </ul>
            {handle ? (
              <p className="mt-10 max-w-[48ch] text-base text-pretty text-neutral-600 sm:text-sm">
                Or tag @{handle} in a reply to a paper. The bot sends back this
                page.
              </p>
            ) : (
              <p className="mt-10 max-w-[48ch] text-base text-pretty text-neutral-600 sm:text-sm">
                Pages are shareable. An X bot can reply with the link once you
                add API keys.
              </p>
            )}
          </div>
        </section>
      </main>
      <footer>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-base text-neutral-500 sm:text-sm">
            Neighborhood from Semantic Scholar and OpenAlex. Not affiliated.
          </p>
        </div>
      </footer>
    </div>
  );
}
