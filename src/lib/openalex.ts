type OpenAlexWork = {
  id?: string;
  display_name?: string;
  publication_year?: number;
  cited_by_count?: number;
  doi?: string | null;
  ids?: { openalex?: string; doi?: string };
  authorships?: { author?: { display_name?: string } }[];
  abstract_inverted_index?: Record<string, number[]> | null;
  related_works?: string[];
  referenced_works?: string[];
  primary_location?: { landing_page_url?: string; pdf_url?: string };
};

function mailto() {
  const email = process.env.OPENALEX_MAILTO;
  return email ? `mailto=${encodeURIComponent(email)}` : "";
}

function withMail(url: string) {
  const extra = mailto();
  if (!extra) return url;
  return url.includes("?") ? `${url}&${extra}` : `${url}?${extra}`;
}

async function oaFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(withMail(url), {
      headers: {
        "User-Agent": "around (paper neighborhood)",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function invertAbstract(
  inverted?: Record<string, number[]> | null,
): string | undefined {
  if (!inverted) return undefined;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) words[pos] = word;
  }
  const text = words.filter(Boolean).join(" ").trim();
  return text || undefined;
}

export async function openAlexByDoi(doi: string): Promise<OpenAlexWork | null> {
  const clean = doi.replace(/^https?:\/\/doi\.org\//i, "");
  return oaFetch<OpenAlexWork>(
    `https://api.openalex.org/works/https://doi.org/${clean}`,
  );
}

export async function openAlexByArxiv(
  arxivId: string,
): Promise<OpenAlexWork | null> {
  const doiWork = await openAlexByDoi(`10.48550/arxiv.${arxivId}`);
  if (doiWork) return doiWork;
  const landing = `http://arxiv.org/abs/${arxivId}`;
  const data = await oaFetch<{ results?: OpenAlexWork[] }>(
    `https://api.openalex.org/works?filter=${encodeURIComponent(
      `locations.landing_page_url:${landing}`,
    )}&per-page=1`,
  );
  return data?.results?.[0] ?? null;
}

export async function openAlexRelated(work: OpenAlexWork, limit = 10) {
  const ids = (work.related_works ?? [])
    .map((url) => url.split("/").pop())
    .filter((id): id is string => Boolean(id))
    .slice(0, limit);
  if (!ids.length) return [];
  const data = await oaFetch<{ results?: OpenAlexWork[] }>(
    `https://api.openalex.org/works?filter=openalex_id:${ids.join("|")}&per-page=${ids.length}`,
  );
  return data?.results ?? [];
}

export function openAlexAuthors(work: OpenAlexWork) {
  return (work.authorships ?? [])
    .map((a) => a.author?.display_name)
    .filter((n): n is string => Boolean(n));
}

export type { OpenAlexWork };
