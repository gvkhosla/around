import { cache } from "react";
import type { LlmAuth } from "./auth";
import { readBrief, writeBrief } from "./cache";
import { completeJson } from "./llm";
import { parseQuery } from "./parse";
import { getArxiv, type ArxivPaper } from "./arxiv";
import { classifyRefs, extractRefs } from "./refs";
import type { Brief, Candidate, Neighbor } from "./types";

function authorLine(paper: ArxivPaper) {
  if (paper.authors.length <= 3) return paper.authors.join(", ");
  return `${paper.authors.slice(0, 3).join(", ")} et al.`;
}

function fallbackUnderstanding(paper: ArxivPaper) {
  const abstract = paper.summary.trim();
  const claim = abstract.split(/(?<=\.)\s/)[0] || paper.title;
  return {
    claim,
    how: abstract
      ? abstract
          .split(/(?<=\.)\s/)
          .filter(Boolean)
          .slice(0, 5)
      : [],
    whatsNew: "See the abstract.",
    ignoreIf: "You already know this paper.",
    prerequisites: [],
  };
}

type LlmOut = {
  claim?: string;
  how?: string[];
  whatsNew?: string;
  ignoreIf?: string;
  prerequisites?: string[];
  builtOn?: { id?: string; why?: string }[];
  similar?: { id?: string; why?: string }[];
  then?: { id?: string; why?: string }[];
};

function pickNeighbors(
  picks: { id?: string; why?: string }[] | undefined,
  pool: Candidate[],
  fallback: Candidate[],
  n = 3,
): Neighbor[] {
  const byId = new Map(pool.map((c) => [c.id, c]));
  const out: Neighbor[] = [];
  const used = new Set<string>();
  for (const pick of picks ?? []) {
    if (!pick.id) continue;
    const c = byId.get(pick.id);
    if (!c || used.has(c.id)) continue;
    used.add(c.id);
    out.push({
      id: c.id,
      title: c.title,
      year: c.year,
      authors: c.authors,
      why: pick.why?.trim() || "Connected work.",
      citationCount: c.citationCount,
      url: c.url,
      arxivId: c.arxivId,
    });
    if (out.length === n) return out;
  }
  for (const c of fallback) {
    if (used.has(c.id)) continue;
    used.add(c.id);
    out.push({
      id: c.id,
      title: c.title,
      year: c.year,
      authors: c.authors,
      why:
        c.pool === "reference"
          ? "Prior work this paper sits on."
          : c.pool === "citation"
            ? "Later among the works it cites."
            : "Nearby method or problem.",
      citationCount: c.citationCount,
      url: c.url,
      arxivId: c.arxivId,
    });
    if (out.length === n) break;
  }
  return out;
}

export async function resolvePaperId(input: string): Promise<string | null> {
  return parseQuery(input).arxivId ?? null;
}

export const getBrief = cache(async (id: string): Promise<Brief> => {
  return loadBrief(id);
});

export async function loadBrief(
  id: string,
  auth?: LlmAuth,
  refresh = false,
): Promise<Brief> {
  const cached = await readBrief(id);
  if (cached && !refresh && (cached.usedLlm || !auth)) return cached;
  const brief = await generateBrief(id, auth);
  await writeBrief(brief);
  return brief;
}

export async function getNeighborhood(id: string, paperYear?: number) {
  const refs = await extractRefs(id);
  return classifyRefs(refs, paperYear);
}

export async function generateBrief(
  id: string,
  auth?: LlmAuth,
): Promise<Brief> {
  const paper = await getArxiv(id);
  const hood = await getNeighborhood(paper.id, paper.year);
  const canonical = paper.id;
  const builtPool: Candidate[] = hood.builtOn.map((n) => ({
    id: n.id,
    paperId: n.id,
    title: n.title,
    year: n.year,
    authors: n.authors,
    arxivId: n.arxivId,
    url: n.url,
    pool: "reference" as const,
  }));
  const similarPool: Candidate[] = hood.similar.map((n) => ({
    id: n.id,
    paperId: n.id,
    title: n.title,
    year: n.year,
    authors: n.authors,
    arxivId: n.arxivId,
    url: n.url,
    pool: "related" as const,
  }));
  const thenPool: Candidate[] = hood.then.map((n) => ({
    id: n.id,
    paperId: n.id,
    title: n.title,
    year: n.year,
    authors: n.authors,
    arxivId: n.arxivId,
    url: n.url,
    pool: "citation" as const,
  }));

  const fallback = fallbackUnderstanding(paper);
  let llm: LlmOut | null = null;
  let usedLlm = false;

  const compact = (list: Candidate[], n: number) =>
    list.slice(0, n).map((c) => ({
      id: c.id,
      title: c.title,
      year: c.year,
      citations: c.citationCount,
      authors: c.authors,
      pool: c.pool,
      influential: c.influential || undefined,
    }));

  const hasModel =
    Boolean(auth) ||
    Boolean(process.env.OPENROUTER_API_KEY) ||
    Boolean(process.env.OPENAI_API_KEY) ||
    Boolean(process.env.LLM_BASE_URL);

  if (hasModel) try {
    const out = (await completeJson(
      JSON.stringify(
        {
          paper: {
            title: paper.title,
            year: paper.year,
            authors: authorLine(paper),
            abstract: paper.summary.slice(0, 1800),
          },
          candidates: {
            builtOn: compact(builtPool, 12),
            similar: compact(similarPool, 12),
            then: compact(thenPool, 12),
          },
          instructions: {
            claim: "One sentence, product language, not abstract-ese.",
            how: "Up to 5 short bullets of how it actually works.",
            whatsNew: "One sentence vs the obvious baseline.",
            ignoreIf: "Who should skip this paper.",
            prerequisites: "2-3 concepts or papers you need first.",
            lists: "Pick exactly 3 ids from each candidate list. Do not invent ids. why is one line.",
          },
        },
        null,
        2,
      ),
      auth,
    )) as LlmOut | null;
    if (out && typeof out === "object") {
      llm = out;
      usedLlm = true;
    }
  } catch (error) {
    console.error("LLM brief failed", error);
    llm = null;
  }

  const all = [...builtPool, ...similarPool, ...thenPool];
  const brief: Brief = {
    id: canonical,
    title: paper.title || canonical,
    year: paper.year,
    authors: paper.authors,
    abstract: paper.summary,
    arxivId: paper.id,
    doi: paper.doi,
    pdfUrl: paper.pdfUrl,
    claim: llm?.claim?.trim() || fallback.claim,
    how: (llm?.how ?? []).filter(Boolean).slice(0, 5).length
      ? (llm?.how ?? []).filter(Boolean).slice(0, 5)
      : fallback.how,
    whatsNew: llm?.whatsNew?.trim() || fallback.whatsNew,
    ignoreIf: llm?.ignoreIf?.trim() || fallback.ignoreIf,
    prerequisites: (llm?.prerequisites ?? fallback.prerequisites).filter(Boolean).slice(0, 4),
    builtOn: pickNeighbors(llm?.builtOn, all, builtPool),
    similar: pickNeighbors(llm?.similar, all, similarPool),
    then: pickNeighbors(llm?.then, all, thenPool),
    generatedAt: new Date().toISOString(),
    usedLlm,
  };

  if (brief.id !== id) {
    await writeBrief(brief);
  }
  return brief;
}
