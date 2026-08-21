# PRD vs implementation status

> Generated 2026-08-21 from source + tests. Not a roadmap.  
> Distinguish **IMPLEMENTED** (code exists) · **TESTED** (automated) · **PRODUCTION-READY** (verified on real infra).

| Capability | Implemented | Tested | Production-ready | Notes |
| --- | --- | --- | --- | --- |
| Postgres runtime (Prisma) | yes | partial | **NOT VERIFIED** (no live DB this pass) | JSON store is migration-only |
| Migrations from empty DB | yes (initial SQL) | no | **NOT VERIFIED** | Existing DBs may still use `db push` |
| Auth (bcrypt + JWT cookie) | yes | yes | **PARTIAL** | No server-side session revocation |
| RBAC on mutating APIs | yes | yes (unit) | **PARTIAL** | Policy table in `src/lib/rbac.ts` |
| Tenant isolation (dashboard) | yes | skipped without Postgres | **NOT VERIFIED** | Cross-tenant repo test exists |
| Unmapped Messenger Page refuse | yes | yes (missing pageId) | **PARTIAL** | Needs live unknown-Page webhook |
| RAG tenant-scoped pgvector | yes | no (needs DB) | **PARTIAL** | Keyword fallback if embed fails |
| Catalog grounding | yes | yes (adversarial unit) | **PARTIAL** | Prompt + pre/post validators |
| Human handoff | yes | yes (keyword unit) | **PARTIAL** | Webchat now shares pipeline |
| CRM timeline | yes | no | **PARTIAL** | Stage changes now append events |
| Analytics SQL KPIs | yes | no | **PARTIAL** | Summary no longer loads full tables |
| Messenger webhook HMAC | yes | yes | **PARTIAL** | Live Meta send **NOT VERIFIED** |
| Webhook mid dedupe | yes | no (needs DB unique) | **PARTIAL** | Unique `(tenantId, mid)` |
| Durable KB bytes in Postgres | yes | no | **PARTIAL** | Disk is cache only |
| Rate limits | yes | no | **PARTIAL** | In-memory, single process |
| Telegram / WhatsApp / IG | no | n/a | no | Out of Sales MVP |
| Billing / SSO / marketplace | no | n/a | no | Out of Sales MVP |

Authoritative narrative: [`IMPLEMENTATION-AUDIT.md`](./IMPLEMENTATION-AUDIT.md) · Pilot steps: [`PILOT-RUNBOOK.md`](./PILOT-RUNBOOK.md).
