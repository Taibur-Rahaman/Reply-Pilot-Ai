# Launch Checklist

Status as of 2026-08-04. ✅ done in this repo · ⚠️ needs a human decision/account · ❌ not started.

## Environment & secrets

- [ ] ⚠️ Set `DATABASE_URL` to a production Postgres with `vector` extension (Neon/Supabase/RDS)
- [ ] ⚠️ Set `SESSION_SECRET` to a long random value (app refuses to start without it in production)
- [ ] ⚠️ Set `ADMIN_PASSWORD` to a strong, unique value
- [ ] ⚠️ Set `SUPER_ADMIN_EMAIL` to your real operator email (not the demo value)
- [ ] ⚠️ Choose and configure an AI provider (`OPENAI_API_KEY`/`AI_API_KEY` or Ollama/Groq/Gemini), or accept rules-only fallback
- [ ] ✅ Secrets are gitignored (`.env*` except `.env.example`); confirm none were ever committed

## Database

- [ ] ⚠️ Run `npx prisma db push` (or set up tracked migrations via `npm run db:migrate`) against production
- [ ] ✅ Indexes in place for tenant-scoped queries (conversations, messages, leads, orders, CRM stage, tracking status)
- [ ] ⚠️ Do **not** run `npm run seed` against production unless you intend to create the demo tenant (`SEED_CONFIRM=yes` required)
- [ ] ⚠️ Confirm your Postgres provider's automated backup/point-in-time-recovery is enabled

## Security

- [x] ✅ Multi-tenant isolation: every dashboard query is scoped by session `tenantId`
- [x] ✅ Cross-tenant super-admin gated by exact `SUPER_ADMIN_EMAIL` match, not by tenant role
- [x] ✅ Rate limiting on public endpoints (login, leads, orders, comments, webchat, bot/reply)
- [x] ✅ Per-tenant AI cost budget cap
- [x] ✅ SSRF-safe image URL validation, prompt-injection sanitization on tenant config
- [x] ✅ Session cookie httpOnly + secure-in-production + signed JWT
- [x] ✅ Baseline security headers on every response (`next.config.ts`): HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`
- [ ] ❌ No Content-Security-Policy. Next.js injects inline bootstrap scripts, so a correct policy needs per-request nonces threaded through `src/proxy.ts` — deliberately not guessed at, since a wrong CSP breaks the app silently in the browser
- [ ] ⚠️ Rotate `ADMIN_PASSWORD`/`SESSION_SECRET` if this repo's demo values were ever used anywhere reachable
- [ ] ⚠️ For multi-instance/serverless production, replace the in-memory rate limiter with a shared store (Redis/Upstash) — current limiter is per-process
- [ ] ❌ No error-tracking SDK (Sentry or similar) wired in yet

## AI / bot

- [x] ✅ Timeout + 429 retry on LLM calls
- [x] ✅ Handoff race fixed (no AI + human double-reply)
- [x] ✅ Webhook message dedupe by `mid`
- [ ] ⚠️ Review default system prompt / guardrails per business before go-live (Knowledge → Prompt Builder)
- [ ] ❌ Conversation history isn't sent to the LLM yet (each reply only sees the latest message) — acceptable for simple Q&A, a real limitation for multi-turn negotiation; needs a product decision on context-window/cost tradeoff before addressing

## SEO / metadata

- [x] ✅ `robots.txt`, `sitemap.xml`, OG image, app icon/apple-icon, canonical URL, Twitter card
- [x] ✅ Signed-in and internal routes marked `noindex, nofollow` via layout metadata — `/app/*` (the current dashboard), `/admin/*`, `/welcome`, `/design-system` — and disallowed in `robots.txt`. The earlier "dashboard is noindex" claim covered only the old `/dashboard/*` tree and went stale when the app moved to `/app/*`, which left the whole signed-in dashboard indexable
- [ ] ⚠️ Verify `NEXT_PUBLIC_APP_URL` is set to your real production domain (used for canonical/OG/sitemap URLs)
- [ ] ⚠️ Submit sitemap to Google Search Console after go-live

## Legal

- [x] ✅ `/privacy` and `/terms` pages, linked from the footer
- [ ] ⚠️ Have counsel review Privacy Policy / Terms against Bangladesh data-protection requirements and your actual data flows before relying on them commercially
- [ ] ❌ No separate cookie-consent banner — currently only one first-party session cookie is used and disclosed in the Privacy Policy; add a consent banner if you introduce analytics/ad cookies

## Billing / pricing

- [x] ✅ Pricing tiers displayed on the landing page
- [ ] ❌ No payment gateway integration — billing is currently manual (WhatsApp/bKash/bank transfer per the Terms page). Needs a business decision (Stripe isn't the natural fit for BD; consider bKash/Nagad/SSLCommerz) before self-serve billing

## Monitoring

- [x] ✅ `GET /api/health` liveness probe (checks Postgres)
- [ ] ⚠️ Point an uptime monitor (UptimeRobot, Better Uptime, etc.) at `/api/health`
- [ ] ⚠️ Set up log aggregation for the console-based logs (Vercel Logs / Render Logs / Datadog)
- [ ] ❌ No product analytics (GA/Plausible/PostHog) configured — add if you want funnel/usage data

## Final verification before go-live

- [x] ✅ `npx tsc --noEmit` clean
- [x] ✅ `npm run build` succeeds
- [x] ✅ `npm run lint` clean (0 errors). The ignore globs were anchored to the repo root, so `eslint` was also linting generated bundles inside `.claude/worktrees/*/.next/` and reporting 1,126 errors that hid the real result — now `**/.next/**`
- [x] ✅ `npm test` — 14/14 pass (session forgery, cross-tenant isolation, password verification)
- [x] ✅ Marketing headings legible: `base.css` styles bare `h1`–`h4` with the dark shell's near-white `--rp-text`, and an element-level rule beats the `--ink` those headings inherit from `.legacy-site` — so on `/`, `/privacy` and `/terms` every heading (hero headline, section titles, all five pricing tier names) rendered near-white on the light background at ~1.05:1. Now `#0c2b33` at ~13.6:1
- [x] ✅ Manually verified: landing page, login, dashboard (with real seeded data), privacy/terms pages, mobile nav, on a local Postgres instance
- [ ] ⚠️ Load-test the AI reply path if you expect meaningful launch traffic (LLM latency dominates response time)
- [ ] ⚠️ Confirm Meta App Review status if using live Messenger (see `docs/QA-REPORT.md`)
