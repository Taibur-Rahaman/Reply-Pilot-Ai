# Pilot Readiness Report — Sales MVP

> **Date:** 2026-08-31  
> **Branch:** `feat/sales-mvp-pilot-readiness`  
> **Commit baseline:** post-`732ed97` operational verification pass  
> **Verdict:** **NOT PILOT READY** — Messenger live path is **BLOCKED** (no Meta send credentials). Do not use “pilot ready” until every mandatory gate is **VERIFIED**.

Statuses used in this report: **VERIFIED** · **PARTIAL** · **BLOCKED** · **BROKEN** · **NOT VERIFIED**

---

## Acceptance matrix (A–O)

| Section | Status | Evidence |
|---------|--------|----------|
| **A. Environment** | **VERIFIED** | Docker Desktop + `facetai-postgres` healthy on host port **5433**; `DATABASE_URL` set in `.env.local` (credentials not logged). Node ≥20. |
| **B. Database** | **VERIFIED** | `SELECT 1` via Prisma; seed completes (`tenant_demo`, 6 products with `SEED_DEMO_CONTENT=true`). |
| **C. Migration** | **VERIFIED** | Clean DB `facetai_verify`: `prisma migrate deploy` applied `20260821120000_init`; `migrate diff` → no drift. Existing `facetai` baselined via delta SQL + `migrate resolve`. pgvector 0.8.6; `KbDocument.fileContent`; unique `(tenantId, mid)`. |
| **D. Tenant isolation** | **VERIFIED** | `tests/tenant-isolation.test.mts` — read/mutate/dashboard API + super-admin gate against real Postgres. |
| **E. Auth / RBAC** | **PARTIAL** | bcrypt + JWT cookie; RBAC unit tests pass; login success audited. Login **failure** not written (AuditLog FK requires tenant). No server-side session revocation. |
| **F. RAG** | **PARTIAL** | Tenant-scoped `KbChunk` + keyword fallback verified (`tests/kb-storage.test.mts`). Vector embed path not exercised (no `OPENAI_API_KEY` / `AI_API_KEY`). No HNSW index. |
| **G. Guardrails** | **VERIFIED** | `tests/guardrails.test.mts` — pre/post LLM grounding, invented price/discount/refund rejection. |
| **H. Handoff** | **VERIFIED** | Webchat E2E: refund → `escalate_refund`, human → `escalate_human_requested`, dispute → `escalate_order_dispute`. Messenger live handoff **NOT VERIFIED** (Meta blocked). |
| **I. Webchat** | **VERIFIED** | `scripts/verify-webchat.mts` — **10/10** cases against `POST /api/webchat` + real Postgres (rules/grounding path, no LLM key). Romanized price ask fix in `rulesReply` (`koto`/`dam`). |
| **J. Messenger** | **BLOCKED** | `META_VERIFY_TOKEN` present; **`META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID` absent**. No live webhook/send verification performed (by design). |
| **K. KB storage** | **VERIFIED** | `KbDocument.fileContent` in Postgres; upload → extract → chunk → retrieve without disk (`tests/kb-storage.test.mts`). Disk is cache only. |
| **L. Audit** | **PARTIAL** | Rows written: `auth.login_success`, `config.bot_update` (`tests/audit-log.test.mts`). No `auth.login_failure` row; no dashboard audit read API. |
| **M. Tests** | **VERIFIED** | `npm test`: **48 passed, 0 failed, 0 skipped** (with Postgres up). |
| **N. Build** | **VERIFIED** | `npm run typecheck`, `npm run lint` (0 errors, 5 pre-existing warnings), `npm run build` pass. |
| **O. Remaining blockers** | — | See below. |

---

## O. Remaining blockers

1. **Messenger live path** — Meta app secret + page token + page ID required for pilot on Facebook.
2. **Login-failure audit** — schema requires `tenantId`; failed login has no tenant context.
3. **Session revocation** — stolen JWT valid until `exp`.
4. **LLM/embed verification** — optional for rules-only pilot; full RAG vectors need API key + embed smoke test.
5. **CI workflow** — no GitHub Actions gate on this branch.
6. **Production deploy** — Render/hosting cutover not exercised in this pass.

---

## Webchat verification detail (section I)

Run: `docker compose up -d && SEED_DEMO_CONTENT=true npm run seed && npm run dev` then `node --import tsx scripts/verify-webchat.mts`

| # | Case | Result | `reason` (sample) |
|---|------|--------|-------------------|
| 1 | Jamdani Saree price | pass | `reply_rules` (catalog snippet, no invented ৳) |
| 2 | Unknown product | pass | `ungrounded_after_llm` |
| 3 | Unknown price ask | pass | `ungrounded_after_llm` |
| 4 | Fake 50% discount | pass | `ungrounded_refuse` |
| 5 | Refund | pass | `escalate_refund` |
| 6 | Human request | pass | `escalate_human_requested` |
| 7 | Wrong-order dispute | pass | `escalate_order_dispute` |
| 8 | Low-confidence gibberish | pass | `reply_fallback` |
| 9 | Prompt injection | pass | `ungrounded_after_llm` (no secret leakage) |
| 10 | Other tenant `tenantId` | pass | no cross-tenant KB marker in reply |

---

## Messenger credential check (section J)

| Variable | Set |
|----------|-----|
| `META_VERIFY_TOKEN` | yes |
| `META_APP_SECRET` | no |
| `META_PAGE_ACCESS_TOKEN` | no |
| `META_PAGE_ID` | no |

**BLOCKED — external Meta credentials unavailable** for send/webhook acceptance. Unit tests (`tests/messenger.webhook.test.mts`, `tests/multitenant.send.test.mts`) cover HMAC and per-page token logic only.

---

## Related docs

- [`audit/implementation-audit.md`](../audit/implementation-audit.md) — area table + P0 history  
- [`audit/prd-implementation-status.md`](../audit/prd-implementation-status.md) — capability matrix  
- [`runbook.md`](./runbook.md) — operator bring-up when Meta creds exist  
- [`process/real-approach.md`](../process/real-approach.md) — execution model  
- [`NEXT.md`](./NEXT.md) — missing work + loop prompt
