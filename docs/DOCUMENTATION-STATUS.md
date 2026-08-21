# ReplyPilot AI — Documentation Status

> **Reviewed:** 2026-08-21
> **Purpose:** Keep the large documentation set aligned with the actual repository and prevent roadmap text from being mistaken for shipped behavior.
> **Canonical execution document:** [`REAL-APPROACH.md`](./REAL-APPROACH.md)

## Source-of-truth order

1. `BUSINESS_DECISIONS.md` — frozen business/product decisions
2. `PRD.md` — product scope and acceptance criteria
3. `REAL-APPROACH.md` — current execution strategy
4. `ARCHITECTURE.md`, `API.md`, `SECURITY.md`, `AI_GUARDRAILS.md` — technical contracts
5. `handbook/*` — detailed operational/reference material
6. root guides and checklists — summaries for humans
7. `PHASE2-AI-BOT.md` — historical reference only

## Document classes

| Document | Role now | Required treatment |
|---|---|---|
| `REAL-APPROACH.md` | Canonical execution | Keep current after every milestone |
| `PRD.md` | Product authority | Status must reflect tested implementation, not file existence |
| `BUSINESS_DECISIONS.md` | Business authority | Decisions remain locked; execution status can be appended |
| `PHASES.md` | Product roadmap + milestone plan | Phase 1 is active, not merely Planned |
| `ARCHITECTURE.md` | Technical architecture | Describe the implemented Prisma/Postgres monolith as the baseline |
| `API.md` | API contract | Distinguish implemented endpoints from scaffolds |
| `SECURITY.md` | Security contract | Distinguish implemented controls from controls still requiring verification |
| `AI_GUARDRAILS.md` | Runtime policy | Treat hard rules as mandatory; mark automated coverage honestly |
| `QA-REPORT.md` | Verification evidence | Refresh after each verification wave |
| `REDESIGN-SPEC.md` | UI design reference | Do not use it to claim backend readiness |
| `UX-AUDIT-NON-TECHNICAL.md` | UX audit | Findings remain useful; implementation status must come from code/tests |
| `PHASE2-AI-BOT.md` | Historical sketch | Never use as current scope authority |
| `handbook/01-product-overview.md` | Product handbook | Sync positioning/status |
| `handbook/02-architecture.md` | Architecture handbook | Sync with real monolith/Postgres baseline |
| `handbook/03-data-model.md` | Data reference | Sync with current Prisma schema |
| `handbook/04-api-reference.md` | API reference | Sync with current route inventory |
| `handbook/05-messenger-connect.md` | Messenger/Connect operations | Separate Messenger pilot from Connect scaffold |
| `handbook/06-ai-runtime.md` | AI runtime reference | Sync with actual RAG + fallback behavior |
| `handbook/07-whatsapp-cloud-api.md` | Future channel guide | Keep clearly future/planned |
| `handbook/08-design-system.md` | UI reference | No product-status authority |
| `handbook/09-security.md` | Security handbook | Sync with security contract and verification gaps |
| `handbook/10-operations-runbook.md` | Operations | Make pilot procedures authoritative once verified |
| `handbook/11-scorecard-and-roadmap.md` | Scorecard | Use measured pilot evidence, not roadmap assumptions |
| `handbook/README.md` | Handbook index | Link to the canonical approach |
| `README.md` | Public repository entry point | Show current milestone and limitations |
| `INSTALLATION.md` | Setup guide | Must reproduce clean Postgres setup |
| `USER_GUIDE.md` | Tenant-user guide | Describe only usable dashboard flows |
| `ADMIN_GUIDE.md` | Operator guide | Include production secret/storage requirements |
| `API_GUIDE.md` | Practical API guide | Match API contract and auth behavior |
| `LAUNCH_CHECKLIST.md` | Release gate | Use pilot-ready criteria |
| `CHANGELOG.md` | History | Record this documentation reset and future releases |
| `.cursor/*.md` | AI coding context | Must point agents to `REAL-APPROACH.md` and never revive stale Phase-0 assumptions |

## Current repository reality

The codebase already contains concrete implementations for PostgreSQL/Prisma persistence, bcrypt + signed sessions, tenant-aware repositories, audit storage, knowledge indexing/retrieval, dashboard APIs, catalog/orders/leads/complaints and web/Messenger paths. The remaining work is primarily **verification, hardening, production durability and pilot acceptance**, not a new architecture rewrite.

## Mandatory status vocabulary

- **Implemented** = tested behavior.
- **Partial** = behavior exists but acceptance is incomplete.
- **Scaffold** = shape exists; not a live product promise.
- **Pilot-ready** = end-to-end controlled deployment is verified.
- **Production-ready** = pilot evidence + security/operations/rollback gates pass.
- **Planned** = not implemented.
- **Historical** = reference only.

## Documentation maintenance rule

After each engineering loop:

1. Update implementation evidence first.
2. Update `REAL-APPROACH.md` if execution order changes.
3. Update `PHASES.md` milestone status.
4. Update API/security/architecture docs for changed contracts.
5. Update handbook pages only after the canonical docs are correct.
6. Update README/checklists last.

Do not change documentation to make a feature look complete. Change status only when the code and acceptance evidence justify it.
