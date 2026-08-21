# ReplyPilot AI

**AI Employee Platform** for Bangladesh SMBs — shared core (Memory · RAG · CRM · Handoff · Guardrails) with **Sales Agent** shipping first.

Authoritative scope: [`docs/PRD.md`](docs/PRD.md) · Plan: Phase 1 MVP (Postgres + auth + RAG + handover).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- **PostgreSQL + Prisma** (pgvector for RAG embeddings)
- Signed JWT session cookies + bcrypt password hashes
- Leads/orders optional `LEADS_WEBHOOK_URL` / `ORDERS_WEBHOOK_URL` → Google Sheet
- Deploy: Vercel / Render / Neon — set `DATABASE_URL` (filesystem is ephemeral)

## Quick start (Postgres)

```bash
# 1) Start local Postgres (pgvector)
docker compose up -d

# 2) Env
cp .env.example .env.local
# DATABASE_URL=postgresql://facetai:facetai@127.0.0.1:5432/facetai?schema=public

# 3) Schema + seed
npm install
npx prisma migrate deploy   # new database
# npx prisma db push         # existing databases created without migrations
npm run seed

# Optional: one-shot migrate from legacy JSON dump
# npm run db:migrate-json

# 4) Dev
npm run dev     # http://127.0.0.1:3000
```

| URL | Purpose |
| --- | --- |
| [http://127.0.0.1:3000](http://127.0.0.1:3000) | Landing + website chat widget |
| [http://127.0.0.1:3000/dashboard](http://127.0.0.1:3000/dashboard) | Ops dashboard (login required) |
| [http://127.0.0.1:3000/admin/tenants](http://127.0.0.1:3000/admin/tenants) | Super-admin tenant list scaffold |
| [http://127.0.0.1:3000/admin](http://127.0.0.1:3000/admin) | Admin-lite (legacy knowledge editor) |

**Dashboard login (demo tenant):**

- Email: `admin@demo.replypilot.local`
- Password: value of `ADMIN_PASSWORD` (default `facetai-demo` when unset)

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local dev on `127.0.0.1` |
| `npm run build` | `prisma generate` + production build |
| `npm run seed` | Seed demo tenant into Postgres |
| `npm run db:push` | Push Prisma schema to Postgres |
| `npm run db:migrate` | Create/apply Prisma migrations |
| `npm run db:migrate-json` | Import `data/facetai-db.json` → Postgres |
| `docker compose up -d` | Local Postgres + pgvector |

## Environment variables

Copy `.env.example` → `.env.local`:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Postgres connection string |
| `SESSION_SECRET` | **Yes in production** | JWT signing secret for `facetai_session` |
| `ADMIN_PASSWORD` | **Yes in production** | Demo admin password (hashed on seed) |
| `SUPER_ADMIN_EMAIL` | **Yes for `/admin/tenants`** | Only this email gets cross-tenant super-admin access |
| `TOKEN_ENCRYPTION_KEY` | **Yes in production** | AES-256-GCM for Page tokens |
| `META_PAGE_ID` | Operator-managed Messenger | Only this Page maps to the env token tenant; unknown Pages are refused |
| `MAX_AI_REPLIES_PER_DAY` | No | Per-tenant daily cap on paid LLM calls (default 500) |
| `LEADS_WEBHOOK_URL` | No | POST JSON leads |
| `ORDERS_WEBHOOK_URL` | No | POST JSON orders |
| `META_*` | Webhook / Connect | Messenger + ReplyPilot AI Connect |
| `OPENAI_API_KEY` / `AI_API_KEY` | No | LLM + embeddings; else rules + keyword RAG |
| `AI_EMBED_MODEL` | No | Default `text-embedding-3-small` |
| `AI_COST_PER_1K` | No | Dashboard AI cost estimate |

Contact: **01601-677122** · `https://wa.me/8801601677122`

## Dashboard (Phase 1)

| Section | What it does |
| --- | --- |
| **Overview** | Today chats / orders / revenue / conversion / open leads / AI cost est. |
| **Inbox** | Omnichannel threads · take/leave handoff · notes · CRM timeline |
| **Knowledge** | FAQ, uploads (chunk→embed→retrieve), Prompt Builder + guardrails |
| **Leads / Orders / Complaints / Catalog** | CRM + catalog (Postgres-backed) |
| **Team** | RBAC roles `admin` \| `manager` \| `moderator` \| `agent` |

## Key APIs

| Endpoint | Role |
| --- | --- |
| `/api/messenger/webhook` | Meta verify + inbound Messenger |
| `/api/webchat` | Website chat → Postgres (`channel=web`) + RAG retrieve |
| `/api/bot/reply` | Test AI/rules reply |
| `/api/dashboard/chats` | Inbox + PATCH take/leave/note |
| `/api/admin/tenants` | Super-admin tenant list / disable |

### Demo snippets

```bash
curl -s -X POST http://127.0.0.1:3000/api/webchat \
  -H 'Content-Type: application/json' \
  -d '{"text":"Kurti dam koto?"}'

curl -s -X POST http://127.0.0.1:3000/api/bot/reply \
  -H 'Content-Type: application/json' \
  -d '{"text":"কোন প্রোডাক্ট সাজেস্ট করবে?"}'
```

## Architecture lock

Next.js App Router monolith · JSON store replaced by PostgreSQL + Prisma · pgvector for RAG · no NestJS/FastAPI · no Redis yet.

## More docs

| Doc | For |
| --- | --- |
| **[`docs/handbook/`](docs/handbook/README.md)** | **Full product handbook — architecture, data model, API, Meta Connect, AI runtime, design system, security, runbook, roadmap** |
| [`INSTALLATION.md`](INSTALLATION.md) | Local setup + first deploy, step by step |
| [`USER_GUIDE.md`](USER_GUIDE.md) | Business owners using the dashboard day to day |
| [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) | Operators: env config, security, multi-tenant admin |
| [`API_GUIDE.md`](API_GUIDE.md) | Endpoint reference for integrators |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) | Pre-launch verification checklist |
| [`docs/PRD.md`](docs/PRD.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/SECURITY.md`](docs/SECURITY.md) | Product/architecture/security background |

`GET /api/health` returns `{ ok, status }` (200/503) for uptime monitoring — checks Postgres connectivity.
