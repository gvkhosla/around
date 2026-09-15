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

function first(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decode(match[1]) : "";
}

function all(xml: string, tag: string) {
  return [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))].map(
    (m) => decode(m[1]),
  );
}

export async function getArxiv(id: string): Promise<ArxivPaper> {
  const arxivId = stripArxivVersion(id);
  const cached = mem.get(arxivId);
  if (cached) return cached;

  const res = await fetch(
    `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`,
    {
      headers: { "User-Agent": "around (paper neighborhood)" },
      next: { revalidate: 86400 },
    },
  );
  if (!res.ok) throw new Error("Paper not found");
  const xml = await res.text();
  const entry = xml.split("<entry")[1];
  if (!entry || xml.includes("<opensearch:totalResults>0</opensearch:totalResults>")) {
    throw new Error("Paper not found");
  }
  const published = first(entry, "published");
  const year = published ? Number(published.slice(0, 4)) : undefined;
  const doi =
    first(entry, "arxiv:doi") ||
    entry.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i)?.[0];
  const paper: ArxivPaper = {
    id: arxivId,
    title: first(entry, "title"),
    authors: all(entry, "name").filter(Boolean),
    summary: first(entry, "summary"),
    year: Number.isFinite(year) ? year : undefined,
    doi: doi || undefined,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
    absUrl: `https://arxiv.org/abs/${arxivId}`,
  };
  if (!paper.title) throw new Error("Paper not found");
  mem.set(arxivId, paper);
  return paper;
}

export function claimFromAbstract(summary: string) {
  const text = summary.replace(/\s+/g, " ").trim();
  const sentence = text.split(/(?<=\.)\s/)[0] || text;
  return sentence;
}

export function bulletsFromAbstract(summary: string) {
  return summary
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=\.)\s/)
    .filter(Boolean)
    .slice(0, 4);
}
