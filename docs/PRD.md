# FaceTai — Product Requirements Document (PRD)

| Field | Value |
| --- | --- |
| **Product** | FaceTai |
| **Version** | 3.0 |
| **Status** | Authoritative — AI Employee Platform |
| **Date** | 2026-07-26 |
| **Contact (sales)** | WhatsApp **01601-677122** (`wa.me/8801601677122`) |
| **Related docs** | [`BUSINESS_DECISIONS.md`](./BUSINESS_DECISIONS.md) (frozen locks) · [`PHASES.md`](./PHASES.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`API.md`](./API.md) · [`SECURITY.md`](./SECURITY.md) · [`AI_GUARDRAILS.md`](./AI_GUARDRAILS.md) · [`PHASE2-AI-BOT.md`](./PHASE2-AI-BOT.md) (historical sketch) |

**Conflict rule:** On product scope, architecture locks, or SKUs — **PRD + BUSINESS_DECISIONS win**. `PHASE2-AI-BOT.md` and code comments must not silently expand MVP or claim Planned features as live.

Status legend: **Current** (shipped / usable) · **Partial** (UI or path exists; gaps remain) · **Planned** (roadmap only)

---

## 1. Product positioning

FaceTai is an **AI Employee Platform** for Bangladesh SMBs. Businesses hire specialized agents that share one core engine:

```
Core: Memory · RAG · CRM · Workflows · Tool calling · Analytics · Human handoff · Guardrails
Agents: Sales | Support | Booking | Property (RentBee) | Healthcare | Restaurant | HR | Education | Custom
```

**Phase 1 ships Sales Agent only.** Other agent types are **Planned** — prompts, tools, and domain logic swap later; no separate product forks.

**Hero line:**

> FaceTai — AI employees for Bangladeshi businesses. Hire a Sales Agent today; add Support, Booking, Property, and more on the same platform.

**Geography / language:** Bangladesh first. Bangla-first UX and bot (BN default; EN when the customer writes EN). Banglish, slang, and typos are first-class.

**Brand rules:** Compete on FaceTai identity and BD-fit (COD, Messenger-first, fair packaging). Do not present as a white-label clone of AnyChat / WATI / Botpress / HubSpot / LazyChat.

---

## 2. Implementation status snapshot (honest — 2026-07-26)

| Area | Status | Notes |
| --- | --- | --- |
| Landing + SaaS pricing + lead form | **Current** | Packages Starter→Enterprise; WhatsApp CTA |
| Multi-tenant JSON store (`tenantId`) | **Partial** | Works locally via `data/facetai-db.json`; ephemeral on serverless |
| PostgreSQL + pgvector | **Planned** | Phase 1 cutover |
| Auth (cookie session) | **Partial** | Demo login; plaintext passwords — harden Phase 1 |
| RBAC (admin/manager/moderator/agent) | **Partial** | Team UI stub; API gates incomplete |
| Website chat (`/api/webchat`) | **Current** | Widget + persistence in store |
| Messenger webhook + reply pipeline | **Current** | Env tokens; Bangla-first AI/rules |
| Instagram / WhatsApp / Telegram live | **Partial** | Telegram is live (bot webhook + send + owner commands). Instagram / WhatsApp: channel field + inbox UI + ingest stubs; Graph send/receive Planned (Phase 3) |
| Catalog + recommend / upsell scoring | **Current** | Grounded on catalog when present |
| Orders + invoice + courier fields | **Current** | Dashboard + bot path; Sheet webhook optional |
| Complaint detect + queue | **Partial** | Keywords + handoff; full refund workflow polish Phase 1 |
| Knowledge uploads (PDF/Excel/CSV/TXT) | **Partial** | Prompt stuffing FAQ/uploads — real RAG Planned Phase 1 |
| Prompt Builder / guardrail rules UI | **Partial** | Bot config exists; hard rules UI Phase 1 |
| Human handoff | **Partial** | Echo / keywords; confidence + inbox take/leave Phase 1 |
| CRM stages | **Partial** | Stages exist; unified timeline Phase 1 |
| Analytics home KPIs | **Partial** | Thin counts; Phase 1 home KPIs |
| Audit logs | **Planned** | Phase 1 |
| FaceTai Connect (F39) | **Partial** | Scaffold / Demo Connect; true SaaS gate Phase 3 |
| Workflows / campaigns / billing portal / WL / marketplace | **Planned** | Phases 4–5 |
| Support / Booking / Property / other agents | **Planned** | Shared core; domain tools later |

**Explicitly not claimed live:** Nest/FastAPI split, Redis/BullMQ (until capacity trigger), agent marketplace, native mobile apps.

---

## 3. Problem & goals

### Problem

BD SMBs run Facebook/Instagram ads into Messenger (and WhatsApp), but:

- Inboxes go unanswered nights/weekends → lost COD orders.
- FAQ bots don’t sell — weak upsell, follow-up, and grounding on real catalog/KB.
- Orders and complaints live in chat chaos; teams need CRM + ops dashboard.
- Meta Connect / App Review is hard for SMB owners alone.
- Global tools are often overpriced or not tuned for Bangla + COD commerce.

### Goals

1. Ship a **shared AI Employee core** (memory, RAG, CRM, handoff, guardrails).
2. Deliver **Sales Agent** as the first hireable employee (Phase 1).
3. Bangla-first, BD-priced, Messenger + website chat first; omnichannel later.
4. Honest ops: escalate refunds/legal/low confidence; never invent stock or discounts.
5. Multi-tenant SaaS path without premature microservice split.

### Non-goals (near term)

- Shipping Support/Booking/Property agents before Sales Agent MVP Done.
- Claiming Connect / live IG/WA before Done criteria.
- Deceptive selling, fake scarcity, invented logistics.
- Separate Nest/FastAPI backend or Redis until PHASES capacity trigger.

---

## 4. Personas & JTBD

| Persona | Role | Primary need |
| --- | --- | --- |
| **Super Admin** | FaceTai platform ops | List/disable tenants; later billing & usage |
| **Business Owner** | Tenant `admin` | Hire/configure Sales Agent, catalog, KB, team, billing |
| **Sales Manager** | Tenant `manager` | Pipeline, analytics, playbooks, handover oversight |
| **Human Agent** | Tenant `agent` / `moderator` | Inbox take/leave, notes, resolve escalations |
| **Customer** | End buyer on channel | Fast BN/EN answers, honest prices/stock, order help |

### JTBD (examples)

- **Owner:** When ads flood Messenger at night, I want a Sales Agent that answers, recommends real products, and logs orders — without Meta console paste forever.
- **Manager:** When leads stall, I want scores, follow-ups, and conversion KPIs.
- **Human Agent:** When AI escalates a refund, I want one inbox thread with full timeline.
- **Customer:** When I ask price/stock in Bangla, I want a true answer or an honest “check with human.”

---

## 5. Agent platform model

| Agent | Role | Status |
| --- | --- | --- |
| **Sales Agent** | Recommend, qualify, capture order, follow-up, escalate | **Phase 1 target** (Partial → Current) |
| **Support Agent** | Tickets, FAQs, complaint resolve | **Planned** |
| **Booking Agent** | Appointments / slots | **Planned** |
| **Property Agent (RentBee)** | Listing discovery / rental assist — shared core, domain tools | **Planned** (Phase 5 marketplace / partner) |
| Healthcare / Restaurant / HR / Education / Custom | Domain packs | **Planned** |

Agents share: Memory · RAG · CRM · Workflows · Tool calling · Analytics · Human handoff · Guardrails.  
They differ by: system prompt, tools, domain schemas, escalation policy.

---

## 6. Phase mapping (0–5)

| Phase | Name | Intent |
| --- | --- | --- |
| **0** | Documentation | This PRD + locks + architecture (no feature code) |
| **1** | Sales Agent MVP | Postgres, auth/RBAC, RAG, Prompt Builder, handover, CRM timeline, analytics home |
| **2** | Sales Intelligence | Lead score, memory fields, follow-up scheduler, playbooks, personalities |
| **3** | Omnichannel | Live IG / WA + Connect (F39) polish (Telegram shipped) |
| **4** | Automation | Workflows, campaigns, email/SMS, richer tool actions |
| **5** | Enterprise | Hard isolation, usage billing, WL, public API, agent marketplace, SSO |

Detail and Done criteria: [`PHASES.md`](./PHASES.md).

---

## 7. Functional requirements (MoSCoW)

**Priority:** Must / Should / Could · **Status:** Current / Partial / Planned

### Tenancy

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-T1 | `tenantId` on all business entities | Must | **Partial** (JSON) → Phase 1 Postgres |
| FR-T2 | Cross-tenant reads fail closed | Must | **Partial** |
| FR-T3 | Super Admin tenant list + disable | Should | **Planned** (scaffold Phase 1) |

### Auth / RBAC

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-A1 | Email/password login for dashboard | Must | **Partial** |
| FR-A2 | Hashed passwords + signed session | Must | **Planned** (Phase 1) |
| FR-A3 | Roles: admin / manager / moderator / agent | Must | **Partial** |
| FR-A4 | Enforce role gates on dashboard APIs | Must | **Planned** (Phase 1) |
| FR-A5 | Audit log for config/auth/handoff | Must | **Planned** (Phase 1) |

### Channels

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-C1 | Website chat widget + API | Must | **Current** |
| FR-C2 | Messenger webhook verify + reply | Must | **Current** |
| FR-C3 | Omnichannel inbox UI + channel field | Must | **Partial** |
| FR-C4 | WhatsApp Cloud live | Must | **Planned** (Phase 3) |
| FR-C5 | Instagram / Telegram live | Should | Telegram **Done**; Instagram **Planned** (Phase 3) |
| FR-C6 | FaceTai Connect (self-serve Page) | Must | **Partial** → Phase 3 Done |
| FR-C7 | Comment AI (spam / reply / lead) | Should | **Partial** |

### Agent runtime

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-R1 | Shared pipeline: detect → memory → RAG → strategy → LLM → save | Must | **Partial** |
| FR-R2 | Sales Agent domain strategy + tools | Must | **Partial** → Phase 1 |
| FR-R3 | Swap agent type without forking product | Should | **Planned** |
| FR-R4 | Bangla-first language / Banglish | Must | **Current** |

### KB / RAG

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-K1 | Upload PDF / Excel / CSV / TXT | Must | **Partial** |
| FR-K2 | Chunk → embed → pgvector retrieve | Must | **Planned** (Phase 1) |
| FR-K3 | Refuse inventing facts outside KB/catalog | Must | **Partial** (guardrails Phase 1) |
| FR-K4 | Drive / Sheets / Notion / crawl | Should | **Planned** |

### Catalog

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-CAT1 | Product CRUD (name, price, image, stock) | Must | **Current** |
| FR-CAT2 | Recommend only from catalog | Must | **Partial** |
| FR-CAT3 | Ecommerce connector sync | Should | **Partial** (stub + CSV import) |

### Conversation pipeline

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-P1 | Context across fragmented messages | Must | **Partial** |
| FR-P2 | Order capture + tracking + invoice | Must | **Current** |
| FR-P3 | Complaint detect → escalate | Must | **Partial** |
| FR-P4 | Image send / recognition heuristics | Should | **Partial** |

### Memory · Personality · Sales psychology · Lead qualify · Follow-up

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-M1 | Customer memory fields across sessions | Should | **Planned** (Phase 2) |
| FR-PER1 | Configurable personality | Should | **Partial** → Phase 1–2 |
| FR-S1 | Sales nudges without deceptive tactics | Must | **Partial** |
| FR-L1 | Lead stages New→Won/Lost | Must | **Partial** |
| FR-L2 | Lead scoring | Should | **Planned** (Phase 2) |
| FR-F1 | Abandoned-lead follow-up (policy-safe) | Must | **Partial** |
| FR-F2 | Follow-up scheduler / jobs | Should | **Planned** (Phase 2; Redis trigger) |

### CRM · Analytics · Handover · Prompt Builder · Cost meter

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-CRM1 | Unified timeline (message/order/refund/note) | Must | **Planned** (Phase 1) |
| FR-AN1 | Home KPIs: conversations, orders, revenue, conversion, open leads | Must | **Planned** (Phase 1) |
| FR-AN2 | AI cost / token estimate | Should | **Planned** |
| FR-H1 | Handoff silence on human take | Must | **Partial** |
| FR-H2 | Escalate refund / legal / angry / confidence &lt; 70% | Must | **Planned** (Phase 1) |
| FR-H3 | Inbox take / leave / notes | Must | **Planned** (Phase 1) |
| FR-PB1 | Prompt Builder + hard guardrail rules UI | Must | **Planned** (Phase 1) |
| FR-COST1 | Cost meter per tenant | Should | **Planned** |

### Integrations · Super-admin billing

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-I1 | Google Sheet webhooks for leads/orders | Must | **Current** (optional env) |
| FR-I2 | OpenAI-compatible LLM | Must | **Current** |
| FR-I3 | Workflows / campaigns / email-SMS | Could | **Planned** (Phase 4) |
| FR-BILL1 | Self-serve billing portal | Could | **Planned** (Phase 5) |
| FR-BILL2 | Super-admin usage billing | Should | **Planned** (Phase 5) |

---

## 8. Acceptance criteria (Phase 1 exit — summary)

Full Phase 1 Done list lives in [`PHASES.md`](./PHASES.md). Headline AC:

| ID | Criterion |
| --- | --- |
| AC-1 | Fresh deploy with empty disk still has durable chat/CRM data (Postgres) |
| AC-2 | Agent replies use retrieved KB chunks, not full dump |
| AC-3 | Human can take over webchat/Messenger; AI silent until release |
| AC-4 | Role `agent` cannot edit billing/team; `admin` can |
| AC-5 | Audit trail for config changes |
| AC-6 | Seed demo works against Postgres |
| AC-7 | Guardrails: no invented stock/discounts; escalate refunds/legal/low confidence |

---

## 9. Pricing (sellable — unchanged packaging)

| Plan | Price |
| --- | --- |
| Starter | ৳1,990 / month |
| Growth | ৳4,990 / month |
| Pro | ৳9,990 / month |
| Business | ৳14,990 / month |
| Enterprise | Custom |

Optional one-time setup / Custom AI Agent add-ons after consult. Fair-use disclaimer required — no absolute “zero API/hosting forever” claims.

---

## 10. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Latency | P50 text reply ≤ 5s (excludes Meta/LLM outages); P95 ≤ 15s |
| Tenancy | Every query scoped by `tenantId`; default deny |
| Privacy | PII consent; retention; deletion on request — see SECURITY |
| Language | Landing BN primary; bot BN default / EN switch |
| Hosting | Next.js monolith; bind `0.0.0.0:$PORT` on Render-class hosts; no sole reliance on ephemeral disk |
| Meta policy | Messaging window / tags; no spammy cold outreach |

---

## 11. Success metrics

| Metric | Target (initial) |
| --- | --- |
| Time-to-first-reply (bot) | P50 ≤ 5s |
| Reply rate (handoff off) | ≥ 95% |
| KB grounding spot-check | ≥ 90% when KB present |
| Handoff correctness | ≥ 99% no bot reply within 2 min after take |
| Tenant isolation incidents | 0 |
| Connect success (when F39 Done) | ≥ 80% happy-path |

---

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| LLM invents price/stock | Catalog/KB tools + AI_GUARDRAILS |
| Ephemeral FS data loss | Postgres Phase 1 |
| Meta App Review / Connect delays | Env-token dual-mode; don’t market Connect early |
| Double replies with humans | Handoff + take/leave |
| Overclaiming agents/channels | Status snapshot + PHASES |

---

## 13. Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.x–2.0 | 2026-07-20 | AI Business OS framing; F39–F60; FaceTai 2.0 wave |
| **3.0** | **2026-07-26** | **AI Employee Platform**; personas Super Admin / Owner / Sales Manager / Human Agent / Customer; agent model (Sales first); Phase 0–5; MoSCoW FRs with Current/Partial/Planned; locks in BUSINESS_DECISIONS |

**Supersedes:** PRD v2.0 positioning as primary “AI Business Operating System” copy — OS pillars remain as core capabilities under the AI Employee Platform umbrella.
