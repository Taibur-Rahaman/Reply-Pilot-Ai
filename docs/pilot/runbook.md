# Sales Agent MVP — Pilot runbook

> Status: **PARTIAL** — code paths below are implemented and unit-tested. Live Meta/LLM/Postgres on a customer Page is **NOT VERIFIED** in this pass (credentials and a running database were not available).

Pilot mode assumed: **one operator-managed Facebook Page + website chat**, not open self-serve signup.

## Before you start

Required environment (production):

| Variable | Why |
| --- | --- |
| `DATABASE_URL` | Postgres + pgvector |
| `SESSION_SECRET` | ≥32 characters |
| `ADMIN_PASSWORD` | Seeded demo admin; do not reuse across tenants |
| `TOKEN_ENCRYPTION_KEY` | Encrypt Page tokens at rest |
| `META_VERIFY_TOKEN` | Webhook verify |
| `META_APP_SECRET` | HMAC signature (required in production) |
| `META_PAGE_ACCESS_TOKEN` | Operator-managed send token |
| `META_PAGE_ID` | Maps that Page to the demo/pilot tenant. **Unmapped Pages are refused.** |
| `SUPER_ADMIN_EMAIL` | Cross-tenant console |

Optional: `OPENAI_API_KEY` / `AI_API_KEY` / provider vars. Without them the bot uses rules + RAG keyword fallback.

Do **not** commit `.env` files.

## Bring-up (clean machine)

```bash
docker compose up -d
cp .env.example .env.local
# set DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD, META_* as above

npx prisma migrate deploy   # preferred on a new database
# existing databases that were created with `db push` can keep using:
# npx prisma db push

npm run seed
npm run build
npm run start
```

Health: `GET /api/health` must return `{ ok: true }`.

## Pilot acceptance checks (manual)

1. Login as `admin@demo.replypilot.local` — session cookie httpOnly.
2. Agent role cannot create catalog products (403).
3. Website chat: ask for a price of a product **not** in catalog → grounded refuse or human handoff, no invented ৳ amount.
4. Website chat: `refund করে দিন` → handoff, AI silent on the next customer message until take/leave/resume.
5. Website chat: `manager-এর সাথে কথা বলব` → handoff.
6. Inbox take → AI does not reply; leave / `bot on` resumes.
7. Knowledge upload survives process restart (bytes in Postgres, not only `data/uploads`).
8. Messenger: invalid `X-Hub-Signature-256` → 401.
9. Messenger: unknown Page ID → no demo-tenant reply (`unknown_page_unmapped` in logs).
10. Duplicate webhook `mid` → second delivery skipped.

## What this pilot is not

- WhatsApp / Instagram / Telegram
- Self-serve Connect in two minutes
- Billing, SSO, marketplace
- Multi-instance rate limits (in-memory only)
- Verified live Meta send until a real Page token is configured

## Rollback

Do not `migrate down` on a customer database without a backup. `KbDocument.fileContent` and `Message (tenantId, mid)` unique are additive; existing rows with duplicate mids would block the unique index — inspect before `migrate deploy` on a populated DB.

## BLOCKER if stuck

| BLOCKER | WHY | WHAT IS NEEDED | SAFE NEXT ACTION |
| --- | --- | --- | --- |
| Postgres not running | Isolation test skipped / app cannot persist | Local `docker compose up -d` or managed `DATABASE_URL` | Start Postgres; `npx prisma migrate deploy`; `npm run seed`; re-run `npm test` with `DATABASE_URL` |
| No Meta App credentials | Live Messenger path untested | Real `META_APP_SECRET`, Page token, webhook URL | Pilot on webchat first; add Messenger when Meta console is ready |
| No `TOKEN_ENCRYPTION_KEY` | Cannot encrypt customer Page tokens | Long random secret | Set key **before** OAuth Connect; then `npm run db:encrypt-tokens` for leftover plaintext |
| Duplicate `mid` on old DB | Unique index deploy fails | Dedupe `Message` rows | `SELECT "tenantId", mid, COUNT(*) FROM "Message" WHERE mid IS NOT NULL GROUP BY 1,2 HAVING COUNT(*) > 1;` |
