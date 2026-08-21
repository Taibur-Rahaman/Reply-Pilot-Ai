# Cursor Execution Rules — ReplyPilot AI

Read `docs/REAL-APPROACH.md` before implementing new work.

## Current milestone

**Sales Agent Pilot MVP — In Progress.**

The repository already has a Next.js + Prisma/Postgres monolith, signed sessions, RBAC helpers, tenant-scoped repositories, audit storage, RAG, dashboard APIs, webchat and Messenger foundations.

## Do not restart architecture

- Do not migrate to NestJS/FastAPI.
- Do not add Redis unless measured capacity requires it.
- Do not build WhatsApp/Instagram/Telegram before Sales MVP acceptance.
- Do not build billing/marketplace/white-label/SSO now.
- Do not create duplicate APIs just because an old roadmap lists them.

## Implementation rule

Before changing code:

1. Inspect the existing route/repository/model.
2. Confirm whether the behavior is missing, partial, broken or already implemented.
3. Prefer extending the current implementation over parallel abstractions.
4. Add/adjust tests for the acceptance behavior.
5. Update canonical docs only after implementation evidence exists.

## Status vocabulary

- Implemented = tested behavior.
- Partial = incomplete acceptance.
- Scaffold = shape only; not a product promise.
- Pilot-ready = controlled end-to-end acceptance passes.
- Production-ready = pilot evidence + security + operations + rollback gates pass.
- Planned = intentionally not implemented.

## Priority order

1. Tenant isolation / security
2. Auth + RBAC
3. Auditability
4. RAG grounding
5. Handoff + CRM
6. Analytics correctness
7. Durable KB storage
8. Messenger/webchat pilot reliability
9. Controlled pilot
10. Phase 2 only after pilot evidence

## Canonical documentation

- `docs/BUSINESS_DECISIONS.md` — business locks
- `docs/PRD.md` — product scope
- `docs/REAL-APPROACH.md` — current execution
- `docs/PHASES.md` — milestone gates
- `docs/ARCHITECTURE.md` — architecture
- `docs/API.md` — API contracts
- `docs/SECURITY.md` — security gates
- `docs/AI_GUARDRAILS.md` — runtime rules
- `docs/DOCUMENTATION-STATUS.md` — documentation hierarchy

`docs/PHASE2-AI-BOT.md` is historical and must not expand current scope.
