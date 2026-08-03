# FaceTai — Frozen Business Decisions

> **Status:** FROZEN — 2026-07-26 (v1.0 / Phase 0)  
> **Product:** FaceTai — AI Employee Platform  
> **Authority:** This file + [`PRD.md`](./PRD.md) supersede checklist rows, README claims, and [`PHASE2-AI-BOT.md`](./PHASE2-AI-BOT.md) on conflicts.  
> Changes require explicit founder/product approval and a version bump.

---

## CORE PRODUCT PRINCIPLE (NON-NEGOTIABLE)

```text
FaceTai is an AI Employee Platform for Bangladesh SMBs.

Businesses hire specialized agents on one shared core
(Memory · RAG · CRM · Workflows · Tools · Analytics · Handoff · Guardrails).

First shipped agent = Sales Agent.
Other agent types are Planned — not separate product forks.

Never deceive buyers. Never invent stock, price, or discounts.
Escalate refunds, legal, and low-confidence cases to humans.
Bangla-first for Bangladesh.
```

---

## Locked decisions

| ID | Decision | Choice | Rejected / deferred |
| --- | --- | --- | --- |
| **DOC-1** | Workstream | **Docs first (Phase 0), then Phase 1 MVP code** | Parallel big-bang rewrite |
| **DOC-2** | Architecture | **Evolve in-place: Next.js App Router monolith** | NestJS / FastAPI split |
| **DOC-3** | Data store | **PostgreSQL** (replace JSON file behind store adapter) | JSON-only production; serverless disk as sole store |
| **DOC-4** | Vectors | **pgvector** on Postgres for RAG embeddings | Separate vector SaaS required for Phase 1 |
| **DOC-5** | Queues / Redis | **Not in Phase 1** — add when PHASES capacity trigger (e.g. follow-up jobs Phase 2+) | Redis/BullMQ on day one |
| **DOC-6** | First agent | **Sales Agent only** for Phase 1 ship | Support / Booking / Property as Phase 1 |
| **DOC-7** | Selling ethics | **No deceptive selling** — no fake scarcity, invented discounts, or pressure that contradicts catalog/KB | Dark-pattern sales scripts |
| **DOC-8** | Escalation | **Always escalate** refunds, legal, angry/abuse, and **confidence &lt; 70%** to human inbox | Fully autonomous dispute/refund settlement |
| **DOC-9** | Language / market | **Bangla-first Bangladesh** (BN default bot; EN on user language; Banglish/slang OK) | English-only global-first MVP |
| **DOC-10** | Positioning | **AI Employee Platform** (shared core + hireable agents) | Chatbot-only or “clone LazyChat feature list” positioning |
| **DOC-11** | Scope now | **Phase 0 docs + Phase 1 code only** in active build; Phases 2–5 documented in PHASES.md | Implementing Phase 3–5 in the same MVP PR |
| **DOC-12** | Channels Phase 1 | **Website chat + Messenger** (env tokens OK); Connect F39 = Phase 3 SaaS gate | Live IG/WA/Telegram required for Phase 1 exit |

---

## Role mapping (RBAC)

| Product persona | Dashboard role key | Phase 1 expectation |
| --- | --- | --- |
| Business Owner | `admin` | Full tenant config, team, KB, billing-facing settings |
| Sales Manager | `manager` | Pipeline, analytics, playbooks; limited billing |
| Human Agent | `agent` / `moderator` | Inbox take/leave/notes; **cannot** edit team/billing |
| Super Admin | platform `/admin` | Tenant list + disable (billing later) |
| Customer | (channel user) | No dashboard; chat only |

---

## Guardrail locks (runtime)

See [`AI_GUARDRAILS.md`](./AI_GUARDRAILS.md). Summary locks:

1. **Stock / price / discounts** — only from catalog DB (or explicit KB fact); otherwise refuse or escalate.
2. **Logistics** — only real courier/status fields; never invent tracking.
3. **Estimates ≠ guarantees** — delivery/ETA language must be estimate-qualified.
4. **PII** — collect phone/address with purpose; consent before unnecessary PII storage.
5. **Human escalate** — refund, legal, complaint severity, confidence &lt; 70%, explicit “human” ask.

---

## Stack locks (engineering)

| Layer | Lock |
| --- | --- |
| App | Next.js App Router + TypeScript + Tailwind |
| Persistence | Postgres via repository behind `src/lib/db/*` (Prisma default) |
| Local DB | Docker Compose `postgres`; prod managed Postgres (`DATABASE_URL`) |
| AI | Existing OpenAI-compatible client; rules fallback without key |
| Hosting | Prefer durable DB always; ephemeral FS never sole source of truth |
| Port bind | `0.0.0.0:$PORT` on Render-class Linux hosts |

---

## Explicit non-goals until unlocked

- Microservice split (Nest/FastAPI)
- Redis/BullMQ before Phase 2 capacity need
- Agent marketplace / white-label / SSO (Phase 5)
- Property Agent (RentBee) before Phase 5 partner/marketplace track
- Marketing “Connect in 2 minutes” before F39 Done criteria

---

## Version history

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-07-26 | Phase 0 freeze: monolith, Postgres, Sales first, ethics + escalate + Bangla-first |
