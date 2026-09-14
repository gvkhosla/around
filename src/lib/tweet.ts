import { parseQuery } from "./parse";

type FxTweet = {
  text?: string;
  entities?: { urls?: { expanded_url?: string; url?: string }[] };
  quote?: { text?: string };
  quoted_tweet?: { text?: string };
};

export async function paperTextFromTweet(
  tweetId: string,
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
      headers: { "User-Agent": "around (paper neighborhood)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tweet?: FxTweet };
    const tweet = data.tweet;
    if (!tweet) return null;
    const urls = (tweet.entities?.urls ?? [])
      .map((u) => u.expanded_url || u.url)
      .filter(Boolean)
      .join(" ");
    const quoted = tweet.quote?.text || tweet.quoted_tweet?.text || "";
    const blob = [tweet.text, urls, quoted].filter(Boolean).join("\n");
    const parsed = parseQuery(blob);
    if (parsed.arxivId) return parsed.arxivId;
    if (parsed.doi) return parsed.doi;
    return blob || null;
  } catch {
    return null;
  }
}
