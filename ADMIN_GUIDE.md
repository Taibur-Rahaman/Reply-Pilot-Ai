# Admin Guide

For the person operating the ReplyPilot AI platform itself — environment configuration, security posture, multi-tenant administration, and production operations. For day-to-day dashboard use, see [`USER_GUIDE.md`](USER_GUIDE.md).

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Always | Postgres with the `vector` extension (pgvector) |
| `SESSION_SECRET` | **Production** | JWT signing secret for the `facetai_session` cookie. The app throws at startup in production if unset — there is no insecure fallback in prod. |
| `ADMIN_PASSWORD` | **Production** | Password for the seeded demo admin login path. Also required in prod (no `facetai-demo` default outside dev). |
| `SUPER_ADMIN_EMAIL` | For `/admin/tenants` | Only this exact email gets cross-tenant visibility. A tenant's own `admin` role does **not** grant this — it only manages that tenant. |
| `MAX_AI_REPLIES_PER_DAY` | No | Per-tenant daily cap on paid LLM calls (default 500). Once hit, that tenant's bot falls back to rule-based replies for the rest of the day instead of erroring. |
| `META_VERIFY_TOKEN` / `META_APP_SECRET` / `META_APP_ID` / `META_REDIRECT_URI` / `META_PAGE_ACCESS_TOKEN` | For live Messenger | See `docs/QA-REPORT.md` for the Meta App Review checklist |
| `OPENAI_API_KEY` / `AI_API_KEY`, `AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, `AI_VISION_MODEL`, `AI_EMBED_MODEL` | No | Without these, the bot uses rules + keyword search only |
| `AI_COST_PER_1K` | No | Tunes the dashboard's AI cost estimate (heuristic, not exact token accounting) |
| `LEADS_WEBHOOK_URL` / `ORDERS_WEBHOOK_URL` | No | POSTs a copy of every lead/order as JSON (e.g. to a Google Sheet via Apps Script/Zapier). Treat these as sensitive — anything with the URL can receive customer data. |
| `SEED_CONFIRM=yes` | Only when intentionally seeding prod | Required alongside `NODE_ENV=production` for `npm run seed` / `npm run db:migrate-json` to run |

`src/instrumentation.ts` validates the required set at server startup and fails fast in production rather than surfacing a confusing error on the first request.

## Security model

- **Passwords**: bcrypt (cost 10). A legacy plaintext-hash compatibility path exists for pre-migration accounts and auto-upgrades to bcrypt on next login.
- **Sessions**: signed JWT (`HS256`) in an httpOnly, `sameSite=lax` cookie, `secure` in production, 14-day expiry.
- **Multi-tenancy**: every dashboard API route derives `tenantId` from the authenticated session — never from the request body — so one tenant cannot read or write another tenant's data.
- **Cross-tenant admin**: `/admin/tenants` (list/disable tenants) requires `session.email === SUPER_ADMIN_EMAIL`. A regular tenant's `admin` role is scoped to that tenant only.
- **Rate limiting**: public endpoints (`/api/auth/login`, `/api/leads`, `/api/orders`, `/api/comments`, `/api/webchat`, `/api/bot/reply`) are rate-limited per IP (`src/lib/rate-limit.ts`). This is an in-memory, single-process limiter — fine for one instance, but resets per deploy and doesn't share state across multiple instances/regions. For a multi-instance production deployment, swap in a shared store (Upstash/Redis) behind the same `checkRateLimit` function signature.
- **AI abuse controls**: per-tenant daily reply cap (`MAX_AI_REPLIES_PER_DAY`), a 30s timeout + single 429 retry on LLM calls, and SSRF-safe validation on any image URL passed to a vision model (rejects non-http(s) schemes and private/internal IP ranges).
- **Webhook signature verification**: Messenger webhook POSTs are verified against `META_APP_SECRET` (`X-Hub-Signature-256`). Unsigned requests are only accepted outside production.

See [`docs/SECURITY.md`](docs/SECURITY.md) for more background.

## Multi-tenant administration

- `/admin/tenants` — list all tenants, disable/enable one (disabling blocks login for all of that tenant's users). Requires `SUPER_ADMIN_EMAIL`.
- `/admin` — legacy single-tenant "admin-lite" config editor (business name, greeting, system prompt, guardrails) for the default tenant, gated by `ADMIN_PASSWORD` via the `x-admin-password` header (no query-param auth — that was removed because query strings leak into logs/proxies).
- Per-tenant team management (roles: `admin`/`manager`/`moderator`/`agent`) is under **Team** in the dashboard itself.

## Operations

- **Health check**: `GET /api/health` returns `{ ok: true, status: "healthy" }` (200) or `{ ok: false }` (503) based on a live Postgres query — point your uptime monitor here.
- **Logs**: routes log with a `[api/...]` / `[ai]` / `[rag]` prefix via `console.error`/`console.warn`. There's no structured/centralized logging yet — pipe stdout/stderr to your platform's log aggregator (Vercel Logs, Render Logs, Datadog, etc.).
- **Database indexes**: `prisma/schema.prisma` indexes tenant-scoped lookups (conversations, messages, leads, orders, CRM stage, tracking status). After pulling schema changes, run `npx prisma db push` (dev) or set up `npm run db:migrate` for tracked migrations in a team environment.
- **Backups**: not handled by the app — use your Postgres provider's automated backups (Neon/Supabase/RDS point-in-time recovery, or `pg_dump` on a schedule if self-hosting).
- **Error tracking**: no Sentry/error-tracking SDK is wired in yet. Recommended before scaling past the demo phase — add `@sentry/nextjs` or similar and forward the existing `console.error` call sites.

## Legal / launch pages

`/privacy` and `/terms` ship with reasonable default content for this product shape — review and adjust with counsel before relying on them for a live business, especially around Bangladesh-specific data protection requirements.
