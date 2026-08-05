# Phase 2 — FaceTai AI Bot (Messenger first)

> **Historical implementation sketch.** Naming here (“Phase 1 = landing / Phase 2 = Messenger”) predates the Phase 0–5 roadmap in [`PHASES.md`](./PHASES.md).
>
> **Conflict rule:** [`PRD.md`](./PRD.md) **v3.0** + [`BUSINESS_DECISIONS.md`](./BUSINESS_DECISIONS.md) **win** on product scope, architecture locks, agent positioning, and what is Current vs Planned. This file must not expand MVP or override those docs.

Phase 1 (legacy name in this file) = marketing site + lead capture.  
Phase 2 MVP (this repo, legacy name) = Facebook Messenger webhook + reply pipeline + orders + admin-lite.

**Product scope:** See [`PRD.md`](./PRD.md) **v3.0** — **AI Employee Platform**; first agent = **Sales**; multi-tenant foundation; KB/RAG; Admin Dashboard; Connect **F39** = Phase 3 SaaS gate per PHASES. This file stays an implementation sketch for what exists in-repo today.

**Successor to manual token setup — F39 FaceTai Connect (not built):**  
PRD **F39 — One Click Messenger Install** (Login with Facebook → Select Page → Connect; auto webhook + permissions + bot activate) is the planned self-serve replacement for the env-token steps below. Until F39 ships, ops/clients still use `META_PAGE_ACCESS_TOKEN` + Meta webhook console. Do not market “2-minute Connect” as live.

**Do not invent Meta App credentials.** Create them in Meta Developer Console. The bot will not claim a live Page connection until tokens are set.

## What works today (MVP)

| Piece | Status |
| --- | --- |
| `GET/POST /api/messenger/webhook` | **Working** — verify challenge + receive events + signature check |
| AI / rule replies | **Working** — OpenAI-compatible if `OPENAI_API_KEY` / `AI_API_KEY`; else rules + graceful fallback |
| Send via Graph API | **Working when** `META_PAGE_ACCESS_TOKEN` is set; otherwise logs reply and skips send |
| Order capture | **Working** — heuristic parse → `data/orders.jsonl` + optional `ORDERS_WEBHOOK_URL` |
| Product image send | **Working when** Admin sets `productImageUrl` and user asks for photo |
| Inbound image | **Working** — ack stub; optional vision if AI key supports multimodal |
| Human handoff | **Stub+working** — Page echo sets handoff; user can say `bot on` / `এআই চালু` to resume |
| Comment auto-reply / spam delete | **Stub only** — `GET/POST /api/comments/stub` |
| Admin lite | **Working** — `/admin` + `GET/PUT /api/admin/config` (password via `ADMIN_PASSWORD`) |
| Admin Dashboard | **Working (Wave A)** — `/dashboard` chats/leads/orders/catalog/KB/team/connect |
| Multi-tenant store | **Working (local)** — `data/facetai-db.json` with `tenantId` on entities |
| FaceTai Connect (F39) | **Scaffold** — Demo Connect + OAuth callback; needs Meta App credentials for real flow |
| WhatsApp channel | **Not yet** — reuse same reply/order core later |

## Connect a real Facebook Page

> **Manual path (current).** Planned successor: FaceTai Connect (F39) — Embedded Signup / Facebook Login for Business so clients never paste webhook URLs. See [`PRD.md`](./PRD.md) + [`PHASES.md`](./PHASES.md) Phase 3.

1. Go to [developers.facebook.com](https://developers.facebook.com/) → **Create App** (type: Business).
2. Add product **Messenger** → connect your **Facebook Page**.
3. Generate a **Page Access Token** (prefer long-lived). Put in `META_PAGE_ACCESS_TOKEN`.
4. Copy **App Secret** → `META_APP_SECRET`.
5. Choose a random string → `META_VERIFY_TOKEN` (same value in Meta webhook settings).
6. Deploy this app (Vercel or any HTTPS host). Localhost needs a tunnel (ngrok / Cloudflare Tunnel).
7. In Messenger → Webhooks:
   - Callback URL: `https://<your-domain>/api/messenger/webhook`
   - Verify Token: same as `META_VERIFY_TOKEN`
8. Subscribe the Page to webhook fields: **`messages`**, **`messaging_postbacks`** (and `message_echoes` if you want operator handoff).
9. Optional: set `OPENAI_API_KEY` (or `AI_API_KEY` + `AI_BASE_URL`) for LLM replies.
10. Optional: set `ORDERS_WEBHOOK_URL` to an Apps Script that appends rows (same pattern as leads).
11. Open `/admin`, unlock with `ADMIN_PASSWORD`, set greeting / FAQ / product image URL.
12. Message the Page from a non-admin test user (or roles allowed by the app mode).

Until steps 3–8 succeed, the landing must **not** show a fake `m.me` link. Set `NEXT_PUBLIC_MESSENGER_URL` only when the Page is real.

### App modes

- **Development:** only app roles / testers can chat with the bot.
- **Live:** requires App Review for `pages_messaging` (and related) for public users.

## Architecture

```
Facebook User
    → Messenger
    → Meta Webhooks (GET/POST /api/messenger/webhook)
    → FaceTai pipeline (`src/lib/bot/pipeline.ts`)
         ├─ Human handoff check
         ├─ Image ack / optional vision
         ├─ Order heuristic → orders.jsonl / ORDERS_WEBHOOK_URL
         ├─ Product photo URL send
         └─ Rules or OpenAI-compatible reply
    → Graph Send API (`me/messages`)
```

## Routes

| Route | Purpose |
| --- | --- |
| `GET/POST /api/messenger/webhook` | Meta verification + inbound events |
| `POST /api/bot/reply` | Generate reply without sending (admin / local test) |
| `POST /api/orders` | Normalize order → Sheet / jsonl |
| `GET/PUT /api/admin/config` | Business knowledge (password header) |
| `GET/POST /api/comments/stub` | Documented stub for comment automation |
| `/admin` | Admin-lite UI |

## Env vars

See `.env.example`:

```bash
META_VERIFY_TOKEN=
META_APP_SECRET=
META_PAGE_ACCESS_TOKEN=
OPENAI_API_KEY=            # or AI_API_KEY + AI_BASE_URL + AI_MODEL
ORDERS_WEBHOOK_URL=
LEADS_WEBHOOK_URL=
ADMIN_PASSWORD=
NEXT_PUBLIC_WHATSAPP_NUMBER=8801601677122
# NEXT_PUBLIC_MESSENGER_URL=   # only if real
```

### Signature verification

`POST` webhooks require `X-Hub-Signature-256` when `META_APP_SECRET` is set.  
If the secret is missing, verification is **allowed only outside production** (local MVP).

## Google Sheet orders

Reuse Phase 1 Apps Script webhook. Suggested columns:

`id`, `createdAt`, `pageId`, `senderId`, `name`, `phone`, `product`, `qty`, `notes`, `status`

## Comment auto-reply / spam (stub)

Not implemented without Page engagement permissions + App Review. Call `GET /api/comments/stub` for the checklist. Do not promise live comment deletion until Graph calls are wired and reviewed.

## WhatsApp (after Messenger)

- Meta WhatsApp Business Cloud API.
- Keep channel adapters thin; share `generateAiReply` + `storeOrder`.
- Env later: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.

## Local test without Meta

```bash
npm run dev
# Admin UI
open http://localhost:3000/admin

# Reply smoke test
curl -s -X POST http://localhost:3000/api/bot/reply \
  -H 'Content-Type: application/json' \
  -d '{"text":"প্রাইস কত?"}'
```

## Non-goals / caveats

- Vercel filesystem is ephemeral — use `ORDERS_WEBHOOK_URL` / DB for durable orders in production.
- No fake live Meta connection in marketing copy.
- Comment spam delete remains stub until permissions exist.
