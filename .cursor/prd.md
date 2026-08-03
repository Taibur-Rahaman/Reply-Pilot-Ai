# FaceTai — Product Requirements Document (AI Knowledge Base)

| Field | Value |
| --- | --- |
| **Product** | FaceTai |
| **KB version** | 1.0 (derived from `docs/PRD.md` v2.0 + codebase audit 2026-07-26) |
| **Authoritative product scope** | [`docs/PRD.md`](../docs/PRD.md) — **this file mirrors and operationalizes it for AI agents** |
| **Conflict rule** | On product scope or SKUs, `docs/PRD.md` wins over README, PHASE2, and code comments |
| **Related KB** | [architecture.md](./architecture.md) · [design.md](./design.md) · [phases.md](./phases.md) · [rules.md](./rules.md) · [memory.md](./memory.md) |
| **Sales contact** | WhatsApp **01810-285559** (`wa.me/8801810285559`) |

---

## Vision

FaceTai is Bangladesh’s AI Business Operating System: one platform where Messenger/WhatsApp AI, omnichannel inbox, CRM, knowledge training, order ops, complaints, analytics, and automation work together for COD-heavy Facebook sellers — not a chatbot toy and not a HubSpot clone.

## Mission

Help Bangladeshi SMBs, e-commerce sellers, and agencies answer every ad-driven inbox message, convert chats into logged orders, and operate day-to-day without Meta Developer Console expertise — via hybrid **software** (own FaceTai bot/platform) + **services** (setup/retainer on client tools when needed).

## Product overview

| Layer | What it is | How delivered |
| --- | --- | --- |
| **Software** | FaceTai platform: Messenger AI, webchat, KB, sales agent, CRM/orders, complaints, recommendations, multi-tenant ops, Connect (roadmap) | Own Next.js app + Meta webhooks + OpenAI-compatible LLM |
| **Services** | Monthly maintenance/marketing; rule/AI setups on client ManyChat/Chatfuel/etc. | Human delivery on **client’s** accounts |

**Hero line (use in product copy):**

> FaceTai is an AI Business Operating System for Bangladeshi businesses.  
> AI Sales Agent + Omnichannel Inbox + CRM + Knowledge Base + Order Management + Analytics + Automation — all in one platform.

**Brand rules:** Compete on FaceTai identity and BD niche. Do **not** present as a white-label clone of ManyChat, WATI, Botpress, HubSpot, or LazyChat.

---

## User personas

| Persona | Who | JTBD | Success |
| --- | --- | --- | --- |
| **Nusrat** — Fashion page owner | BD SMB / Page owner | Ads flood Messenger at night; need replies, product nudges, logged orders, no Meta Console | Connect ~2 min (when F39 Done); first reply &lt; 30s; order in Sheet/dashboard by morning |
| **Rafi** — Agency / ads operator | Runs FB ads for clients | Isolated client data, reliable inbox layer, sellable packages | Tenant A ≠ Tenant B; bot FAQ + sales nudges; human takeover for disputes; later white-label (F50) |
| **Farhana** — Growth SMB | Can’t afford full marketing team | Monthly package + bot trained on PDF/catalog | Clear deliverables; KB update without code; WhatsApp support within SLA |

**Geography:** Bangladesh first. **Language:** Landing BN primary (`lang="bn"`); bot BN-default / EN if user writes EN (Banglish/slang/typos tolerated).

---

## Business goals

1. Acquire & convert via landing + lead/WhatsApp path (P0).
2. Own Messenger AI as FaceTai software (P1).
3. Self-serve Page connect via FaceTai Connect F39 (P1.5) — **Must for true SaaS**.
4. Train & sell: KB + AI Sales Agent justifying Custom AI ৳15,000+ floor.
5. Operate without code: dashboard for chats, leads, orders, FAQ, catalog.
6. Multi-tenant schema from day one (`tenantId` on entities).
7. Monetize hybrid: SaaS monthly + service retainers + one-time setups.
8. Expand WhatsApp after Messenger is stable; IG/TG/TikTok native bots out of MVP.
9. Win BD SMB niche vs ManyChat/WATI/Botpress/HubSpot/LazyChat on BN UX, COD/order workflows, BD pricing.

### Non-goals (near term)

- Cloning competitor brands or proprietary assets.
- Building every platform bot in-house on day one.
- Claiming Meta credentials or production uptime before App Review + deploy.
- Marketing Connect / F40–F50 as fully shipped before Done criteria.
- Full self-serve billing portal in MVP (F37 is post-P2 Could).

---

## Functional requirements (current vs planned)

Status labels: **Live** = works in demo/code · **Partial** = UI/API with stubs · **Planned** = not built · **Service** = human SKU.

### Core pillars (honest status)

| Pillar | Intent | Status today |
| --- | --- | --- |
| Messenger AI | BN/EN replies, media, handoff, orders | **Live** (env tokens); Connect scaffold **Partial** |
| Omnichannel Inbox | All channels one dashboard | **Partial** — webchat **Live**; WA/IG/TG ingest stubs |
| WhatsApp AI | Same core on Cloud API | **Partial** — channel field + demo ingest only |
| KB Training | Ground replies on business knowledge | **Partial** — PDF/Excel/CSV/TXT **Live**; DOCX/Drive/Sheets/Notion **stubs** |
| Sales Agent | Recommend, follow-up, upsell/cross-sell | **Live** heuristics + recommendation engine UI |
| CRM | Leads → pipeline stages | **Live** (F43 stages) |
| Order Management | Capture → Sheet/dashboard + tracking + invoice | **Live** |
| Complaint Center | Detect → escalate → refund/exchange | **Live** (keyword detect) |
| Analytics | Revenue, leads, conversion, response time | **Partial** — thin counts |
| Workflow | IF/THEN automation | **Planned** (F49) |
| Multi-Tenant SaaS | Client isolation + self-serve connect | Schema **Live**; Connect App-Review-complete **Planned** |
| Mobile | Android/iOS + push | **Planned** (F-mobile) |

### Feature inventory (MoSCoW — selected)

| ID | Feature | Priority | Status |
| --- | --- | --- | --- |
| F01 | Marketing landing + packages + WhatsApp CTA | Must | **Live** |
| F02 | Lead capture + optional webhook | Must | **Live** (prod needs webhook/DB) |
| F03 | Meta Messenger webhook | Must | **Live** code; prod needs tokens |
| F04 | LLM/rules reply engine BN/EN | Must | **Live** (rules without AI key) |
| F06 | Human handoff silence | Must | **Live** |
| F07 | Order → Sheet webhook | Must | **Live** when URL set |
| F25 | Multi-tenant `tenantId` | Must | **Live** schema |
| F26 | Admin Dashboard | Must | **Live** `/dashboard` (+ legacy `/admin`) |
| F27–F28 | KB PDF/Excel | Must | **Live** |
| F31–F32 | Recommend + abandoned follow-up | Must | **Live** |
| F39 | FaceTai Connect (one-click) | Must | **Partial** scaffold — **do not market as live** |
| F40 | Product Catalog | Must | **Live** |
| F43 | CRM Pipeline | Must | **Live** |
| F51–F59 | FaceTai 2.0 surfaces | Must/Should | **Live** with noted stubs |
| F60 | SaaS monthly plans landing | Must | **Live** |
| F41, F45, F49, F50, F-mobile | Broadcasts, voice, workflows, WL, mobile | Should/Could | **Planned** |
| F22 | WhatsApp Cloud | Must (P2) | **Planned** live send/receive |
| F46 live sync | Ecommerce REST/Graph | Should | **Partial** (CSV/JSON import **Live**) |

Full MoSCoW table: `docs/PRD.md` §7.

---

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| **Latency** | P50 time-to-first-reply ≤ 5s (text); P95 ≤ 15s |
| **Reliability** | Webhook ACK within Meta timeout; ≥ 99% auto-replies when handoff off and LLM up |
| **Privacy** | No secrets in git; tenant isolation on every data path |
| **Tenancy** | All business entities carry `tenantId`; deny cross-tenant by default |
| **Connect (F39)** | Tokens encrypted; ~2 min happy path; no client webhook paste |
| **Retention** | Proposed: conversations 90 days; orders 24 months (Q7 open) |
| **Meta policy** | Messaging window/tags; no spammy cold outreach |
| **Language** | Landing BN; bot BN default / EN switch |
| **Hosting** | Prefer Vercel; ephemeral FS → webhooks/Postgres/object storage for prod |
| **Fair use** | No absolute “zero API/hosting”; use fair-use disclaimer |

---

## Features — surfaces that exist in the app

| Surface | Route / API | Capability |
| --- | --- | --- |
| Landing | `/` | Hero, problem, features, SaaS pricing, lead form, webchat widget |
| Dashboard | `/dashboard/*` | Ops: inbox, CRM, orders, complaints, catalog, recommendations, ecommerce, knowledge, comments, connect, team, analytics, roadmap |
| Admin-lite | `/admin` | Legacy bot config + test reply |
| Webhook | `/api/messenger/webhook` | Meta verify + inbound → pipeline |
| Webchat | `/api/webchat` | Website channel=`web` |
| Leads | `/api/leads` | Public lead capture |
| Comments | `/api/comments` | Spam / auto-reply / lead (Graph send needs tokens) |

---

## User journeys

### J1 — Prospect → lead → WhatsApp

1. Visit `/` → understand OS positioning + SaaS plans from ৳1,990.
2. Submit lead (`POST /api/leads`) or tap WhatsApp CTA (`01810-285559`).
3. Optional: chat via WebChatWidget → same store as inbox.

### J2 — Buyer messages Page (env-token / demo)

1. User messages Facebook Page.
2. Meta → `POST /api/messenger/webhook` → `handleInboundMessage`.
3. Handoff check → catalog/KB/recommend → AI or rules reply → Graph send.
4. Order intent → store + optional `ORDERS_WEBHOOK_URL`; tracking/invoice available in dashboard.

### J3 — Operator day-to-day

1. Login `/dashboard/login` (`admin@demo.facetai.local` / `ADMIN_PASSWORD` or `facetai-demo`).
2. Inbox, update CRM stages, create/track orders, print invoice, escalate complaints, edit catalog/KB.
3. Human Page reply → handoff silence until `bot on` / `এআই চালু`.

### J4 — FaceTai Connect (target — not Done)

1. Login → Connect → Login with Facebook → Select Page → Connect.
2. Auto token vault + webhook subscribe + permission check + bot activate.
3. **Marketing may claim “~2 minutes” only after F39 Done checklist.**

---

## Pricing (authoritative for sales)

### Primary SaaS monthly (FaceTai 2.0)

| Plan | Price |
| --- | --- |
| Starter | ৳1,990/mo |
| Growth | ৳4,990/mo |
| Pro | ৳9,990/mo |
| Business | ৳14,990/mo |
| Enterprise | Custom |

### Optional one-time / service

| Package | Price | Type |
| --- | --- | --- |
| Rule Based setup | ৳3,900 – ৳6,900 | Service (client tool) |
| AI Bot Setup | ৳8,000 – ৳20,000 | Service (client tool) |
| Custom AI Agent | ৳15,000 – ৳50,000+ (floor ৳15k) | Software + onboard |
| Legacy monthly retainer | ৳990 – ৳4,900 | Pure service unless upsold |

**Disclaimer (required):**  
> সাধারণ ব্যবহারের জন্য কোনো অতিরিক্ত API বা Hosting চার্জ নেই।

Do **not** use absolute “কোনো API চার্জ নেই” / “কোনো Hosting চার্জ নেই”.

---

## KPIs & success metrics

| Metric | Target (initial) |
| --- | --- |
| Landing leads / week | Track baseline; grow MoM |
| Lead → WhatsApp open rate | ≥ 40% |
| Time-to-first-reply (bot) | P50 ≤ 5s |
| Reply rate (handoff off) | ≥ 95% |
| Order capture of confirmed intents | ≥ 70% |
| Handoff correctness | ≥ 99% no bot reply within 2 min after operator |
| KB grounding (spot-check) | ≥ 90% when KB present |
| Connect success (F39) | ≥ 80% happy-path when shipped |
| Cross-tenant incidents | **0** |

---

## Future roadmap (summary)

| Wave | Focus | Key items |
| --- | --- | --- |
| **Wave B** | Self-serve + depth | F39 Connect Done, F41 broadcasts, F47 analytics, F48 live KB sources |
| **Wave C** | Platform | F42 courier tracking APIs, F44 RBAC polish, F45 voice, F46 live ecommerce, F49 workflows, F50 white-label |
| **Future** | Mobile + channels | F-mobile apps; WhatsApp Cloud live; post-P2 native IG/TG/TikTok |
| **Infra** | Production | Postgres + object storage; encrypted token vault; billing portal (F37) |

See [phases.md](./phases.md) for completion status and next priorities.

---

## Constraints

- No `.git` in workspace at last audit — treat `docs/PRD.md` + this KB as decision history until git is initialized.
- JSON file store (`data/facetai-db.json`) is **demo-local**; Vercel disk is ephemeral.
- Passwords stored plain in demo DB — must not ship as production auth.
- Dual-mode Page auth: env tokens today; Connect later; keep env demo during transition.
- Channels: Messenger first, then WhatsApp; do not claim native IG/TG/TikTok bots as FaceTai software MVP.

## Assumptions

- Primary market is Bangladesh COD + Facebook ads → Messenger.
- Hybrid software + services remains the business model.
- OpenAI-compatible API is the LLM path; rules fallback must always work without keys.
- Sales WhatsApp number `01810-285559` is the public contact unless product owner changes it.

## Honesty guardrails (non-negotiable)

1. Do **not** invent Meta App credentials or fake `m.me` links.
2. Set `NEXT_PUBLIC_MESSENGER_URL` only when a real Page exists.
3. Do **not** market “2-minute Connect” until F39 Done criteria pass.
4. Do **not** invent inventory/price outside catalog/KB.
5. Clearly label stubs vs live in UI and docs.
6. Secrets never in git; only `.env.example` with empty/placeholder values.

---

## Document map

| Need | Go to |
| --- | --- |
| System design, APIs, DB | [architecture.md](./architecture.md) |
| Colors, fonts, UI patterns | [design.md](./design.md) |
| What’s done / next | [phases.md](./phases.md) |
| How AI must code | [rules.md](./rules.md) |
| Long-term memory / never-change | [memory.md](./memory.md) |
| Full MoSCoW + AC | `docs/PRD.md` |
| Bot setup sketch | `docs/PHASE2-AI-BOT.md` (may be stale; PRD wins) |
| QA snapshot | `docs/QA-REPORT.md` (2026-07-20: 52 Pass / 0 Fail / 4 Blocked) |
