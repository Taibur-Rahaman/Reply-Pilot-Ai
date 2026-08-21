# ReplyPilot AI

**AI Employee Platform** for Bangladesh SMBs — shared core (Memory · RAG · CRM · Handoff · Guardrails) with **Sales Agent** shipping first.

**Current milestone (2026-08-21): Sales Agent Pilot MVP — In Progress.** The repository already contains the PostgreSQL/Prisma, auth, RBAC, audit, RAG, dashboard, webchat and Messenger foundations. The next work is verification, security hardening, production durability and controlled pilot acceptance — not an architecture rewrite.

**Canonical execution approach:** [`docs/REAL-APPROACH.md`](docs/REAL-APPROACH.md) · **Documentation map:** [`docs/DOCUMENTATION-STATUS.md`](docs/DOCUMENTATION-STATUS.md) · Product authority: [`docs/PRD.md`](docs/PRD.md)

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- **PostgreSQL + Prisma** (pgvector for RAG embeddings)
- Signed JWT session cookies + bcrypt password hashes
- Leads/orders optional `LEADS_WEBHOOK_URL` / `ORDERS_WEBHOOK_URL` → Google Sheet
- Deploy: Vercel / Render / Neon / another durable Node + Postgres host — set `DATABASE_URL`

## Quick start (Postgres)

```bash
# 1) Start local Postgres (pgvector)
docker compose up -d

# 2) Env
cp .env.example .env.local
# DATABASE_URL=postgresql://facetai:facetai@127.0.0.1:5432/facetai?schema=public

# 3) Schema + seed
npm install
npx prisma db push
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
| [http://127.0.0.1:3000/admin](http://127.0.0.1:3000/admin) | Admin-lite compatibility UI |

**Dashboard login (demo tenant):**

- Email: `admin@demo.replypilot.local`
- Password: value of `ADMIN_PASSWORD` (default `facetai-demo` outside production)

> Do not use demo defaults in production. Production requires explicit secrets.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local dev on `127.0.0.1` |
| `npm run build` | `prisma generate` + production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Node test suite |
| `npm run seed` | Seed demo tenant into Postgres |
| `npm run db:push` | Push Prisma schema to Postgres |
| `npm run db:migrate` | Create/apply Prisma migrations |
| `npm run db:migrate-json` | Import legacy `data/facetai-db.json` → Postgres |
| `docker compose up -d` | Local Postgres + pgvector |

## Environment variables

Copy `.env.example` → `.env.local`:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Postgres connection string |
| `SESSION_SECRET` | **Yes in production** | JWT signing secret; production requires a long random value |
| `ADMIN_PASSWORD` | **Yes for compatibility/demo admin in production** | Explicit secret; never use the development default |
| `SUPER_ADMIN_EMAIL` | **Yes for super-admin routes** | Platform operator identity |
| `MAX_AI_REPLIES_PER_DAY` | No | Per-tenant daily cap on paid LLM calls |
| `LEADS_WEBHOOK_URL` | No | POST JSON leads |
| `ORDERS_WEBHOOK_URL` | No | POST JSON orders |
| `META_*` | Messenger / Connect | Meta integration configuration |
| `OPENAI_API_KEY` / `AI_API_KEY` | No | LLM + embeddings; rules/keyword fallback exists without key |
| `AI_EMBED_MODEL` | No | Default embedding model |
| `AI_COST_PER_1K` | No | Dashboard AI cost estimate |

## Current dashboard scope

| Section | Current state |
| --- | --- |
| **Overview** | Implemented analytics foundation; KPI reconciliation remains a pilot gate |
| **Inbox** | Implemented conversation/handoff foundation; end-to-end take/release/notes verification required |
| **Knowledge** | Implemented FAQ/upload/RAG foundation; durable production file storage still required |
| **Leads / Orders / Complaints / Catalog** | PostgreSQL-backed implementations |
| **Team** | RBAC implementation; complete endpoint matrix verification required |

## Key APIs

| Endpoint | Status |
| --- | --- |
| `/api/messenger/webhook` | Implemented; production signature/tenant tests required |
| `/api/webchat` | Implemented; production tenant/embed hardening required |
| `/api/bot/reply` | Implemented test/runtime path |
| `/api/dashboard/*` | Broad dashboard API surface; endpoint-by-endpoint RBAC verification required |
| `/api/health` | Implemented database health check |

## Architecture lock

Next.js App Router monolith · PostgreSQL + Prisma · pgvector RAG · no NestJS/FastAPI · no Redis until measured capacity requires it.

## Real build order

```text
Verify → Harden → Complete Sales MVP → Pilot → Measure → Expand
```

Do not add WhatsApp/Instagram/Telegram, billing, marketplace or microservices before the Sales Agent pilot proves the core loop.

## More docs

| Doc | For |
| --- | --- |
| **[`docs/REAL-APPROACH.md`](docs/REAL-APPROACH.md)** | **Canonical current implementation strategy** |
| [`docs/DOCUMENTATION-STATUS.md`](docs/DOCUMENTATION-STATUS.md) | Documentation source-of-truth map |
| [`docs/handbook/`](docs/handbook/README.md) | Full product/technical handbook |
| [`INSTALLATION.md`](INSTALLATION.md) | Local setup + deploy |
| [`USER_GUIDE.md`](USER_GUIDE.md) | Business-owner dashboard guide |
| [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) | Operator/security guide |
| [`API_GUIDE.md`](API_GUIDE.md) | Endpoint reference |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) | Release/pilot verification |
| [`docs/PRD.md`](docs/PRD.md) | Product authority |
| [`docs/BUSINESS_DECISIONS.md`](docs/BUSINESS_DECISIONS.md) | Frozen business locks |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical architecture |
| [`docs/API.md`](docs/API.md) | API contracts |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security contract |
| [`docs/AI_GUARDRAILS.md`](docs/AI_GUARDRAILS.md) | Runtime safety rules |

`GET /api/health` returns `{ ok, status }` for uptime monitoring and checks PostgreSQL connectivity.
