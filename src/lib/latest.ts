export type LatestPaper = {
  id: string;
  title: string;
};

const CATS = ["cs.LG", "cs.CL", "cs.AI", "cs.CV"];
let cached: { at: number; papers: LatestPaper[] } | null = null;
const TTL = 10 * 60 * 1000;

function decode(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseAtom(xml: string): LatestPaper[] {
  const papers: LatestPaper[] = [];
  for (const chunk of xml.split("<entry").slice(1)) {
    const id = chunk.match(/(\d{4}\.\d{4,5})/)?.[1];
    const titleMatch = chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decode(titleMatch[1]) : "";
    if (id && title) papers.push({ id, title });
  }
  return papers;
}

async function fromArxiv(): Promise<LatestPaper[]> {
  const feeds = await Promise.all(
    CATS.map(async (cat) => {
      const res = await fetch(`https://rss.arxiv.org/atom/${cat}`, {
        headers: { "User-Agent": "around" },
        next: { revalidate: 600 },
      });
      if (!res.ok) return [];
      return parseAtom(await res.text()).slice(0, 12);
    }),
  );
  return feeds.flat();
}

async function fromAlphaXiv(): Promise<string[]> {
  try {
    const res = await fetch("https://www.alphaxiv.org/", {
      headers: { "User-Agent": "around" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const ids = [...html.matchAll(/\/abs\/(2\d{3}\.\d{4,5})/g)].map((m) => m[1]);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length === 16) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function titlesFor(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!ids.length) return map;
  try {
    const res = await fetch(
      `https://export.arxiv.org/api/query?id_list=${ids.join(",")}&max_results=${ids.length}`,
      { headers: { "User-Agent": "around" }, next: { revalidate: 600 } },
    );
    if (!res.ok) return map;
    for (const paper of parseAtom(await res.text())) {
      map.set(paper.id, paper.title);
    }
  } catch {
    /* ignore */
  }
  return map;
}

export async function getLatestPapers(): Promise<LatestPaper[]> {
  if (cached && Date.now() - cached.at < TTL) return cached.papers;
  const [arxiv, alphaIds] = await Promise.all([fromArxiv(), fromAlphaXiv()]);
  const byId = new Map<string, LatestPaper>();
  for (const paper of arxiv) byId.set(paper.id, paper);
  const missing = alphaIds.filter((id) => !byId.has(id));
  const extra = await titlesFor(missing);
  const ordered: LatestPaper[] = [];
  const seen = new Set<string>();
  for (const id of alphaIds) {
    const title = byId.get(id)?.title || extra.get(id);
    if (!title || seen.has(id)) continue;
    seen.add(id);
    ordered.push({ id, title });
  }
  for (const paper of arxiv) {
    if (seen.has(paper.id)) continue;
    seen.add(paper.id);
    ordered.push(paper);
  }
  const papers = ordered.slice(0, 18);
  cached = { at: Date.now(), papers };
  return papers;
}
