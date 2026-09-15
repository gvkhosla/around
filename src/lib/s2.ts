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
  "year",
  "citationCount",
  "authors",
  "externalIds",
  "url",
].join(",");

const GRAPH_FIELDS = [
  PAPER_FIELDS,
  `references.title`,
  `references.year`,
  `references.authors`,
  `references.externalIds`,
  `references.citationCount`,
  `references.paperId`,
  `citations.title`,
  `citations.year`,
  `citations.authors`,
  `citations.externalIds`,
  `citations.citationCount`,
  `citations.paperId`,
].join(",");

let chain: Promise<unknown> = Promise.resolve();
let lastAt = 0;

function gap() {
  return process.env.S2_API_KEY || process.env.SEMANTIC_SCHOLAR_API_KEY
    ? 80
    : 200;
}

async function s2Fetch<T>(path: string): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastAt === 0 ? 0 : gap() - (Date.now() - lastAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
    const url = path.startsWith("http") ? path : `${BASE}${path}`;
    const headers: Record<string, string> = {
      "User-Agent": "around (paper neighborhood)",
      Accept: "application/json",
    };
    const key =
      process.env.S2_API_KEY || process.env.SEMANTIC_SCHOLAR_API_KEY;
    if (key) headers["x-api-key"] = key;

    const res = await fetch(url, {
      headers,
      cache: "force-cache",
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 429) {
      throw new Error("Semantic Scholar rate limited");
    }
    if (res.status === 404) throw new Error("Paper not found");
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Semantic Scholar ${res.status}: ${body.slice(0, 180)}`);
    }
    return (await res.json()) as T;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<T>;
}

function asPaper(value: unknown): S2Paper | null {
  if (!value || typeof value !== "object") return null;
  const paper = value as S2Paper & { citedPaper?: S2Paper; citingPaper?: S2Paper };
  const inner = paper.citedPaper || paper.citingPaper || paper;
  if (!inner.paperId && !inner.title) return null;
  return inner;
}

export async function s2Paper(lookup: string): Promise<S2Paper> {
  return s2Fetch<S2Paper>(
    `/graph/v1/paper/${encodeURIComponent(lookup)}?fields=${PAPER_FIELDS}`,
  );
}

export async function s2Neighborhood(lookup: string) {
  const data = await s2Fetch<
    S2Paper & { references?: unknown[]; citations?: unknown[] }
  >(
    `/graph/v1/paper/${encodeURIComponent(lookup)}?fields=${GRAPH_FIELDS}`,
  );
  return {
    paper: data,
    references: (data.references ?? [])
      .map(asPaper)
      .filter((p): p is S2Paper => Boolean(p?.title)),
    citations: (data.citations ?? [])
      .map(asPaper)
      .filter((p): p is S2Paper => Boolean(p?.title)),
  };
}

export async function s2References(lookup: string, limit = 12) {
  const data = await s2Fetch<{ data?: unknown[] }>(
    `/graph/v1/paper/${encodeURIComponent(lookup)}/references?fields=${LIST_FIELDS}&limit=${limit}`,
  );
  return (data.data ?? [])
    .map(asPaper)
    .filter((p): p is S2Paper => Boolean(p?.title));
}

export async function s2Citations(lookup: string, limit = 12) {
  const data = await s2Fetch<{ data?: unknown[] }>(
    `/graph/v1/paper/${encodeURIComponent(lookup)}/citations?fields=${LIST_FIELDS}&limit=${limit}`,
  );
  return (data.data ?? []).map((row) => {
    const paper = asPaper(row);
    const influential =
      Boolean(row && typeof row === "object" && "isInfluential" in row
        ? (row as { isInfluential?: boolean }).isInfluential
        : false);
    return { paper, influential };
  }).filter(
    (row): row is { paper: S2Paper; influential: boolean } =>
      Boolean(row.paper?.title),
  );
}
