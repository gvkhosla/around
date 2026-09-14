import type { S2Paper } from "./types";

const BASE = "https://api.semanticscholar.org";
const PAPER_FIELDS = [
  "paperId",
  "title",
  "abstract",
  "year",
  "venue",
  "citationCount",
  "authors",
  "tldr",
  "externalIds",
  "url",
  "openAccessPdf",
].join(",");

const LIST_FIELDS = [
  "paperId",
  "title",
  "abstract",
  "year",
  "citationCount",
  "authors",
  "externalIds",
  "url",
].join(",");

let queue: Promise<unknown> = Promise.resolve();

function gap() {
  return process.env.S2_API_KEY || process.env.SEMANTIC_SCHOLAR_API_KEY
    ? 120
    : 1100;
}

async function s2Fetch<T>(path: string): Promise<T> {
  const run = queue.then(async () => {
    await new Promise((r) => setTimeout(r, gap()));
    const url = path.startsWith("http") ? path : `${BASE}${path}`;
    const headers: Record<string, string> = {
      "User-Agent": "around (paper neighborhood)",
      Accept: "application/json",
    };
    const key =
      process.env.S2_API_KEY || process.env.SEMANTIC_SCHOLAR_API_KEY;
    if (key) headers["x-api-key"] = key;

    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      if (res.status === 404) {
        throw new Error("Paper not found");
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Semantic Scholar ${res.status}: ${body.slice(0, 180)}`);
      }
      return (await res.json()) as T;
    }
    throw new Error("Semantic Scholar rate limited");
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<T>;
}

export async function s2Paper(lookup: string): Promise<S2Paper> {
  return s2Fetch<S2Paper>(
    `/graph/v1/paper/${encodeURIComponent(lookup)}?fields=${PAPER_FIELDS}`,
  );
}

export async function s2Search(query: string): Promise<S2Paper | null> {
  const data = await s2Fetch<{ data?: S2Paper[] }>(
    `/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=1&fields=${PAPER_FIELDS}`,
  );
  return data.data?.[0] ?? null;
}

export async function s2References(lookup: string, limit = 40) {
  const data = await s2Fetch<{ data?: { citedPaper?: S2Paper }[] }>(
    `/graph/v1/paper/${encodeURIComponent(lookup)}/references?fields=${LIST_FIELDS}&limit=${limit}`,
  );
  return (data.data ?? [])
    .map((row) => row.citedPaper)
    .filter((p): p is S2Paper => Boolean(p?.paperId && p.title));
}

export async function s2Citations(lookup: string, limit = 40) {
  const data = await s2Fetch<{
    data?: { isInfluential?: boolean; citingPaper?: S2Paper }[];
  }>(
    `/graph/v1/paper/${encodeURIComponent(lookup)}/citations?fields=${LIST_FIELDS},isInfluential&limit=${limit}`,
  );
  return (data.data ?? [])
    .map((row) => ({
      paper: row.citingPaper,
      influential: Boolean(row.isInfluential),
    }))
    .filter(
      (row): row is { paper: S2Paper; influential: boolean } =>
        Boolean(row.paper?.paperId && row.paper.title),
    );
}

export async function s2Recommendations(lookup: string, limit = 15) {
  try {
    const data = await s2Fetch<{ recommendedPapers?: S2Paper[] }>(
      `/recommendations/v1/papers/forpaper/${encodeURIComponent(lookup)}?fields=${LIST_FIELDS}&limit=${limit}`,
    );
    return (data.recommendedPapers ?? []).filter(
      (p): p is S2Paper => Boolean(p?.paperId && p.title),
    );
  } catch {
    return [];
  }
}
