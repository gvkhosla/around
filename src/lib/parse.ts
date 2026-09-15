const ARXIV_ID =
  /\b((?:[0-9]{2}(?:0[1-9]|1[0-2]))\.\d{4,5})(?:v\d+)?\b/i;

const DOI =
  /\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;

const TWEET =
  /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/(\d+)/i;

export type ParsedQuery = {
  arxivId?: string;
  doi?: string;
  tweetId?: string;
  raw: string;
};

export function stripArxivVersion(id: string) {
  return id.replace(/v\d+$/i, "");
}

export function parseQuery(input: string): ParsedQuery {
  const raw = input.trim();
  const tweet = raw.match(TWEET);
  const arxiv = raw.match(ARXIV_ID);
  const doiMatch = raw.match(DOI);
  let doi = doiMatch?.[1];
  if (doi) {
    doi = doi.replace(/[).,;]+$/, "");
  }
  return {
    raw,
    tweetId: tweet?.[1],
    arxivId: arxiv ? stripArxivVersion(arxiv[1]) : undefined,
    doi,
  };
}
