# FaceTai QA Report

**Date:** 2026-07-20  
**Environment:** local `npm run dev` at `http://127.0.0.1:3010`  
**Seed:** `npm run seed` (demo tenant `tenant_demo`)  
**Login:** `admin@demo.facetai.local` / `facetai-demo` (default; `ADMIN_PASSWORD` unset)

---

## Credentials discovery

| Variable | Present? | Notes |
| --- | --- | --- |
| `.env` / `.env.local` | **No** | Only `.env.example` on disk |
| `META_PAGE_ACCESS_TOKEN` | **no** | |
| `META_APP_SECRET` | **no** | |
| `META_VERIFY_TOKEN` | **no** | |
| `META_APP_ID` | **no** | |
| `OPENAI_API_KEY` / `AI_API_KEY` | **no** | Rules-based Bangla replies used |
| `ADMIN_PASSWORD` | **no** | Falls back to `facetai-demo` |
| `LEADS_WEBHOOK_URL` / `ORDERS_WEBHOOK_URL` | **no** | |
| `NEXT_PUBLIC_MESSENGER_URL` | **no** | Correct — no fake m.me |
| WhatsApp Cloud API tokens | **no** | `NEXT_PUBLIC_WHATSAPP_NUMBER` only in `.env.example` |

**Verdict:** No real Meta / OpenAI / WhatsApp Cloud credentials in files or process env. All live Meta messaging tests are **Blocked**.

---

## Summary counts

| Result | Count |
| --- | --- |
| **Pass** | **52** |
| **Fail** | **0** (demo-blocking) |
| **Blocked** | **4** (real Meta / public webhook / OpenAI / ngrok) |
| **Notes (non-blocking)** | **3** |

Automated suite (`/tmp/facetai-qa-results.json`): **50/50 Pass**. Plus follow-ups: complaints create, spam keyword hit, ecommerce sync with platform, demo Connect, catalog create, channel filter.

---

## Feature results

### Landing

| Feature | Status | Steps / evidence |
| --- | --- | --- |
| Landing loads | **Pass** | `GET /` → 200 |
| Pricing (Starter ৳1,990 + Growth/Pro/Business) | **Pass** | HTML contains ৳1,990 / ৳4,990 / ৳9,990 / ৳14,990 |
| CTAs (WhatsApp / start) | **Pass** | `wa.me` + CTA copy present |
| Webchat widget | **Pass** | Widget markers in HTML; `POST /api/webchat` returns reply |

Artifact: `docs/qa-artifacts/landing.html`

### Auth

| Feature | Status | Steps / evidence |
| --- | --- | --- |
| Login page | **Pass** | `GET /dashboard/login` → 200 |
| Bad password | **Pass** | 401 |
| Demo login | **Pass** | 200 + `facetai_session` cookie |
| `/api/auth/me` | **Pass** | session for `admin@demo.facetai.local` |

### Dashboard pages (HTTP smoke)

All returned **200** with session cookie:

| Route | Status |
| --- | --- |
| `/dashboard` | **Pass** |
| `/dashboard/chats` (Inbox) | **Pass** |
| `/dashboard/orders` | **Pass** |
| `/dashboard/complaints` | **Pass** |
| `/dashboard/catalog` | **Pass** |
| `/dashboard/recommendations` | **Pass** |
| `/dashboard/ecommerce` | **Pass** |
| `/dashboard/knowledge` | **Pass** |
| `/dashboard/comments` | **Pass** |
| `/dashboard/connect` | **Pass** |
| `/dashboard/analytics` | **Pass** |
| `/dashboard/team` | **Pass** |
| `/dashboard/leads` | **Pass** |
| `/dashboard/planned` | **Pass** |

**Note:** Shell is client-rendered (`DashboardShell`); raw HTML snapshots show “Loading dashboard…” until `/api/auth/me` — APIs are the source of truth for data QA. Nav labels confirmed in source (`Inbox`, `Orders`, …).

Artifacts: `docs/qa-artifacts/dashboard.html`, `chats.html`, `connect.html`

### Dashboard / public APIs

| Feature | Status | Steps / evidence |
| --- | --- | --- |
| Inbox `/api/dashboard/chats` | **Pass** | Multi-channel threads: web, messenger, whatsapp, telegram, instagram |
| Channel filter `?channel=web` | **Pass** | Only `web` conversations |
| Orders list + create (`/api/orders`) | **Pass** | Valid payload → 200; invalid → 400 |
| Invoice | **Pass** | `GET /api/dashboard/orders/{id}/invoice` → HTML invoice |
| Complaints create | **Pass** | `POST` with `{ text, priority }` → open complaint |
| Catalog products | **Pass** | List + create “QA Test Scarf” |
| Recommendations | **Pass** | Product relations / scores returned |
| Ecommerce GET | **Pass** | Platforms + connections |
| Ecommerce sync stub | **Pass** | `{ action:"sync", platform:"woocommerce" }` → upserted stub products |
| Ecommerce JSON import | **Pass** | Import action → 200 |
| Knowledge | **Pass** | FAQ count 2 |
| Comments AI simulate | **Pass** | Lead capture + auto-reply path; spam keywords flag correctly (`free money` / `lottery`) |
| Connect demo | **Pass** | `mode: demo_only`; Demo Connect creates demo page (no Graph) |
| Analytics / Team | **Pass** | Counts + RBAC stub roles |
| Leads `/api/leads` | **Pass** | Valid interest enum → 200 |
| Webchat | **Pass** | Inbound + Bangla rules reply |
| Bot reply | **Pass** | `POST /api/bot/reply` → 200 |
| Messenger webhook GET verify | **Blocked** | No `META_VERIFY_TOKEN` → **503** (expected) |
| Messenger webhook POST (dev) | **Pass** (local only) | Without `META_APP_SECRET`, signature skipped in non-production; inbound processed; send skipped: `reply_skipped_no_token` |
| Live Page message round-trip | **Blocked** | Needs tokens + public HTTPS webhook (ngrok not installed) |
| OpenAI LLM replies | **Blocked** | No API key — rules fallback works |
| Real FaceTai Connect OAuth | **Blocked** | `META_APP_ID` / secret / redirect unset |

Artifact: `docs/qa-artifacts/invoice.html`

---

## Meta webhook (local)

### What was tested

```http
GET /api/messenger/webhook?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…
→ 503 {"ok":false,"error":"META_VERIFY_TOKEN is not set","hint":"Copy .env.example → .env.local…"}
```

```http
POST /api/messenger/webhook  (simulated page messaging event, no signature)
→ 200 processed:1, reason: reply_skipped_no_token
```

### Why true Page test is blocked

1. No real `META_*` env vars.
2. Meta requires a **public HTTPS** Callback URL. Localhost alone is insufficient.
3. `ngrok` not installed in this environment.

### Exact steps for user (real Facebook Page)

1. Copy `.env.example` → `.env.local` and set:
   - `META_VERIFY_TOKEN` — long random string (same value in Meta console)
   - `META_PAGE_ACCESS_TOKEN` — long-lived Page token
   - `META_APP_SECRET` — App Secret
   - Optional for Connect UI: `META_APP_ID`, `META_REDIRECT_URI`
2. Run locally: `npm run seed && npm run dev`
3. Expose HTTPS tunnel, e.g.  
   `ngrok http 3000` → `https://<id>.ngrok-free.app`
4. Meta App → Messenger → Webhooks:
   - Callback URL: `https://<public-host>/api/messenger/webhook`
   - Verify Token: same as `META_VERIFY_TOKEN`
5. Subscribe Page fields: **`messages`**, **`messaging_postbacks`** (optional `message_echoes` for handoff)
6. Local verify smoke (after env set):

```bash
curl -s "http://127.0.0.1:3000/api/messenger/webhook?hub.mode=subscribe&hub.verify_token=$META_VERIFY_TOKEN&hub.challenge=hello"
# expect plain text: hello
```

7. Send a Messenger message to the Page from a tester account (App in Development mode) or after App Review for public users.
8. Confirm thread appears in `/dashboard/chats` and reply is sent via Graph (not `reply_skipped_no_token`).

Deploy alternative: Vercel production URL as webhook host (filesystem ephemeral — prefer external DB/webhooks for prod data).

---

## Bugs found

| Severity | Issue | Action |
| --- | --- | --- |
| — | No demo-blocking build/runtime crashes on :3010 | None required |
| Low / note | SEO meta still mentions “from ৳990/mo” while Pricing component shows SaaS from ৳1,990 | **Fixed** (see Fixes applied) |
| Low / note | Dashboard shell is client-only auth gate (HTML 200 + loading before redirect); APIs correctly 401 without cookie | Acceptable for demo |
| Env | Prior `next start` on :3000 hung (sandbox `uv_interface_addresses` / unresponsive); QA used :3010 | **Mitigated** — `dev`/`start` bind `127.0.0.1`; README documents PORT kill / `PORT=3010` |
| Env | Turbopack `EMFILE: too many open files` watch warnings | Non-fatal; server still served requests |

**Critical bugs fixed this session:** none (none found that blocked demo QA).

---

## Fixes applied

*(Post-QA remediation — 2026-07-20)*

| Fix | Detail |
| --- | --- |
| SEO / OG pricing copy | `src/app/layout.tsx` — meta description now says SaaS from **৳1,990/mo** (was ৳990) |
| Lead interest labels | `src/lib/config.ts` — monthly option aligned to Starter **৳1,990**; setup add-ons clarified |
| Final CTA copy | `src/components/FinalCTA.tsx` — no longer quotes ৳990 as primary packaging |
| Pricing anchor | `src/components/Pricing.tsx` — section `id="pricing"`; Hero “View pricing” → `#pricing` |
| Messenger verify UX | `GET /api/messenger/webhook` without `META_VERIFY_TOKEN` → **503** with setup `hint` + docs pointer; wrong/missing hub params → **403** with specific reason |
| Messenger POST signature UX | Invalid / missing signature returns actionable `hint` (prod vs local unsigned) |
| Local bind / hung port | `package.json`: `dev`/`start` use `--hostname 127.0.0.1`; added `dev:lan` / `start:lan` for `0.0.0.0` |
| Defaults without `.env.local` | README documents zero-env demo; auth fallback uses `facetai-demo` in non-production when `ADMIN_PASSWORD` unset |
| README ops | Port-stuck kill/`PORT=3010` notes; scripts table updated |

**Build:** `npm run build` — success (Next.js 16.2.10).  
**Smoke (no Meta secrets, `PORT=3011 npm run start`):** landing 200 + `#pricing` + ৳1,990 meta; webchat / leads / orders / comments 200; messenger GET verify **503** graceful; login 401/200; `/api/auth/me` + dashboard chats 200.

**Still blocked on user credentials (unchanged):** live Page Messenger round-trip, Meta webhook verify success, OpenAI LLM path, FaceTai Connect OAuth, public HTTPS tunnel (ngrok).

---

## Real account checklist (user)

- [ ] Meta Developer App (Business) + Messenger product
- [ ] Facebook Page linked; long-lived **Page Access Token**
- [ ] `META_APP_SECRET`, `META_VERIFY_TOKEN` in `.env.local`
- [ ] Public HTTPS webhook URL (ngrok / Cloudflare Tunnel / Vercel)
- [ ] Webhook verified (GET challenge returns hub.challenge)
- [ ] Page subscribed: `messages`, `messaging_postbacks`
- [ ] Optional: `META_APP_ID` + redirect for FaceTai Connect OAuth
- [ ] Optional: `OPENAI_API_KEY` for LLM replies
- [ ] Optional: `NEXT_PUBLIC_MESSENGER_URL` only after real Page works
- [ ] Test message from non-admin tester → Inbox + outbound reply

---

## How QA was run

1. Credential scan: env files + process env (presence only).
2. `npm run seed`; `npm run dev -H 127.0.0.1 -p 3010`.
3. Node/curl API suite + HTML artifacts under `docs/qa-artifacts/`.
4. No browser MCP / Playwright in this workspace; UI covered via HTTP page + API smoke.
5. No commit made.
