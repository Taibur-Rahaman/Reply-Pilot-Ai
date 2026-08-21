# FaceTai — Phases & Build Order

> **Status:** Current execution roadmap — 2026-08-21  
> **Canonical execution:** [`REAL-APPROACH.md`](./REAL-APPROACH.md)  
> **Related:** [`PRD.md`](./PRD.md) · [`BUSINESS_DECISIONS.md`](./BUSINESS_DECISIONS.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> **Conflict rule:** BUSINESS_DECISIONS + PRD win on product decisions; REAL-APPROACH wins on current execution order.

Status: **Done** · **In progress** · **Planned** · **Scaffold**

---

## Executive snapshot

| Phase | Focus | Status | Real meaning |
| --- | --- | --- | --- |
| **0** | Documentation tree | **Done** | Historical foundation; no longer the active workstream |
| **1** | Sales Agent MVP | **In progress** | Postgres/auth/RAG/dashboard foundation exists; verification + hardening + pilot completion remain |
| **2** | Sales Intelligence | **Planned** | Start only after Phase 1 pilot acceptance |
| **3** | Omnichannel + Connect | **Planned** | WhatsApp/IG/TG + self-serve Connect after Sales core proves stable |
| **4** | Automation | **Planned** | Workflows/campaigns/tool actions |
| **5** | Enterprise + marketplace | **Planned** | Billing/white-label/public API/agent packs |

**Important:** Phase 1 is not a greenfield build anymore. The repository already contains a substantial implementation. The immediate job is to prove it, harden it, close the remaining acceptance gaps, and run a controlled pilot.

---

## Phase 0 — Documentation

### Status: Done / historical

The original Phase 0 established the product, business locks, architecture, security and roadmap. It should not be treated as the current implementation state.

---

## Phase 1 — Sales Agent Pilot MVP

### Status: **In progress**

### What is already implemented in the repository

- PostgreSQL + Prisma persistence
- pgvector schema and RAG implementation
- bcrypt password hashing
- signed JWT session cookies
- role helpers and dashboard authorization paths
- tenant-scoped data repositories
- audit-log model/repository and write paths
- website chat persistence
- Messenger webhook/reply pipeline
- catalog, leads, orders and complaints persistence
- knowledge upload/index/retrieval pipeline
- dashboard analytics/repository layer
- Docker Postgres/pgvector setup
- seed and JSON migration tooling

### What remains before Pilot Ready

#### Wave A — Verification

- [ ] Clean install passes `npm install`
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] Clean PostgreSQL + pgvector database can be initialized
- [ ] Seed works from empty database
- [ ] JSON migration works in disposable database
- [ ] API route inventory is verified against actual source

#### Wave B — Security and data-integrity hardening

- [ ] Every dashboard mutation checks session + role + tenant
- [ ] Cross-tenant access tests fail closed
- [ ] Webhook page-to-tenant resolution fails closed rather than silently falling back to the demo tenant
- [ ] Session secret production requirements are verified
- [ ] Privileged changes have audit coverage
- [ ] Public endpoints have tested abuse/rate-limit behavior
- [ ] Meta signature verification is required/configured for production
- [ ] Page/access tokens are protected appropriately for production
- [ ] KB assets are moved from ephemeral local filesystem to durable production storage
- [ ] Privacy/delete behavior is verified

#### Wave C — Sales Agent acceptance

- [ ] KB upload → extraction → chunk → embedding → retrieval works end-to-end
- [ ] Keyword fallback is clearly identified as degraded mode, not equivalent to vector RAG
- [ ] Catalog recommendations are grounded in tenant catalog
- [ ] Order confirmation and persistence are reliable
- [ ] Refund/legal/serious complaint/uncertain cases escalate
- [ ] Human take silences AI until release
- [ ] Human release returns control to AI
- [ ] Agent notes become CRM timeline events
- [ ] Unified customer/lead timeline is coherent
- [ ] Dashboard KPIs reconcile with database records
- [ ] Prompt Builder hard rules cannot be overridden by personality text

#### Wave D — Controlled pilot

- [ ] One tenant can onboard without developer database editing
- [ ] One tenant can configure catalog + knowledge + bot behavior
- [ ] Website chat works in production
- [ ] Messenger works with real Meta configuration
- [ ] Observability covers webhook errors, AI errors and database failures
- [ ] Rollback and secret rotation procedures are tested
- [ ] Pilot metrics are recorded

### Phase 1 exit criteria

Phase 1 is **Pilot Ready** only when all P0/P1 items above pass. It becomes **Production Ready** only after controlled pilot evidence is positive.

---

## Phase 2 — Sales Intelligence

### Status: Planned

Only start after Phase 1 pilot acceptance.

### Objectives

- Lead scoring
- richer customer memory fields
- policy-safe follow-up scheduler
- intent / sentiment / objection handling
- playbooks and personalities
- measured AI cost controls

### Redis rule

Do not add Redis just because follow-up exists on the roadmap. Add a queue only when measured job volume or webhook load exceeds the safe request-path capacity.

---

## Phase 3 — Omnichannel

### Status: Planned / Connect scaffold exists

### Objectives

- WhatsApp Cloud API
- Instagram and/or Telegram adapters
- unified inbox hardening
- production self-serve Meta Connect

### Gate

Do not market "Connect in ~2 minutes" until the actual OAuth/Page selection/subscription path is tested against a real test Page and tenant isolation is verified.

---

## Phase 4 — Automation

### Status: Planned

### Objectives

- workflow builder
- campaigns
- email/SMS
- richer tenant-scoped tool actions

### Gate

Every workflow and tool action must be tenant-scoped, permission-checked and audited.

---

## Phase 5 — Enterprise

### Status: Planned

### Objectives

- hard multi-tenant isolation review
- usage metering and billing
- white-label
- public API and signed webhooks
- SSO/compliance hardening
- agent marketplace / installable domain packs

### Gate

Enterprise work starts only after the core Sales Agent has real pilot evidence and operational controls.

---

## Capacity trigger — when to add Redis

| Trigger | Action |
| --- | --- |
| Phase 1 | **Do not add Redis** |
| Follow-up/campaign jobs exceed safe request-path capacity | Add Redis + worker |
| Webhook fan-out creates ACK/time-out pressure | Queue after verification/signature |
| Single-instance cron is sufficient | Prefer the simpler solution |

---

## Engineering order from this point

1. Baseline verification
2. Security / tenant isolation matrix
3. RAG evaluation
4. Handoff + CRM acceptance
5. Analytics reconciliation
6. Durable file storage
7. Messenger pilot hardening
8. Controlled pilot
9. Phase 2 decision from measured gaps

---

## Version history

| Date | Notes |
| --- | --- |
| 2026-07-26 | Phase 0 roadmap authored |
| 2026-08-21 | Rebased execution status on actual repository implementation; Phase 1 is now In Progress with verification/hardening/pilot waves |
