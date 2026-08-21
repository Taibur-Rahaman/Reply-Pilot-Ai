# FaceTai — Frozen Business Decisions

> **Status:** FROZEN decisions + execution status — 2026-08-21  
> **Product:** FaceTai — AI Employee Platform  
> **Authority:** This file + [`PRD.md`](./PRD.md) supersede checklist rows, README claims, and [`PHASE2-AI-BOT.md`](./PHASE2-AI-BOT.md) on business/product conflicts.  
> **Execution:** [`REAL-APPROACH.md`](./REAL-APPROACH.md) defines the current engineering sequence without changing these business locks.  
> Changes to the decisions below require explicit founder/product approval and a version bump.

---

## CORE PRODUCT PRINCIPLE (NON-NEGOTIABLE)

```text
FaceTai is an AI Employee Platform for Bangladesh SMBs.

Businesses hire specialized agents on one shared core
(Memory · RAG · CRM · Workflows · Tools · Analytics · Handoff · Guardrails).

First shipped agent = Sales Agent.
Other agent types are Planned — not separate product forks.

Never deceive buyers. Never invent stock, price, or discounts.
Escalate refunds, legal, angry/abuse, and low-confidence cases to humans.
Bangla-first for Bangladesh.
```

---

## Locked decisions

| ID | Decision | Choice | Rejected / deferred |
| --- | --- | --- | --- |
| **DOC-1** | Workstream | **Docs first, then implementation; now execution is verification/hardening/pilot** | Parallel big-bang rewrite |
| **DOC-2** | Architecture | **Evolve in-place: Next.js App Router monolith** | NestJS / FastAPI split |
| **DOC-3** | Data store | **PostgreSQL** (implemented; JSON is migration/legacy input only) | JSON-only production; serverless disk as sole store |
| **DOC-4** | Vectors | **pgvector** on Postgres for RAG embeddings | Separate vector SaaS required for Phase 1 |
| **DOC-5** | Queues / Redis | **Not in current Sales Agent milestone** — add only on measured capacity trigger | Redis/BullMQ on day one |
| **DOC-6** | First agent | **Sales Agent only** for current pilot | Support / Booking / Property as current milestone |
| **DOC-7** | Selling ethics | **No deceptive selling** — no fake scarcity, invented discounts, or pressure that contradicts catalog/KB | Dark-pattern sales scripts |
| **DOC-8** | Escalation | **Always escalate** refunds, legal, serious complaint/abuse, and meaningful uncertainty to human inbox | Fully autonomous dispute/refund settlement |
| **DOC-9** | Language / market | **Bangla-first Bangladesh** (BN default bot; EN on user language; Banglish/slang OK) | English-only global-first MVP |
| **DOC-10** | Positioning | **AI Employee Platform** (shared core + hireable agents) | Chatbot-only or clone positioning |
| **DOC-11** | Scope now | **Sales Agent pilot completion only**; Phase 2–5 remain roadmap | Implementing Phase 3–5 in same MVP |
| **DOC-12** | Channels now | **Website chat + Messenger** for pilot; Connect/WA/IG/TG require later gates | Live omnichannel required before Sales pilot |

---

## Current execution status

The decisions above are unchanged, but the implementation has moved beyond the original Phase-0 state.

| Capability | Reality | Next gate |
| --- | --- | --- |
| PostgreSQL/Prisma | Implemented | Clean DB + migration/seed verification |
| Auth | bcrypt + signed JWT implemented | Endpoint security test |
| RBAC | Role helpers/dashboard gates implemented | Complete mutation matrix |
| Tenant isolation | Tenant-scoped repositories implemented | Negative cross-tenant tests |
| Audit | Model/repository/write paths implemented | Coverage verification |
| RAG | Vector + keyword fallback implemented | Retrieval/grounding evaluation |
| Handoff/CRM | Data/UI paths exist | End-to-end acceptance |
| Analytics | Repository/UI paths exist | KPI reconciliation |
| Messenger | Webhook/reply path exists | Real Meta pilot + signature/tenant tests |
| Connect | Demo/OAuth scaffold | Keep non-production until full gate |
| KB file storage | Local filesystem today | Durable storage before pilot |

The implementation status must not be used to change the product decision locks.

---

## Role mapping (RBAC)

| Product persona | Dashboard role key | Current expectation |
| --- | --- | --- |
| Business Owner | `admin` | Tenant config, team, KB, catalog and operational settings |
| Sales Manager | `manager` | Pipeline and analytics; limited privileged settings |
| Human Agent | `agent` / `moderator` | Inbox take/leave/notes; cannot manage restricted team/security settings |
| Super Admin | platform `/admin` | Tenant lifecycle/operations; billing later |
| Customer | channel user | No dashboard; chat only |

---

## Guardrail locks (runtime)

See [`AI_GUARDRAILS.md`](./AI_GUARDRAILS.md). Summary locks:

1. Stock / price / discounts only from tenant catalog or explicit grounded KB fact.
2. Logistics only from real order/provider data.
3. Estimates are not guarantees.
4. Collect PII only with purpose and consent where required.
5. Human escalation for refunds/legal/serious complaint/explicit human request/meaningful uncertainty.

---

## Stack locks (engineering)

| Layer | Lock |
| --- | --- |
| App | Next.js App Router + TypeScript + Tailwind |
| Persistence | Postgres via Prisma repositories under `src/lib/db/*` |
| Local DB | Docker Compose Postgres + pgvector |
| AI | OpenAI-compatible endpoint with rules/keyword fallback |
| Hosting | Durable database always; application filesystem never sole production store |
| Port bind | `0.0.0.0:$PORT` on Render-class Linux hosts |

---

## Explicit non-goals until unlocked

- Microservice split (Nest/FastAPI)
- Redis/BullMQ before measured capacity need
- Agent marketplace / white-label / SSO (Phase 5)
- Property Agent (RentBee) before the later marketplace/agent-pack track
- Marketing “Connect in 2 minutes” before F39 production criteria
- WhatsApp/Instagram/Telegram before Sales Agent pilot acceptance

---

## Version history

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-07-26 | Phase 0 freeze: monolith, Postgres, Sales first, ethics + escalate + Bangla-first |
| 1.1 | 2026-08-21 | Decision locks preserved; execution status updated to reflect the implemented Postgres/auth/RAG foundation and pilot-first approach |
