import type { Neighbor } from "./types";

export type ExtractedRef = {
  title: string;
  authors: string;
  year?: number;
  arxivId?: string;
};

const mem = new Map<string, ExtractedRef[]>();

function text(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBib(html: string): ExtractedRef[] {
  const chunks = html.split(/class="ltx_bibitem"/).slice(1);
  const refs: ExtractedRef[] = [];
  for (const chunk of chunks) {
    const blocks = [...chunk.matchAll(/class="ltx_bibblock"[^>]*>([\s\S]*?)<\/span>/g)].map(
      (m) => text(m[1]),
    );
    const blob = text(chunk.slice(0, 800));
    const title = (blocks[1] || blocks[0] || "").replace(/\.$/, "");
    if (!title || title.length < 8) continue;
    const authors = blocks[0] && blocks[1] ? blocks[0].replace(/\.$/, "") : "";
    const arxivId =
      blob.match(/arXiv:(\d{4}\.\d{4,5})/i)?.[1] ||
      blob.match(/abs\/(\d{4}\.\d{4,5})/i)?.[1];
    const years = [...blob.matchAll(/\b((?:19|20)\d{2})\b/g)].map((m) => Number(m[1]));
    const year = years.at(-1);
    refs.push({
      title,
      authors,
      year: year && year > 1900 && year < 2100 ? year : undefined,
      arxivId,
    });
  }
  return refs;
}

async function fetchHtml(id: string) {
  const urls = [
    `https://arxiv.org/html/${id}`,
    `https://ar5iv.labs.arxiv.org/html/${id}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "around" },
        signal: AbortSignal.timeout(4000),
        next: { revalidate: 86400 },
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.includes("ltx_bibitem")) return html;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function extractRefs(id: string): Promise<ExtractedRef[]> {
  const hit = mem.get(id);
  if (hit) return hit;
  const html = await fetchHtml(id);
  const refs = html ? parseBib(html) : [];
  mem.set(id, refs);
  return refs;
}

export function classifyRefs(
  refs: ExtractedRef[],
  paperYear?: number,
): { builtOn: Neighbor[]; similar: Neighbor[]; then: Neighbor[] } {
  const toNeighbor = (ref: ExtractedRef, why: string): Neighbor => ({
    id: ref.arxivId || ref.title,
    title: ref.title,
    year: ref.year,
    authors: ref.authors,
    why,
    arxivId: ref.arxivId,
    url: ref.arxivId ? `https://arxiv.org/abs/${ref.arxivId}` : undefined,
  });

  if (!refs.length) {
    return { builtOn: [], similar: [], then: [] };
  }

  const dated = refs.filter((r) => r.year);
  const undated = refs.filter((r) => !r.year);
  dated.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

  const n = dated.length;
  const a = Math.max(1, Math.ceil(n / 3));
  const b = Math.max(a, Math.ceil((2 * n) / 3));
  const older = dated.slice(0, a);
  const mid = dated.slice(a, b);
  const newer = dated.slice(b);

  return {
    builtOn: older.map((r) => toNeighbor(r, "Earlier work this paper cites.")),
    similar: [
      ...mid.map((r) => toNeighbor(r, "Cited alongside, same era.")),
      ...undated.map((r) => toNeighbor(r, "Cited in the paper.")),
    ].slice(0, 12),
    then: newer.map((r) =>
      toNeighbor(
        r,
        paperYear && r.year && r.year >= paperYear
          ? "Closest in time."
          : "Later among the works it cites.",
      ),
    ),
  };
}
