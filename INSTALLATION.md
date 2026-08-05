# Installation

Step-by-step setup for local development and a first production deploy. For a fast path, see the [README](README.md) quick start.

## Prerequisites

- Node.js 20+ and npm
- Docker (for local Postgres + pgvector), or a hosted Postgres with the `vector` extension (e.g. Neon, Supabase, Render)
- Optional: an OpenAI-compatible LLM (OpenAI, Groq, Gemini, or a local Ollama install) for AI replies — without one, the bot falls back to rule-based Bengali replies

## 1. Clone and install

```bash
git clone <your-fork-url> replypilot-ai
cd replypilot-ai
npm install
```

`npm install` triggers `postinstall` → `prisma generate`, which needs `prisma/schema.prisma` but not a live database.

## 2. Start Postgres

```bash
docker compose up -d
```

This starts `pgvector/pgvector:pg16` on `127.0.0.1:5432` with user/password/db all `facetai` (see `docker-compose.yml`). If port 5432 is already in use by another project, edit the `ports` mapping in `docker-compose.yml` and the matching `DATABASE_URL` port below.

## 3. Configure environment

```bash
cp .env.example .env.local
```

At minimum for local dev, `.env.local` needs:

```bash
DATABASE_URL=postgresql://facetai:facetai@127.0.0.1:5432/facetai?schema=public
```

Everything else has safe local defaults. See [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) for what's required before you deploy to production — several variables that are optional locally (`SESSION_SECRET`, `ADMIN_PASSWORD`, `SUPER_ADMIN_EMAIL`) become **required** once `NODE_ENV=production`, and the app now fails fast at startup (`src/instrumentation.ts`) if they're missing.

## 4. Push the schema and seed demo data

```bash
npx prisma db push
npm run seed
```

`npm run seed` creates a demo tenant, a demo admin user, sample products/FAQ/conversations, and prints the login to use. It refuses to run against a database where `NODE_ENV=production` unless you pass `SEED_CONFIRM=yes` — this is deliberate, so a misconfigured deploy step can't quietly seed demo data (and a demo login) into a real production database.

## 5. Run the dev server

```bash
npm run dev
```

Visit:

- `http://127.0.0.1:3000` — landing page + website chat widget
- `http://127.0.0.1:3000/login` — dashboard login (demo credentials printed by `npm run seed`)
- `http://127.0.0.1:3000/dashboard` — ops dashboard once logged in

## 6. Optional: connect a real AI model

Without `OPENAI_API_KEY`/`AI_API_KEY` set, replies use the rules + keyword-RAG fallback (fine for demos, weaker for real conversations). To use a real model, uncomment one block in `.env.example`:

- **Ollama (free, local/self-hosted):** `ollama pull qwen2.5:7b-instruct && ollama pull nomic-embed-text`, then set `AI_PROVIDER=ollama`.
- **Groq / Gemini (free tier, hosted):** set the provider + API key.
- **OpenAI (paid):** set `OPENAI_API_KEY` and `AI_MODEL=gpt-4o-mini` (or another chat model).

## 7. Deploying

The app is a standard Next.js app; `npm run build` runs `prisma generate && next build`. Deploy targets that work out of the box:

- **Vercel** — set env vars in the project settings, point `DATABASE_URL` at a managed Postgres with pgvector (Neon, Supabase). Vercel sets `NODE_ENV=production` automatically, so `SESSION_SECRET`, `ADMIN_PASSWORD`, and `SUPER_ADMIN_EMAIL` must be set or the app will refuse to start / relevant routes will 401/403.
- **Render / Docker** — build with `npm run build`, run with `npm start` (`next start --hostname 0.0.0.0` via `npm run start:lan`), point at a managed Postgres.

After first deploy, run the schema push once against the production database (`DATABASE_URL=... npx prisma db push`, or set up proper migrations with `npm run db:migrate`), then optionally seed with `SEED_CONFIRM=yes npm run seed` if you want the demo tenant available — most real deployments should skip seeding and create the first real tenant/user directly.

See [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) before going live.
