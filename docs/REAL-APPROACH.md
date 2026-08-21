# ReplyPilot AI — Real Implementation Approach

> **Status:** Canonical execution approach — 2026-08-21
> **Purpose:** Replace stale Phase-0 assumptions with the implementation reality of the current repository.
> **Authority:** This document describes execution order and implementation truth. `BUSINESS_DECISIONS.md` remains the authority for product/business locks; `PRD.md` remains the authority for product scope.

## 1. What the repository is now

ReplyPilot AI is no longer a Phase-0-only documentation project.

The current codebase already contains a working **PostgreSQL + Prisma application foundation** with:

- Next.js App Router + TypeScript
- PostgreSQL + pgvector schema
- Prisma repositories under `src/lib/db/*`
- bcrypt password hashing
- signed JWT session cookies
- tenant-aware persistence
- dashboard APIs and UI
- Messenger and website-chat paths
- catalog, leads, orders, complaints, comments, knowledge, analytics and audit models
- RAG indexing/retrieval with embedding API and keyword fallback
- Docker Postgres/pgvector development setup
- seed and JSON migration tooling

Therefore the correct strategy is **not another architecture rewrite** and not another documentation-only phase.

The next work is **verification → hardening → completion → production pilot**.

## 2. Current reality vs old plan

| Area | Current reality | Decision |
|---|---|---|
| Framework | Next.js monolith exists | Keep; no rewrite |
| Database | Prisma/Postgres implementation exists | Make it the only production source of truth |
| Vector search | pgvector implementation exists | Harden and verify; no new vector platform |
| Auth | bcrypt + signed JWT session exists | Security-test and harden |
| RBAC | role helpers and dashboard gates exist | Verify every mutating endpoint |
| Tenant isolation | tenant-scoped repositories/helpers exist | Prove with tests; fail closed everywhere |
| Audit | audit repository/model exists | Verify coverage of privileged mutations |
| RAG | chunk/embed/vector + keyword fallback exists | Test grounding and document limitations |
| Handoff | conversation handoff fields and dashboard path exist | Verify take/release/note semantics end-to-end |
| CRM | leads/orders/timeline models exist | Finish unified customer timeline and acceptance tests |
| Analytics | DB analytics layer exists | Verify KPI correctness against source data |
| Messenger | webhook/reply pipeline exists | Production-configure and test Meta signature/dedup behavior |
| Website chat | implemented | Harden public tenant identification and abuse controls |
| Meta Connect | demo/OAuth scaffold exists | Do not market as self-serve SaaS until production gate is proven |
| WhatsApp/Instagram/Telegram | not the MVP production target | Defer to the omnichannel wave |
| Redis/BullMQ | absent by design | Do not add until measured workload requires it |
| Microservices | absent by design | Do not introduce |

## 3. New build strategy: four waves

### Wave A — Truth and verification

Goal: establish exactly what is working before changing product behavior.

- Run install, typecheck, lint, test and production build.
- Validate Prisma schema against a clean PostgreSQL + pgvector database.
- Run seed against an empty database.
- Run JSON migration in a disposable database and verify counts/references.
- Enumerate every API route and classify authentication, role and tenant scope.
- Test webchat, Messenger webhook, bot reply, orders, leads and dashboard paths.
- Test RAG with embeddings available and unavailable.
- Produce a failing-test list instead of guessing.

**Exit:** reproducible baseline with no undocumented critical failures.

### Wave B — Production hardening

Fix only issues found by Wave A, prioritizing security and correctness:

1. tenant isolation and fail-closed resolution
2. authentication/session security
3. RBAC on every mutation
4. audit coverage
5. webhook signature and replay/dedup behavior
6. public API rate limits and abuse controls
7. secret/token handling
8. durable KB file storage
9. privacy/deletion behavior
10. error handling and observability

**Exit:** no known P0/P1 security or data-integrity defect.

### Wave C — Sales Agent pilot completion

Finish the actual MVP rather than adding new channels:

- reliable knowledge upload → extraction → chunk → embed → retrieve
- catalog-grounded recommendations
- order capture and confirmation
- complaint escalation
- human take/release/notes
- unified customer/lead timeline
- accurate home KPIs
- Prompt Builder hard rules
- seed demo and clean-install documentation
- Messenger production pilot
- website chat production pilot

**Exit:** a real Bangladesh SMB can onboard one tenant, configure knowledge/catalog, receive leads, let AI answer grounded questions, take over conversations, and inspect orders/CRM/analytics.

### Wave D — Pilot operations

Run a controlled pilot with real but bounded tenants.

Measure:

- answer latency
- grounded-answer rate
- escalation rate
- order-capture success
- false/invented fact rate
- human takeover success
- webhook failures/retries
- tenant isolation failures
- AI cost per conversation/order
- database/storage growth

Only after pilot evidence should Phase 2 features be prioritized.

## 4. Explicitly do NOT do now

- Do not rewrite Next.js into NestJS/FastAPI.
- Do not introduce Redis just because it appears in a roadmap.
- Do not build WhatsApp/Instagram/Telegram before Sales MVP acceptance.
- Do not build billing, marketplace, white-label or SSO now.
- Do not create a second database abstraction just to match old documentation.
- Do not claim Meta Connect is production-ready because a demo/OAuth scaffold exists.
- Do not treat filesystem uploads as durable production storage.
- Do not treat keyword fallback as equivalent to semantic RAG.
- Do not call a feature Current merely because a model/table/UI exists; require an end-to-end acceptance test.

## 5. Definition of Done for the current milestone

The current milestone is **Sales Agent Pilot MVP**, not "Phase 0 documentation".

It is Done only when all are true:

- [ ] Clean database can be created from repository instructions.
- [ ] Seed works on an empty database.
- [ ] Production build passes.
- [ ] All dashboard mutations enforce session + role + tenant scope.
- [ ] Cross-tenant access attempts fail closed.
- [ ] Passwords are never stored or compared as plaintext.
- [ ] Session signing fails closed when production secret requirements are not met.
- [ ] Privileged mutations create audit events.
- [ ] Knowledge documents are durable in production storage.
- [ ] RAG retrieves tenant-scoped chunks and degrades safely when embeddings are unavailable.
- [ ] AI cannot invent catalog facts, discounts or logistics.
- [ ] Human takeover silences AI until release.
- [ ] Refund/legal/serious complaint/uncertain cases escalate.
- [ ] Messenger signature verification and message deduplication are tested.
- [ ] Webchat abuse/rate limits are tested.
- [ ] CRM timeline is coherent across conversation, lead, order, complaint and notes.
- [ ] Dashboard KPIs reconcile with persisted records.
- [ ] Pilot runbook exists and rollback/secret rotation is documented.

## 6. Status language going forward

Use these definitions in every document:

- **Implemented:** code exists and has a passing automated/integration test for the stated behavior.
- **Partial:** some path exists but at least one acceptance criterion is missing.
- **Scaffold:** UI/model/route exists primarily to establish shape; do not market as a live feature.
- **Pilot-ready:** end-to-end MVP behavior is tested and deployable for controlled tenants.
- **Production-ready:** pilot evidence, security review, operational controls and rollback path are complete.
- **Planned:** intentionally not implemented yet.
- **Historical:** retained for context only; cannot override current architecture or product decisions.

Never use **Current** to mean merely "a file exists".

## 7. Documentation hierarchy

When documents disagree:

1. `docs/BUSINESS_DECISIONS.md` — business/product locks
2. `docs/PRD.md` — product scope and acceptance criteria
3. `docs/REAL-APPROACH.md` — current execution strategy
4. `docs/ARCHITECTURE.md` / `docs/API.md` / `docs/SECURITY.md` / `docs/AI_GUARDRAILS.md` — technical contracts
5. `docs/handbook/*` — operational detail
6. `README.md`, guides and checklists — user-facing summaries
7. `docs/PHASE2-AI-BOT.md` — historical material only

Code is the source of implementation truth, but undocumented behavior is not automatically a product commitment.

## 8. Next engineering sequence

1. **Baseline verification** — install/build/typecheck/lint/tests/clean DB/seed/migration.
2. **Security matrix** — auth/RBAC/tenant isolation/audit/webhooks.
3. **RAG evaluation** — retrieval quality, fallback behavior, grounding.
4. **Handoff + CRM acceptance** — take/release/notes/timeline.
5. **Analytics reconciliation** — verify every KPI against database records.
6. **Durable file storage** — remove production dependency on local filesystem for KB assets.
7. **Messenger pilot hardening** — real Meta configuration, signatures, retries, observability.
8. **Pilot release** — bounded tenants only.
9. **Post-pilot decision** — decide Phase 2 from measured gaps, not roadmap assumptions.

## 9. Relationship to the old Phase 0–5 roadmap

The Phase 0–5 roadmap remains useful as a **product horizon**, but it is no longer the daily execution plan.

Phase 1 should now be treated as an implementation/acceptance milestone already underway. Phase 2 begins only after the Sales Agent pilot proves the core loop.

---

## Evidence reviewed for this approach

The current repository was checked against its Prisma schema, database repositories, authentication implementation, RAG implementation, API surface, README and the existing product/architecture/phase documentation. The repository contains concrete Postgres, auth, audit, knowledge/RAG and dashboard foundations that the older Phase-0 status text did not reflect.
