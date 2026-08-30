# PRD vs implementation status

> Updated 2026-08-31 from code + tests + [`pilot/readiness-report.md`](../pilot/readiness-report.md).  
> Distinguish **IMPLEMENTED** (code exists) · **TESTED** (automated) · **PRODUCTION-READY** (verified on real infra).

| Capability | Implemented | Tested | Production-ready | Notes |
| --- | --- | --- | --- | --- |
| Postgres runtime (Prisma) | yes | yes | **VERIFIED** | Live Docker Postgres on 5433 |
| Migrations from empty DB | yes | yes | **VERIFIED** | `facetai_verify` + `migrate deploy` |
| Auth (bcrypt + JWT cookie) | yes | yes | **PARTIAL** | No session revocation; login-failure audit gap |
| RBAC on mutating APIs | yes | yes (unit) | **PARTIAL** | Policy in `src/lib/rbac.ts` |
| Tenant isolation (dashboard) | yes | yes (Postgres) | **VERIFIED** | Expanded isolation suite |
| Unmapped Messenger Page refuse | yes | yes (unit) | **PARTIAL** | Live unknown-Page webhook not run |
| RAG tenant-scoped pgvector | yes | partial | **PARTIAL** | Keyword path verified; embed API optional |
| Catalog grounding | yes | yes | **VERIFIED** | Unit + webchat E2E |
| Human handoff | yes | yes | **VERIFIED** | Webchat E2E escalation cases |
| CRM timeline | yes | no | **PARTIAL** | Stage changes append events |
| Analytics SQL KPIs | yes | partial | **PARTIAL** | Tenant-scoped SQL counts |
| Messenger webhook HMAC | yes | yes | **PARTIAL** | Live Meta send **BLOCKED** (no creds) |
| Webhook mid dedupe | yes | partial | **VERIFIED** | Unique `(tenantId, mid)` on DB |
| Durable KB bytes in Postgres | yes | yes | **VERIFIED** | `tests/kb-storage.test.mts` |
| Webchat Sales pipeline | yes | yes | **VERIFIED** | `scripts/verify-webchat.mts` 10/10 |
| Rate limits | yes | no | **PARTIAL** | In-memory, single process |
| Telegram / WhatsApp / IG | no | n/a | no | Out of Sales MVP |
| Billing / SSO / marketplace | no | n/a | no | Out of Sales MVP |

**Pilot verdict:** **NOT PILOT READY** until Messenger gate unblocks (Meta credentials) and remaining PARTIAL items are accepted or closed.

Authoritative narrative: [`implementation-audit.md`](./implementation-audit.md) · Gates: [`../pilot/readiness-report.md`](../pilot/readiness-report.md) · Operator steps: [`../pilot/runbook.md`](../pilot/runbook.md) · **Next work:** [`../pilot/NEXT.md`](../pilot/NEXT.md).
