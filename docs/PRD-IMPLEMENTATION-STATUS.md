# PRD Implementation Status Overlay

> **Reviewed:** 2026-08-21
> **Applies to:** [`PRD.md`](./PRD.md)
> **Purpose:** The PRD remains the product-scope authority, while this file prevents its older 2026-07-26 implementation snapshot from being mistaken for today's code status.

## Current status

The product scope in PRD v3.0 remains valid. Its implementation snapshot is stale in several rows because the repository has since added the Postgres/auth/RAG/audit/dashboard foundation.

### Reclassification

| PRD area | Old snapshot | Current reality |
|---|---|---|
| Multi-tenant persistence | Partial JSON | **Postgres/Prisma implemented**; isolation verification remains |
| PostgreSQL + pgvector | Planned | **Implemented** |
| Auth | Partial/demo | **bcrypt + signed JWT implemented**; production verification remains |
| RBAC | Partial | **Role helpers/dashboard gates implemented**; endpoint matrix verification remains |
| Website chat | Current | **Implemented**; public tenant/embed hardening remains |
| Messenger | Current | **Implemented**; real production configuration and security gate remain |
| Catalog | Current | **Postgres-backed implementation** |
| Orders/invoices | Current | **Postgres-backed implementation** |
| Complaints | Partial | **Implemented foundation**; end-to-end escalation acceptance remains |
| Knowledge/RAG | Planned/partial | **Chunk/embed/vector + keyword fallback implemented**; quality and durable storage remain |
| Prompt Builder | Partial | **Bot config/guardrail fields implemented**; complete hard-rule acceptance remains |
| Human handoff | Partial | **Implemented foundation**; take/release/notes acceptance remains |
| CRM | Partial | **Leads/timeline foundations exist**; unified customer journey acceptance remains |
| Analytics | Partial | **Analytics repository/UI exists**; KPI reconciliation remains |
| Audit logs | Planned | **Model/repository/write paths exist**; coverage verification remains |
| Connect | Partial | **Scaffold/OAuth shape**; not production SaaS-ready |
| WhatsApp/IG/TG | Planned | Still planned |
| Workflows/billing/marketplace | Planned | Still planned |

## Product milestone interpretation

The current product milestone is:

> **Sales Agent Pilot MVP — In Progress**

This means the core implementation exists, but the system is not automatically considered production-ready. The remaining work is acceptance, security hardening, durable storage, operational verification and controlled pilot evidence.

## Important scope rule

Do not update the product roadmap merely because an implementation exists. A feature moves from Planned/Partial to Implemented only when its stated acceptance behavior is verified.

Do not add Phase 2/3/4/5 functionality to the current milestone simply because the codebase contains a scaffold or data model for it.

## Related canonical documents

- [`REAL-APPROACH.md`](./REAL-APPROACH.md) — execution order
- [`DOCUMENTATION-STATUS.md`](./DOCUMENTATION-STATUS.md) — documentation hierarchy
- [`PHASES.md`](./PHASES.md) — milestone gates
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — actual architecture baseline
- [`API.md`](./API.md) — route contracts
- [`SECURITY.md`](./SECURITY.md) — security gates
- [`AI_GUARDRAILS.md`](./AI_GUARDRAILS.md) — runtime safety policy
