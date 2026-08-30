# ReplyPilot AI — Implementation Audit

> **Date:** 2026-08-21  
> **Branch:** `feat/sales-mvp-pilot-readiness`  
> **Method:** Source, Prisma schema, runtime paths, and tests — not roadmaps.  
> **Scope:** Sales Agent MVP (website chat + Messenger). Phase 2+ channels were not treated as gaps.

Statuses: **VERIFIED** · **PARTIAL** · **BROKEN** · **MISSING** · **DOC-ONLY**

Working-tree note: 72 backend files were deleted on disk versus `main` and have been restored from `HEAD` so this audit could run. Uncommitted WIP (Telegram schema/UI, Docker, encryption tests) was kept and is classified below — Telegram is **out of Sales MVP scope**.

---

## Priority list

### P0 — blocks a real Sales MVP pilot

1. Unknown Meta Page IDs fall through to the demo tenant (cross-tenant data leak).
2. Messenger sends ignore per-Page tokens and use one global env token.
3. `x-admin-password` injects a full admin session on every dashboard API.
4. RBAC is not enforced on most mutating dashboard routes.
5. No automated cross-tenant isolation tests.
6. LLM output is not grounded — can invent price / stock / discount / tracking.
7. Explicit “talk to a human” and unclear order-dispute handoff are missing.
8. Website chat skips guardrails and handoff.
9. Knowledge uploads live on ephemeral local disk.
10. Dashboard home loads full CRM tables to compute attention counts.
11. Webhook `mid` dedupe is check-then-insert (race on Meta retry).
12. No Prisma migration history (`db push` only).
13. Guardrail / handoff / Messenger / analytics regression tests missing or broken.
14. Page tokens stored in plaintext; `crypto.ts` referenced but absent.
15. Production build / `npm test` must pass; Telegram tests import missing modules.

### P1 — important before or around pilot

- Session revocation (`sessionVersion`).
- Login email disambiguation when the same email exists in two tenants.
- Login / FAQ / catalog audit coverage + audit read API.
- Conversation history in the LLM prompt (multi-turn).
- Fast webhook ACK (`after()` / job drain) so Meta does not time out.
- Vector (HNSW) index on `KbChunk.embedding`.
- Graph send retries; token expiry detection.
- Connect: long-lived token, `subscribed_apps`, page picker (operator env-token mode can still pilot).
- Password policy, lockout, MFA.
- CI workflow.

### P2 — post-pilot

- Durable Postgres `Job` worker (schema exists; Redis still deferred).
- Sender block-list (schema + UI exist; API missing).
- `AiUsageDaily` replacing in-memory LLM budget.
- Comment Graph live actions.
- Ecommerce live sync.
- Observability (metrics, tracing, error tracking).

### P3 — future (do not start)

- WhatsApp Cloud API, Instagram, Telegram, billing, marketplace, white-label, SSO, workflow builder, additional agent packs.

---

## Audit table

| Area | Status | Evidence | Problem | Required action |
|------|--------|----------|---------|-----------------|
| package.json / scripts | PARTIAL | `package.json` scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `seed`, `db:*`. Also `worker` and `db:encrypt-tokens`. | `scripts/worker.ts` and `scripts/encrypt-tokens.ts` are missing. | P0: add encrypt-tokens. Stub worker (Telegram/job drain is P2). |
| Prisma schema | PARTIAL | `prisma/schema.prisma` — Postgres + `vector` extension; `tenantId` on business rows; FKs + cascade. WT adds `Job`, `BlockedSender`, `TelegramConnection`, `AiUsageDaily`, `BotConfig.botEnabled`. | Schema ahead of application code for Telegram/jobs/blocks/usage. | Keep extra models (do not delete WIP). Do not implement Telegram. Wire `botEnabled`. |
| Migrations | MISSING | No `prisma/migrations/`. README/Docker use `prisma db push`. | Clean-DB reproducibility and prod cutover are unversioned. | P0: initial migration from schema. Document `db push` for existing DBs. |
| Seed | VERIFIED | `scripts/seed.ts` + `src/lib/db/seed.ts`. Prod refuses without `SEED_CONFIRM=yes`. Demo catalog gated by `SEED_DEMO_CONTENT`. Upserts, no truncate. | — | Keep. |
| JSON store fallback | VERIFIED | `src/lib/db/store.ts` — “JSON store removed”. No `withDb`. `data/facetai-db.json` only used by `scripts/migrate-json.ts`. | `docs/ARCHITECTURE.md` still says JSON is “today”. | Docs sync. Do not delete migrate-json. |
| Prisma client / DATABASE_URL | VERIFIED | `src/lib/db/prisma.ts`; `instrumentation.ts` requires `DATABASE_URL`. Health: `SELECT 1`. | — | — |
| pgvector RAG | VERIFIED | `src/lib/db/rag.ts` — embed, `embedding <=> $1::vector`, `WHERE tenantId`, keyword fallback. | No HNSW index (P1). Source attribution is chunk index only. | Keep; index later. |
| Authentication (hash + JWT) | VERIFIED | bcrypt cost 10, reject non-`$2` hashes. JWT HS256 `jose`, httpOnly cookie, 14d TTL, `secure` in prod, no unsigned fallback, role allow-list. Tests: `tests/auth.security.test.mts`. | — | Protect these tests. |
| Session logout invalidation | MISSING | `src/app/api/auth/logout/route.ts` clears cookie only. | Stolen JWT valid until `exp`. | P1: `sessionVersion`. |
| ADMIN_PASSWORD header back door | BROKEN | `getSessionFromRequest` (`src/lib/db/auth.ts`) treats `x-admin-password` as demo admin on **all** APIs. | Anyone with `ADMIN_PASSWORD` bypasses login. | P0: remove header session injection. |
| Login email vs tenant | BROKEN | `authenticateUser` `findFirst({ email })`. Schema `@@unique([tenantId, email])`. | Same email in two tenants is non-deterministic. | P0: `findMany` + optional tenant slug; 409 if ambiguous. |
| Production env validation | PARTIAL | `instrumentation.ts` requires `DATABASE_URL`, prod `SESSION_SECRET`, prod `ADMIN_PASSWORD`. Secret length ≥32 in `auth.ts`. | `TOKEN_ENCRYPTION_KEY` documented required, not validated. | P0: warn/require when encrypting tokens. |
| RBAC | PARTIAL | Roles `admin/manager/moderator/agent`. Gated: chats PATCH, knowledge `save_config` (agent blocked), team POST, super-admin email. | Agent can mutate catalog, ecommerce keys, orders, Connect, KB upload, comment settings. `requireSession` unused. | P0: policy helper on every mutating route. Super-admin stays email-gated (not a DB role). |
| Super-admin | VERIFIED | `/api/admin/tenants` requires `session.email === SUPER_ADMIN_EMAIL`. Tenant `admin` cannot list/disable others. | — | — |
| Tenant isolation (dashboard) | VERIFIED | Dashboard routes use `session.tenantId`. Entity getters `where: { id, tenantId }`. | Webhook unmapped Page → `tenant_demo`. Public APIs fall back to demo tenant by design (`resolvePublicTenantId`). | P0: refuse unmapped Pages. Tests for cross-tenant reads. |
| GAP-36 default tenant leak | BROKEN | `resolveTenantIdForPage` returns `DEFAULT_TENANT_ID` when page missing (`auth.ts`). Used in `pipeline.ts`. | Unknown Page reads demo catalog/KB and may reply as demo shop. | P0: return `null`; skip reply. Env dual-mode only if `META_PAGE_ID` matches. |
| API routes exist | VERIFIED | Auth, webchat, Messenger webhook, dashboard CRM, connect, health, bot/reply, leads, orders, comments. | `/api/dashboard/telegram` UI-called, no route (Phase 3). | Do not implement Telegram. |
| Webchat | PARTIAL | `src/app/api/webchat/route.ts` — persist `channel=web`, RAG, LLM. Rate-limited. Tenant via `resolvePublicTenantId`. | No handoff, no escalation, no grounding validation, no conversation history. | P0: share Sales pipeline (guardrails + handoff). |
| Messenger webhook verify | VERIFIED | GET hub challenge. POST HMAC SHA256 `timingSafeEqual`. Prod requires `META_APP_SECRET`. | Dev allows unsigned if secret unset (intentional). No timestamp freshness (P1). | Keep. Add tests. |
| Messenger send pipeline | PARTIAL | `handleInboundMessage` ordered ladder; persist inbound; Graph `me/messages`. | All `send*` omit page token → `META_PAGE_ACCESS_TOKEN`. Sync await (Meta timeout risk). | P0: resolve+pass per-Page token; ACK via `after()`. |
| Event deduplication | PARTIAL | `messageExistsByMid` then `appendMessage`. | TOCTOU on concurrent retries. | P0: unique `(tenantId, mid)` + catch P2002. |
| Conversations / messages | VERIFIED | `Conversation` unique `(tenantId,pageId,senderId,channel)`. Messages tenant+conversation scoped. | — | — |
| Leads | PARTIAL | Tenant-scoped CRUD + CRM stages validated against `CRM_STAGES`. | Stage change does not write timeline. Lead notes not patchable. | P0: timeline on stage change. |
| Orders | VERIFIED | Tenant-scoped store/list/update; tracking from DB fields; invoice HTML. `formatTrackingReply` omits tracking # if empty. | `qty` is String (low). | Keep. |
| Catalog | VERIFIED | Product CRUD tenant-scoped. Prompt catalog from DB. | RBAC missing on mutate. | P0: manager+ to mutate. |
| Complaints | VERIFIED | Create from pipeline + dashboard; tenant-scoped. High/urgent → handoff. | No FK to conversation/lead. | P1 optional FKs. |
| Human handoff | PARTIAL | Echo → handoff. Dashboard take/leave. Pre-LLM refund/legal/angry. Post-LLM re-check on main text path. | No explicit-human regex. Low-confidence uses constants ≥ 0.7 so it never fires. Image path skips re-check. Webchat ungated. | P0: human + dispute triggers; grounding-based confidence; re-check all send paths; webchat. |
| Knowledge base | PARTIAL | FAQ CRUD; upload extract; chunk 800/100; embed; retrieve. Stubs for crawl/Drive/Notion. | Files at `data/uploads/{tenantId}/` (ephemeral). No delete of stored bytes API. | P0: persist file bytes in Postgres; delete removes row+chunks. |
| Embeddings / retrieval | VERIFIED | Tenant filter on vector SQL and keyword fallback. 30s embed timeout → keyword. | Attribution weak. | P1 polish. |
| Prompt builder | PARTIAL | `BotConfig` personality + `guardrailRules` JSON. Dashboard save_config. `buildSystemMessage` injects rules. | Soft prompt cannot be proven to override without output validation. `botEnabled` in schema/UI not persisted in `saveBotConfig`. | P0: persist `botEnabled`; post-LLM grounding. |
| AI guardrails | PARTIAL | Prompt lines + keyword escalation. Tracking/orders from DB before LLM. | No post-LLM validation. Rules fallback can still emit demo FAQ prices. | P0: `validateGroundedReply` + adversarial tests. |
| LLM provider | VERIFIED | OpenAI-compatible client; 30s timeout; 429 retry; rules fallback; budget helper. | In-memory daily cap resets on deploy (`AiUsageDaily` unused). | P1: persist usage. |
| Analytics | PARTIAL | `getAnalyticsSummary` uses `count`/`groupBy`/`SUM`. Tenant-scoped. | `/api/dashboard/summary` still `listLeads/Orders/Products/Conversations` unbounded. Home counts handoffs by loading all chats. Conversion = orders/leads. AI cost is heuristic. No qualified-leads / handoff KPI in SQL. | P0: SQL-only summary KPIs; add handoffs, qualified leads, response volume. |
| Audit logs | PARTIAL | Writer used for config, KB upload, handoff, team create, tenant disable, operator echo. | No login events. No list API. FAQ/catalog changes unaudited. | P0: login success/failure audit. P1: read API. |
| Dashboard UI | PARTIAL | App shell + inbox, knowledge, leads, orders, complaints, catalog, team, connect, analytics pages. | Some UI (Telegram, block sender, botEnabled) ahead of API. | Do not ship Telegram. Wire botEnabled. Ignore block until P2. |
| File upload / storage | BROKEN | `storeKbUpload` writes `process.cwd()/data/uploads/...`. Docker prod volume exists; Render/Vercel disk is ephemeral. Extracted text already in Postgres. | Original files (and re-extract) lost on ephemeral hosts. | P0: `KbDocument.fileContent` BYTEA as durable store. Disk optional cache. |
| Rate limiting | VERIFIED | In-memory per IP: login, leads, orders, comments, webchat, bot/reply. 429 + Retry-After. | Resets per process; not multi-instance. Redis deferred. | Acceptable for pilot. |
| Error handling | VERIFIED | Route try/catch; friendly errors; webhook 401 on bad signature; health 503. | — | — |
| Tests | BROKEN | `tests/auth.security.test.mts` (HEAD) passes conceptually. Untracked `multitenant.send.test.mts` imports missing `crypto`. `telegram.test.mts` imports missing `telegram`. No pipeline/RBAC/isolation/grounding tests. No CI. | `npm test` fails on missing modules. | P0: crypto + Messenger token tests; isolation/RBAC/guardrail/handoff/webhook tests. Defer Telegram tests (Phase 3). |
| CI | MISSING | No `.github/`. | Tests not gated on PR. | P1. |
| Production build | NOT VERIFIED | Scripts exist; not re-run until P0 land. `next.config.ts` restored from HEAD. | Was deleted in WT. | Run `lint` / `typecheck` / `test` / `build` after P0. |
| Docker / deploy | PARTIAL | `docker-compose.yml` pgvector. Untracked `Dockerfile`, `docker-compose.prod.yml`, Caddy. Prod compose runs `npm run worker`. | Worker file missing. | P0: no-op worker with honest log so compose does not crash. |
| Messenger Connect | PARTIAL | OAuth callback stores **first** page token plaintext, status `pending`, no `subscribed_apps`. Demo Connect exists. | Not “connect in 2 minutes”. Env-token dual-mode is the pilot path. | P1 for self-serve Connect. Pilot: env token + `META_PAGE_ID`. |
| CRM timeline | PARTIAL | `getUnifiedCustomerTimeline` merges events + messages/orders/complaints. Handoff/notes/messages/orders/leads-create write events. | Stage change silent. | P0: append on stage change. |
| Rate limits vs docs | VERIFIED | Matches `docs/API.md` in-memory description. | — | — |

---

## What is actually implemented (honest)

PostgreSQL + Prisma is the runtime store. Dashboard APIs are session-gated and tenant-scoped. Passwords are bcrypt; sessions are signed JWTs. Messenger signature verification, inbound persistence, a real decision ladder, tenant-scoped pgvector RAG, catalog-in-prompt, keyword refund/legal/angry escalation, dashboard take/leave, and SQL analytics aggregations all exist in code.

## What is partial

Handoff (Messenger only; missing human-request). Guardrails (prompt + keywords, not output validation). Analytics (SQL module vs summary/home loading tables). KB (chunks in Postgres, files on disk). Messenger send (works for one env token, not per tenant). RBAC (stored, thinly enforced). Audit (write-only, incomplete events). Connect (scaffold).

## What is broken

Unmapped Page → demo tenant. Global Meta send token. Admin password header = full session. Low-confidence handoff never fires. `botEnabled` / Telegram / block-sender UI without backend. Tests importing missing modules. Working tree had deleted the entire backend (restored from `main` for this audit).

## What is missing

Prisma migrations, durable KB blobs, post-LLM grounding, explicit-human handoff, webchat safety, cross-tenant tests, token encryption module, session revocation, CI, Telegram/WhatsApp/Instagram (correctly not in MVP).

## Documentation-only

`docs/ARCHITECTURE.md` “today = JSON file”. `.cursor/memory.md` JSON store. PHASES.md “Phase 1 Planned” while code already contains most of Phase 1. Handbook GAP list is largely accurate versus `main`. Crawl/Drive/Notion KB actions are stubs.

---

## After operational verification (2026-08-31)

Branch `feat/sales-mvp-pilot-readiness` — P0 code landed; operational verification pass completed against live Docker Postgres.

| Criterion | Status |
|-----------|--------|
| PostgreSQL runtime | **VERIFIED** |
| Migrations from clean DB | **VERIFIED** (`facetai_verify`) |
| Tenant isolation tests | **VERIFIED** (48-suite, 0 skip with DB up) |
| RBAC tests | **VERIFIED** (unit) |
| Auth production-safe | **PARTIAL** (header back door removed; no session revocation; login-failure audit gap) |
| Audit logging | **PARTIAL** (write path verified; no read API; no failure row) |
| RAG tenant-scoped | **PARTIAL** (keyword verified; embed optional) |
| Catalog grounding | **VERIFIED** (unit + webchat) |
| Adversarial guardrail tests | **VERIFIED** |
| Handoff stops AI | **VERIFIED** (webchat E2E; Messenger live **BLOCKED**) |
| Durable KB storage | **VERIFIED** (`fileContent` in Postgres) |
| Webchat pipeline | **VERIFIED** (`scripts/verify-webchat.mts` 10/10) |
| Messenger live path | **BLOCKED** (no Meta send credentials) |
| Production build | **VERIFIED** |
| Critical tests | **VERIFIED** (48 passed, 0 failed, 0 skipped) |

Full matrix: [`PILOT-READINESS-REPORT.md`](./PILOT-READINESS-REPORT.md). **Not pilot ready** until Messenger gate clears.

---

## After P0 implementation (2026-08-21)

Code for the P0 list landed on `feat/sales-mvp-pilot-readiness`. Initial automated tests: **42 passed**, **1 skipped** (Postgres unreachable). Superseded by 2026-08-31 verification above.

Statuses in the audit table above describe **pre-P0** `main` unless updated in [`PRD-IMPLEMENTATION-STATUS.md`](./PRD-IMPLEMENTATION-STATUS.md).
