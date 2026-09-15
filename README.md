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

Optional: connect alphaXiv in `/settings` for related and follow-up discovery. Connect ChatGPT or paste a model API key for sharper writeups.

A deployment can provide `ALPHAXIV_API_KEY` to enable deeper discovery for everyone. Around calls the authenticated MCP endpoint from the server; browser-stored keys are sent per request and are not persisted by Around.

## Deploy

Railway. `bun run start` listens on `PORT`.
