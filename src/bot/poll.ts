import { TwitterApi } from "twitter-api-v2";
import { parseQuery } from "../lib/parse";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const INTERVAL_MS = 45_000;

function extractQuery(text: string, urls: string[]) {
  const blob = [text, ...urls].join("\n");
  const parsed = parseQuery(blob);
  if (parsed.arxivId) return parsed.arxivId;
  if (parsed.doi) return parsed.doi;
  const http = blob.match(/https?:\/\/\S+/);
  return http?.[0] ?? blob;
}

async function briefFor(q: string) {
  const res = await fetch(`${BASE.replace(/\/$/, "")}/api/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q }),
  });
  const data = (await res.json()) as {
    id?: string;
    title?: string;
    url?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || `brief ${res.status}`);
  return data;
}

async function poll() {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    console.error(
      "Missing X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET.",
    );
    process.exit(1);
  }

  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });
  const rw = client.readWrite;
  const me = await rw.v2.me();
  let sinceId = process.env.X_SINCE_ID;

  console.log(`Polling mentions for @${me.data.username}`);

  async function tick() {
    const timeline = await rw.v2.userMentionTimeline(me.data.id, {
      since_id: sinceId,
      max_results: 5,
      expansions: ["referenced_tweets.id"],
      "tweet.fields": ["text", "entities", "referenced_tweets"],
    });
    const tweets = timeline.tweets ?? [];
    const quoted = new Map(
      (timeline.includes?.tweets ?? []).map((t) => [t.id, t]),
    );

    for (const tweet of [...tweets].reverse()) {
      sinceId = tweet.id;
      if (tweet.author_id === me.data.id) continue;
      const urls = (tweet.entities?.urls ?? []).map(
        (u) => u.expanded_url || u.url || "",
      );
      const refs = tweet.referenced_tweets ?? [];
      const quotedText = refs
        .map((r) => quoted.get(r.id)?.text)
        .filter(Boolean)
        .join("\n");
      const q = extractQuery(`${tweet.text}\n${quotedText}`, urls);
      try {
        const brief = await briefFor(q);
        const text = `${brief.title}\n${brief.url}`;
        await rw.v2.reply(text.slice(0, 270), tweet.id);
        console.log(`Replied to ${tweet.id} -> ${brief.url}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Skip ${tweet.id}: ${message}`);
      }
    }
  }

  await tick();
  setInterval(() => {
    tick().catch((error) => console.error(error));
  }, INTERVAL_MS);
}

poll().catch((error) => {
  console.error(error);
  process.exit(1);
});
