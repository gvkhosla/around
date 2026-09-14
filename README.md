# Around

Paste a paper link. Get the claim, the lineage, and what to read next.

Neighborhood comes from [Semantic Scholar](https://www.semanticscholar.org/product/api) and [OpenAlex](https://openalex.org). An LLM ranks the 3+3+3 and writes the orientation.

## Run

```bash
cp .env.example .env.local
# add OPENROUTER_API_KEY or OPENAI_API_KEY
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Try `1706.03762`.

Shareable pages live at `/p/{arxiv-id}`. First visit is slow (API + model). After that it is cached in `.data/briefs`.

## X bot

The product is the page. The bot just replies with the link.

1. Deploy the site and set `NEXT_PUBLIC_BASE_URL`.
2. Create an X app with user auth (read + write).
3. Put `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` in `.env.local`.
4. Run `bun run bot` next to a running server.

X mention timelines usually need a paid API tier. If you cannot get that, skip the bot and share `/p/...` URLs by hand.

## API

```bash
curl -X POST http://localhost:3000/api/brief \
  -H 'content-type: application/json' \
  -d '{"q":"https://arxiv.org/abs/1706.03762"}'
```
