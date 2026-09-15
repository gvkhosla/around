# Around

Drop an arXiv paper. See what it sits on, what’s next to it, and what came after.

https://ar.omco.ai

Prefix any arXiv URL:

`https://ar.omco.ai/https://arxiv.org/abs/1706.03762`

## Run

```bash
cp .env.example .env.local
bun dev
```

Optional: connect ChatGPT or paste an API key in `/settings` for sharper writeups.

## Deploy

Railway. `bun run start` listens on `PORT`.
