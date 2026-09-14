import { cache } from "react";
import { readBrief, writeBrief } from "./cache";
import { completeJson } from "./llm";
import { openAlexByArxiv, openAlexByDoi } from "./openalex";
import {
  canonicalPaperId,
  parseQuery,
  s2LookupId,
  stripArxivVersion,
} from "./parse";
import {
  s2Citations,
  s2Paper,
  s2Recommendations,
  s2References,
  s2Search,
} from "./s2";
import { paperTextFromTweet } from "./tweet";
import type { Brief, Candidate, Neighbor, S2Paper } from "./types";

function authorLine(paper: S2Paper) {
  const names = (paper.authors ?? [])
    .map((a) => a.name)
    .filter((n): n is string => Boolean(n));
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} et al.`;
}

function arxivOf(paper: S2Paper) {
  const id = paper.externalIds?.ArXiv;
  return id ? stripArxivVersion(id) : undefined;
}

function toCandidate(
  paper: S2Paper,
  pool: Candidate["pool"],
  extra?: { influential?: boolean },
): Candidate | null {
  if (!paper.paperId || !paper.title) return null;
  const arxivId = arxivOf(paper);
  return {
    id: canonicalPaperId({ arxivId, paperId: paper.paperId }),
    paperId: paper.paperId,
    title: paper.title,
    year: paper.year,
    authors: authorLine(paper),
    citationCount: paper.citationCount,
    abstract: paper.abstract ?? paper.tldr?.text ?? undefined,
    arxivId,
    doi: paper.externalIds?.DOI,
    url: paper.url,
    pool,
    influential: extra?.influential,
  };
}

function rank(cands: Candidate[]) {
  return [...cands].sort((a, b) => {
    const inf = Number(Boolean(b.influential)) - Number(Boolean(a.influential));
    if (inf) return inf;
    return (b.citationCount ?? 0) - (a.citationCount ?? 0);
  });
}

function unique(cands: Candidate[], exclude: Set<string>) {
  const seen = new Set(exclude);
  const out: Candidate[] = [];
  for (const c of cands) {
    if (seen.has(c.id) || seen.has(c.paperId)) continue;
    seen.add(c.id);
    seen.add(c.paperId);
    out.push(c);
  }
  return out;
}

function fallbackUnderstanding(paper: S2Paper) {
  const tldr = paper.tldr?.text?.trim();
  const abstract = paper.abstract?.trim();
  const claim = tldr || abstract?.split(/(?<=\.)\s/)[0] || paper.title || "";
  return {
    claim,
    how: abstract
      ? abstract
          .split(/(?<=\.)\s/)
          .filter(Boolean)
          .slice(0, 5)
      : [],
    whatsNew: tldr || "See the abstract.",
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
            ? "Follow-up that cites this paper."
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
  const parsed = parseQuery(input);
  if (parsed.arxivId) return parsed.arxivId;
  if (parsed.tweetId) {
    const fromTweet = await paperTextFromTweet(parsed.tweetId);
    if (fromTweet) return resolvePaperId(fromTweet);
  }
  if (parsed.doi) {
    try {
      const paper = await s2Paper(`DOI:${parsed.doi}`);
      return canonicalPaperId({
        arxivId: arxivOf(paper),
        paperId: paper.paperId,
      });
    } catch {
      /* search fallback */
    }
  }
  const hit = await s2Search(parsed.raw);
  if (!hit) return null;
  return canonicalPaperId({ arxivId: arxivOf(hit), paperId: hit.paperId });
}

export const getBrief = cache(async (id: string): Promise<Brief> => {
  const cached = await readBrief(id);
  if (cached) return cached;
  const brief = await generateBrief(id);
  await writeBrief(brief);
  return brief;
});

export async function generateBrief(id: string): Promise<Brief> {
  const lookup = s2LookupId(id);
  const paper = await s2Paper(lookup);
  const canonical = canonicalPaperId({
    arxivId: arxivOf(paper),
    paperId: paper.paperId,
  });

  const [refs, cites, recs] = await Promise.all([
    s2References(lookup),
    s2Citations(lookup),
    s2Recommendations(lookup),
  ]);

  const oa = paper.externalIds?.DOI
    ? await openAlexByDoi(paper.externalIds.DOI)
    : arxivOf(paper)
      ? await openAlexByArxiv(arxivOf(paper)!)
      : null;
  const self = new Set(
    [canonical, paper.paperId, arxivOf(paper)].filter(Boolean) as string[],
  );

  // Bibliography order beats citation-count for lineage.
  const builtPool = unique(
    refs
      .map((p) => toCandidate(p, "reference"))
      .filter(Boolean) as Candidate[],
    self,
  );
  const thenRanked = rank(
    cites
      .map((row) =>
        toCandidate(row.paper, "citation", { influential: row.influential }),
      )
      .filter(Boolean) as Candidate[],
  );
  const thenMeaningful = thenRanked.filter(
    (c) => c.influential || (c.citationCount ?? 0) > 0,
  );
  const thenPool = unique(
    thenMeaningful.length ? thenMeaningful : thenRanked,
    self,
  );
  const similarPool = unique(
    recs
      .map((p) => toCandidate(p, "recommendation"))
      .filter(Boolean) as Candidate[],
    self,
  );

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

  try {
    const out = (await completeJson(
      JSON.stringify(
        {
          paper: {
            title: paper.title,
            year: paper.year,
            authors: authorLine(paper),
            venue: paper.venue,
            tldr: paper.tldr?.text,
            abstract: paper.abstract?.slice(0, 1800),
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
    authors: (paper.authors ?? [])
      .map((a) => a.name)
      .filter((n): n is string => Boolean(n)),
    venue: paper.venue,
    citationCount: paper.citationCount,
    abstract: paper.abstract ?? undefined,
    arxivId: arxivOf(paper),
    doi: paper.externalIds?.DOI,
    s2Url: paper.url,
    openAlexUrl: oa?.id,
    pdfUrl:
      paper.openAccessPdf?.url ||
      (arxivOf(paper) ? `https://arxiv.org/pdf/${arxivOf(paper)}` : undefined),
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
