# Changelog

## [Unreleased] — Sales MVP pilot-readiness P0 — 2026-08-21

Harden the existing Sales Agent (webchat + Messenger) rather than starting Phase 2.

### Security / tenancy
- Unmapped Meta Page IDs no longer fall through to the demo tenant.
- Removed `x-admin-password` dashboard session injection.
- RBAC on catalog, knowledge, ecommerce, Connect, and comment-settings writes (manager+).
- Login disambiguates the same email across tenants (`tenantSlug` / 409).
- Page tokens encrypted at rest when `TOKEN_ENCRYPTION_KEY` is set.

### AI / handoff
- Shared Sales pipeline for website chat (guardrails + handoff).
- Explicit human request and order-dispute escalation.
- Pre/post LLM catalog grounding (no invented price/discount/tracking/refund).
- `botEnabled` persisted and honored.

### Data
- Knowledge uploads store original bytes in Postgres (`fileContent`).
- Unique `(tenantId, mid)` webhook dedupe.
- Dashboard summary KPIs from SQL only (handoffs, qualified leads, response volume).
- CRM stage changes write timeline events.
- Initial Prisma migration (`prisma/migrations/20260821120000_init`).

### Tests
- Guardrails, RBAC, Messenger signature, per-tenant send tokens, crypto round-trip.
- Cross-tenant isolation test (skips if Postgres is down).

---

## [Unreleased] — Production hardening & rebrand — 2026-08-03

Rebranded from the internal codename **FaceTai** to **ReplyPilot AI** across user-facing copy, and hardened the app for production. No breaking changes to data or existing sessions.

### Security

- **Fixed**: any tenant's own `admin` role could list and disable *every* tenant on the platform via `/api/admin/tenants`. Now requires an exact `SUPER_ADMIN_EMAIL` match — tenant admin no longer implies cross-tenant access.
- **Fixed**: an unauthenticated request with no session cookie/header could receive a full demo-admin session when `ADMIN_PASSWORD` was unset outside production — removed the no-credential fallback entirely.
- **Fixed**: `SESSION_SECRET` silently fell back to `ADMIN_PASSWORD` or a hardcoded dev string; now required (throws at startup) in production.
- **Fixed**: `/api/admin/config` accepted the admin password as a `?password=` query parameter (leaks into logs/proxy caches) — header-only now.
- **Fixed**: logout response was missing the `secure` cookie flag in production.
- **Added**: per-IP rate limiting on all public POST endpoints (`login`, `leads`, `orders`, `comments`, `webchat`, `bot/reply`).
- **Added**: per-tenant daily cap on paid LLM calls (`MAX_AI_REPLIES_PER_DAY`) to bound cost-abuse risk.
- **Added**: SSRF-safe validation on image URLs passed to the vision model (blocks non-http(s) schemes and private/internal IP ranges).
- **Added**: prompt-injection hardening — tenant-controlled config fields (system prompt, business name, personality) are sanitized (newline/backtick stripped, length-capped) before being interpolated into the LLM system message.
- **Added**: startup environment validation (`src/instrumentation.ts`) — fails fast in production if `DATABASE_URL`/`SESSION_SECRET`/`ADMIN_PASSWORD` are missing.
- **Added**: production guard on `npm run seed` / `npm run db:migrate-json` — refuses to run against `NODE_ENV=production` without an explicit `SEED_CONFIRM=yes`.

### Critical bug fix

- **Fixed**: `next.config.ts` had a `"/Dashboard/:path*" → "/dashboard/:path*"` redirect intended to catch a capitalization typo. Next.js redirect matching is case-insensitive, so this rule also matched the *correct* lowercase `/dashboard` URL and redirected it to itself — an infinite redirect loop that made the entire dashboard unreachable on any direct navigation (refresh, bookmark, new tab). Removed the broken config-level rule; the same fix already existed correctly (case-sensitive) in `src/proxy.ts`.

### AI pipeline

- Added a 30s timeout + single 429-aware retry on LLM chat-completion and embedding calls (previously could hang indefinitely).
- Added a handoff re-check immediately before sending an AI reply, closing a race where a human agent's reply and the AI's reply could both land for the same message.
- Added webhook message deduplication by Meta's `mid` so retried webhook deliveries don't get processed twice.
- Removed a fallback message that revealed "I'm in rule-based mode" to end customers.

### Backend

- Rewrote `getAnalyticsSummary` to use SQL aggregation (`groupBy`/`count`/raw `SUM`) instead of loading full `leads`/`orders` tables into memory.
- Fixed an N+1 query in `listConversations` (one query per conversation for the preview text) — now a single `DISTINCT ON` query.
- Added pagination caps to `listConversations`/`listMessages`.
- Added `Lead.crmStage` and `Order.trackingStatus` indexes to match the new aggregation queries.
- Migrated `middleware.ts` → `proxy.ts` (Next.js 16 rename) to drop a build-time deprecation warning.

### Launch readiness

- Added `robots.txt`, `sitemap.xml`, OG image, app icon/apple-icon (replacing the default `create-next-app` favicon), and expanded metadata (canonical URL, Twitter card).
- Added `/privacy` and `/terms` pages, linked from the site footer; dashboard/admin routes marked `noindex`.
- Added `GET /api/health` for uptime monitoring.

### UX

- Dashboard sidebar now collapses into a "Menu" toggle on mobile instead of pushing all page content below a full-screen wrapped nav list.
- Added clearer empty states (Leads, Orders) with next-step guidance instead of a single muted line.
- Demo credentials are no longer pre-filled/hinted on the login form outside local development.

### Rebrand

- `FaceTai` → `ReplyPilot AI` in all UI copy, seed/demo data, AI system prompts, invoice output, and `package.json` name. Internal-only technical identifiers (cookie name, legacy `FaceTaiDb` migration type, legacy `data/facetai-db.json` filename) were left unchanged as they're not user-visible and renaming them would add churn without benefit.
