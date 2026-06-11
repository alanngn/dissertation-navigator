# Validation Agent Test Harness

A small Next.js app for testing validation agents. Select a document, provide instructions, choose an OpenAI model, and inspect the analysis output with token usage and estimated cost.

## Features

- Instruction prompt editor for custom validation workflows
- Model selector (GPT-5.5, GPT-5.4, GPT-5.4 mini)
- Direct document upload to the analyze API (no external storage)
- PDF and plain-text document parsing
- OpenAI chat completion analysis
- Token usage and per-request cost breakdown

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Add environment variables to `.env.local`:

- `OPENAI_API_KEY` — from the [OpenAI dashboard](https://platform.openai.com/api-keys)
- `DATABASE_URL` — pooled PostgreSQL URL for the app (optional; without it, presets use browser localStorage)
- `DATABASE_URL_UNPOOLED` — direct PostgreSQL URL for migrations (can match `DATABASE_URL` locally)

4. Apply database migrations (when using Postgres):

```bash
npm run db:migrate:deploy
```

5. Run locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Set environment variables:
   - `OPENAI_API_KEY`
   - `DATABASE_URL` — pooled connection (Neon on Vercel sets this automatically)
   - `DATABASE_URL_UNPOOLED` — direct connection for migrations (Neon on Vercel sets this automatically)
4. Deploy. Vercel runs `vercel-build`, which applies pending migrations via `prisma migrate deploy`, then builds the app.

Presets are stored per user. Each browser session auto-creates a user on first visit; use the header dropdown to switch between users.

## Supported file types

- PDF (`.pdf`)
- Plain text (`.txt`, `.md`, `.csv`, `.json`, `.xml`, `.html`)

Maximum upload size: 4 MB (Vercel caps function request bodies at ~4.5 MB).

## API routes

- `POST /api/analyze` — accepts `multipart/form-data` with `file`, `instructions`, and `model`; extracts text, runs OpenAI, returns output + usage
- `GET /api/presets` — load instruction presets from Postgres (falls back to local when unconfigured)
- `PUT /api/presets` — save instruction presets to Postgres

## Cost estimates

Pricing is configured in `src/lib/models.ts` using published OpenAI rates. Update the values there if pricing changes.
