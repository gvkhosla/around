import { stripArxivVersion } from "./parse";

export type ArxivPaper = {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  year?: number;
  doi?: string;
  pdfUrl: string;
  absUrl: string;
};

const mem = new Map<string, ArxivPaper>();

function decode(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function metas(html: string, name: string) {
  return [
    ...html.matchAll(
      new RegExp(`name="${name}" content="([^"]*)"`, "gi"),
    ),
  ].map((m) => decode(m[1]));
}

function parseAbs(id: string, html: string): ArxivPaper | null {
  const title =
    metas(html, "citation_title")[0] ||
    decode(
      html.match(/<title>\[.*?\]\s*([\s\S]*?)<\/title>/i)?.[1] || "",
    );
  if (!title) return null;
  const authors = metas(html, "citation_author");
  const summary = metas(html, "citation_abstract")[0] || "";
  const date = metas(html, "citation_date")[0];
  const year = date ? Number(date.slice(0, 4)) : undefined;
  return {
    id,
    title,
    authors,
    summary,
    year: Number.isFinite(year) ? year : undefined,
    doi: metas(html, "citation_doi")[0],
    pdfUrl: `https://arxiv.org/pdf/${id}`,
    absUrl: `https://arxiv.org/abs/${id}`,
  };
}

export async function getArxiv(id: string): Promise<ArxivPaper> {
  const arxivId = stripArxivVersion(id);
  const cached = mem.get(arxivId);
  if (cached) return cached;

  const res = await fetch(`https://arxiv.org/abs/${arxivId}`, {
    headers: { "User-Agent": "around" },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 86400 },
  });
  if (res.status === 404) throw new Error("Paper not found");
  if (!res.ok) throw new Error("Could not load that paper.");
  const paper = parseAbs(arxivId, await res.text());
  if (!paper) throw new Error("Paper not found");
  mem.set(arxivId, paper);
  return paper;
}

export function claimFromAbstract(summary: string) {
  const text = summary.replace(/\s+/g, " ").trim();
  return text.split(/(?<=\.)\s/)[0] || text;
}

export function bulletsFromAbstract(summary: string) {
  return summary
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=\.)\s/)
    .filter(Boolean)
    .slice(0, 4);
}
