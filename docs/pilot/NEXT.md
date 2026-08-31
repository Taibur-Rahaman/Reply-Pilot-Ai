# Pilot — next phase & loop

> **Branch:** `feat/sales-mvp-pilot-readiness`  
> **Last verified:** 2026-08-31 · commit `65fc1dd`  
> **Verdict:** **NOT PILOT READY** (Messenger **BLOCKED**)

This is the single control doc for what is done, what is missing, and how to re-run verification. Gate matrix: [`readiness-report.md`](./readiness-report.md).

---

## Phase 1 complete (operational verification)

| Gate | Status |
|------|--------|
| Environment / Postgres | **VERIFIED** |
| Migration (clean deploy) | **VERIFIED** |
| Tenant isolation | **VERIFIED** |
| Webchat 10-case E2E | **VERIFIED** (`npm run verify:webchat`) |
| KB durable bytes | **VERIFIED** |
| Guardrails (unit) | **VERIFIED** |
| Handoff (webchat E2E) | **VERIFIED** |
| Tests / build | **VERIFIED** (48 pass, 0 skip with DB up) |
| Messenger live | **BLOCKED** (no Meta send credentials) |
| Auth / audit / RAG embed | **PARTIAL** |

---

## Phase 2 — missing (do next)

Priority order. Do **not** start Telegram, WhatsApp, Instagram, billing, Redis, or extra agents.

### P0 — required before pilot on Messenger

1. **Meta credentials** — set in `.env.local` (never commit): `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID` (`META_VERIFY_TOKEN` already present).
2. **Live Messenger acceptance** — follow [`runbook.md`](./runbook.md): webhook HMAC → page resolution → dedupe → AI pipeline → Graph send → persistence. Unknown page must be refused.
3. **Update readiness report** — section **J** from **BLOCKED** → **VERIFIED** or **PARTIAL** with evidence.

### P1 — before or during first customer pilot

4. **Login-failure audit** — design tenant-safe failure row (schema FK constraint today).
5. **Session revocation** — `sessionVersion` on User + check in JWT validation.
6. **RAG embed smoke test** — with `OPENAI_API_KEY` or `AI_API_KEY`; optional HNSW index.
7. **CI workflow** — `npm test` + typecheck + lint on PR (Postgres service container).
8. **Production deploy dry-run** — see [`../deployment/deployment.md`](../deployment/deployment.md).

### P2 — post-pilot (tracked, not blocking)

9. Connect OAuth completeness (`subscribed_apps`, page picker, long-lived tokens).
10. Graph send retries; token expiry detection.
11. Audit read API in dashboard.
12. Durable `Job` worker drain (schema exists).

---

## Re-run verification (any tick)

```bash
docker compose up -d
SEED_DEMO_CONTENT=true npm run seed
npm test
npm run typecheck
npm run lint
npm run build
npm run dev   # separate terminal
npm run verify:webchat
```

Credential check (presence only, never print values):

```bash
python3 - <<'PY'
import os, re
from pathlib import Path
for f in ('.env','.env.local'):
  p=Path(f)
  if not p.exists(): continue
  for line in p.read_text().splitlines():
    if '=' in line and not line.strip().startswith('#'):
      k,v=line.split('=',1); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
for k in ['META_APP_SECRET','META_PAGE_ACCESS_TOKEN','META_PAGE_ID','META_VERIFY_TOKEN','DATABASE_URL']:
  print(k+'_SET=' + ('yes' if os.environ.get(k) else 'no'))
PY
```

---

## Dynamic loop prompt

**Start:** `/loop Continue ReplyPilot pilot verification per docs/pilot/NEXT.md`

**Stop when:** every mandatory gate is **VERIFIED** or explicitly **BLOCKED**, readiness report synced, verification commits pushed. **Do not claim pilot ready** until Messenger is **VERIFIED**.

**Re-arm loop when:** Meta credentials added, production deploy attempted, or regression after merge.

```
Branch: feat/sales-mvp-pilot-readiness (do not merge to main without review).

MODE: Operational verification only. NO new product features.
OUT OF SCOPE: Telegram, WhatsApp, Instagram, billing, Redis, marketplace, extra agents.

PROTECT WIP — do not modify:
- src/app/app/messages/page.tsx, src/app/app/settings/page.tsx
- Docker/Caddy files (.dockerignore, Caddyfile, Dockerfile, docker-compose*.yml)
- tests/pending/

READ FIRST: docs/pilot/NEXT.md then docs/pilot/readiness-report.md

Each tick:
1. git status / git log -3 — leave unrelated WIP unstaged.
2. docker compose up -d — confirm Postgres reachable (no credential output).
3. First open item in Phase 2 above, or re-run suite if no code changed:
   - Messenger: only if META_APP_SECRET + META_PAGE_ACCESS_TOKEN + META_PAGE_ID are set.
   - npm test, typecheck, lint, build — record exact counts.
   - npm run verify:webchat when pipeline/auth/grounding touched.
4. Update docs/pilot/readiness-report.md sections A–O (VERIFIED|PARTIAL|BLOCKED|BROKEN|NOT VERIFIED).
5. Sync docs/audit/* and docs/process/real-approach.md if matrix changed.
6. Commit/push verification artifacts only.

End tick with: completed gates, next missing item, blockers, re-arm yes/no.
```

**Current loop state:** **STOPPED** — Phase 1 verification complete; Phase 2 blocked on Meta credentials.

---

## Doc map (standard paths)

| Path | Purpose |
|------|---------|
| [`docs/pilot/NEXT.md`](./NEXT.md) | This file — next work + loop |
| [`docs/pilot/readiness-report.md`](./readiness-report.md) | Gate matrix A–O |
| [`docs/pilot/runbook.md`](./runbook.md) | Operator bring-up |
| [`docs/audit/implementation-audit.md`](../audit/implementation-audit.md) | Full area audit |
| [`docs/audit/prd-implementation-status.md`](../audit/prd-implementation-status.md) | PRD vs code |
| [`docs/process/real-approach.md`](../process/real-approach.md) | Execution model |
| [`docs/deployment/deployment.md`](../deployment/deployment.md) | Hosting |
| [`docs/handbook/README.md`](../handbook/README.md) | Product handbook |
