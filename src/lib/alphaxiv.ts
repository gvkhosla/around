import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getArxiv, type ArxivPaper } from "./arxiv";
import type { Neighbor } from "./types";

const ENDPOINT = "https://api.alphaxiv.org/mcp/v1";
const mem = new Map<string, AlphaXivNeighborhood>();

export type AlphaXivNeighborhood = {
  similar: Neighbor[];
  followUps: Neighbor[];
};

function searchTerms(paper: ArxivPaper) {
  const stop = new Set([
    "about",
    "after",
    "before",
    "from",
    "into",
    "that",
    "their",
    "these",
    "this",
    "through",
    "using",
    "with",
  ]);
  const words = paper.title
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stop.has(word));
  return [paper.title, paper.id, ...new Set(words)].slice(0, 4);
}

function textFromResult(result: unknown) {
  if (!result || typeof result !== "object") return "";
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const block = item as { type?: unknown; text?: unknown };
      return block.type === "text" && typeof block.text === "string"
        ? block.text
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

function arxivIds(text: string, exclude: string) {
  return [
    ...new Set(
      [...text.matchAll(/\b(\d{4}\.\d{4,5})(?:v\d+)?\b/g)].map(
        (match) => match[1],
      ),
    ),
  ].filter((id) => id !== exclude);
}

async function callDiscover(paper: ArxivPaper, key: string) {
  const client = new Client({ name: "Around", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
  });

  try {
    await client.connect(transport);
    const result = await client.callTool(
      {
        name: "discover_papers",
        arguments: {
          keywords: searchTerms(paper),
          question: `Find work most closely related to ${paper.title}, especially direct extensions, successor methods, replications, and papers that build on its central contribution.`,
          difficulty: 3,
          prioritize: "default",
        },
      },
      undefined,
      { timeout: 45_000 },
    );
    if (result.isError) throw new Error(textFromResult(result) || "alphaXiv search failed.");
    return arxivIds(textFromResult(result), paper.id);
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function discoverAround(
  id: string,
  key: string,
): Promise<AlphaXivNeighborhood> {
  const cached = mem.get(id);
  if (cached) return cached;

  const paper = await getArxiv(id);
  const ids = await callDiscover(paper, key);
  const found = (
    await Promise.all(
      ids.slice(0, 12).map(async (paperId) => {
        try {
          return await getArxiv(paperId);
        } catch {
          return null;
        }
      }),
    )
  ).filter((item): item is ArxivPaper => Boolean(item));

  const toNeighbor = (item: ArxivPaper, why: string): Neighbor => ({
    id: item.id,
    title: item.title,
    year: item.year,
    authors:
      item.authors.length <= 3
        ? item.authors.join(", ")
        : `${item.authors.slice(0, 3).join(", ")} et al.`,
    why,
    arxivId: item.id,
    url: item.absUrl,
  });
  const later = paper.year
    ? found.filter((item) => item.year && item.year > paper.year!)
    : [];
  const laterIds = new Set(later.map((item) => item.id));
  const related = found.filter((item) => !laterIds.has(item.id));
  const data = {
    similar: related
      .slice(0, 6)
      .map((item) => toNeighbor(item, "Related work surfaced by alphaXiv.")),
    followUps: later
      .slice(0, 6)
      .map((item) =>
        toNeighbor(item, "Later work surfaced by alphaXiv."),
      ),
  };
  mem.set(id, data);
  return data;
}
