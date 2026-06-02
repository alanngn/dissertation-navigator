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

3. Add your OpenAI API key to `.env.local`:

- `OPENAI_API_KEY` — from the [OpenAI dashboard](https://platform.openai.com/api-keys)

4. Run locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Set `OPENAI_API_KEY` in project environment variables.
4. Deploy.

## Supported file types

- PDF (`.pdf`)
- Plain text (`.txt`, `.md`, `.csv`, `.json`, `.xml`, `.html`)

Maximum upload size: 4 MB (Vercel caps function request bodies at ~4.5 MB).

## API routes

- `POST /api/analyze` — accepts `multipart/form-data` with `file`, `instructions`, and `model`; extracts text, runs OpenAI, returns output + usage

## Cost estimates

Pricing is configured in `src/lib/models.ts` using published OpenAI rates. Update the values there if pricing changes.
