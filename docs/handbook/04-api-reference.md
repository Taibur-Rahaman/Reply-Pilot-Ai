# 04 · API reference

> 🧑‍💻 ENG · 🔬 QA · ✍️ TW

All handlers run on `export const runtime = "nodejs"`. All responses are JSON
unless noted. Base URL in production: `https://replypilotai.shop`.

---

## 4.0 Conventions

### Authentication modes

| Mode | Header / cookie | Used by |
| --- | --- | --- |
| **Session** | `Cookie: facetai_session=<JWT>` (httpOnly) | `/api/dashboard/*`, `/api/connect`, `/api/auth/me` |
| **Super admin** | Session whose `email === SUPER_ADMIN_EMAIL` | `/api/admin/tenants` |
| **Legacy admin** | `x-admin-password: <ADMIN_PASSWORD>` | `/api/admin/config` compatibility |
| **Meta signature** | `X-Hub-Signature-256: sha256=<hmac>` | `/api/messenger/webhook` |
| **Public** | none | `/api/leads`, `/api/orders`, `/api/webchat`, `/api/comments`, `/api/bot/reply`, `/api/health` |

> The `x-facetai-session` header was removed deliberately — sessions are read
> from the httpOnly cookie only, so XSS cannot inject one.

### Standard error envelope

```json
{ "error": "Human readable message.", "hint": "optional remediation" }
```

| Status | Meaning | Typical cause |
| --- | --- | --- |
| `400` | Bad request | Missing required field, unknown `action` |
| `401` | Unauthorized | No/invalid session, bad Meta signature |
| `403` | Forbidden | Role too low, wrong verify token, not super admin |
| `404` | Not found | Entity id not in this tenant |
| `429` | Rate limited | `Retry-After` header present |
| `500` | Server error | Logged with an `[api/<route>]` prefix |
| `501` | Not implemented | `/api/comments/stub` |
| `503` | Unavailable | DB unreachable, `META_VERIFY_TOKEN` unset |

### Rate limits (fixed window, in-process)

| Key | Limit | Window | Route |
| --- | --- | --- | --- |
| `login:<ip>` | 10 | 15 min | `POST /api/auth/login` |
| `leads:<ip>` | 20 | 60 min | `POST /api/leads` |
| `orders:<ip>` | 20 | 60 min | `POST /api/orders` |
| `bot-reply:<ip>` | 20 | 10 min | `POST /api/bot/reply` |
| `webchat:<ip>` | 30 | 5 min | `POST /api/webchat` |
| `comments:<ip>` | 30 | 60 min | `POST /api/comments` |
| `ai-budget:<tenantId>` | `MAX_AI_REPLIES_PER_DAY` (500) | 24 h | every LLM call |

Client IP is taken from `x-forwarded-for` (first entry), then `x-real-ip`, then
the literal `"unknown"`.

> ⚠️ **GAP-06.** The limiter is a process-local `Map`. It resets on deploy and
> does not coordinate across instances. Behind three replicas the effective
> limits are 3× the numbers above. Replace with Redis behind the same
> `checkRateLimit(key, limit, windowMs)` signature.

---

## 4.1 Endpoint index

| Method | Path | Auth | Role | Rate limit |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | — | — | — |
| `POST` | `/api/auth/login` | — | — | 10/15m |
| `POST` | `/api/auth/logout` | — | — | — |
| `GET` | `/api/auth/me` | session | any | — |
| `GET` `POST` | `/api/messenger/webhook` | Meta | — | — |
| `POST` | `/api/webchat` | — | — | 30/5m |
| `GET` `POST` | `/api/bot/reply` | — | — | 20/10m |
| `POST` | `/api/leads` | — | — | 20/60m |
| `POST` | `/api/orders` | — | — | 20/60m |
| `GET` `POST` | `/api/comments` | — | — | 30/60m |
| `GET` `POST` | `/api/comments/stub` | — | — | — |
| `GET` `POST` | `/api/connect` | session | any | — |
| `GET` | `/api/connect/callback` | OAuth state | — | — |
| `GET` | `/api/dashboard/summary` | session | any | — |
| `GET` `POST` `PATCH` | `/api/dashboard/chats` | session | ≥ agent | — |
| `GET` `PATCH` | `/api/dashboard/leads` | session | any | — |
| `GET` `POST` `PATCH` | `/api/dashboard/orders` | session | any | — |
| `GET` | `/api/dashboard/orders/[id]/invoice` | session | any | — |
| `GET` `POST` `PATCH` | `/api/dashboard/complaints` | session | any | — |
| `GET` `POST` `PATCH` `DELETE` | `/api/dashboard/products` | session | any | — |
| `GET` `PATCH` | `/api/dashboard/recommendations` | session | any | — |
| `GET` `PUT` `POST` | `/api/dashboard/knowledge` | session | `save_config` blocks `agent` | — |
| `GET` `PUT` `POST` | `/api/dashboard/comments` | session | any | — |
| `GET` `PUT` `POST` | `/api/dashboard/ecommerce` | session | any | — |
| `GET` `POST` | `/api/dashboard/team` | session | `POST` = admin\|manager | — |
| `GET` | `/api/dashboard/analytics` | session | any | — |
| `GET` `PUT` | `/api/admin/config` | session or `x-admin-password` | any | — |
| `GET` `PATCH` | `/api/admin/tenants` | session + `SUPER_ADMIN_EMAIL` | super | — |

---

## 4.2 Health

### `GET /api/health`

Uptime probe. Executes `SELECT 1` through Prisma.

```http
GET /api/health
```

| Status | Body |
| --- | --- |
| `200` | `{ "ok": true, "status": "healthy" }` |
| `503` | `{ "ok": false, "status": "unhealthy" }` |

Use as the load-balancer liveness probe. Note it checks the database, so a DB
blip will take the instance out of rotation — that is intentional.

---

## 4.3 Authentication

### `POST /api/auth/login`

```json
{ "email": "admin@demo.replypilot.local", "password": "facetai-demo" }
```

**200**

```json
{
  "ok": true,
  "session": {
    "userId": "user_demo_admin",
    "tenantId": "tenant_demo",
    "email": "admin@demo.replypilot.local",
    "name": "Demo Admin",
    "role": "admin"
  }
}
```

Sets:

```
Set-Cookie: facetai_session=<JWT>; HttpOnly; SameSite=Lax; Path=/;
            Max-Age=1209600; Secure(prod only)
```

The JWT is **never** echoed in the body — that would defeat `httpOnly`.

| Status | Cause |
| --- | --- |
| `400` | email or password missing |
| `401` | `Invalid credentials.` (also returned for a disabled tenant) |
| `429` | more than 10 attempts from this IP in 15 minutes |

### `POST /api/auth/logout`

Clears the cookie with `maxAge: 0`. Always `200 {"ok": true}`.

> ⚠️ **GAP-09.** The JWT itself remains valid for its full 14 days. There is no
> server-side revocation list — a leaked token cannot be killed. Mitigation:
> add a `sessionVersion` claim compared against `User.sessionVersion`.

### `GET /api/auth/me`

Returns the decoded session, or `401`.

---

## 4.4 Messenger webhook

### `GET /api/messenger/webhook` — Meta verification

| Query param | Value |
| --- | --- |
| `hub.mode` | must be `subscribe` |
| `hub.verify_token` | must equal `META_VERIFY_TOKEN` |
| `hub.challenge` | echoed back as `text/plain` |

| Status | Body | Cause |
| --- | --- | --- |
| `200` | `<challenge>` (plain text) | success |
| `403` | `{error, hint}` — the hint names the exact failing param | mismatch |
| `503` | `{error, hint, docs}` | `META_VERIFY_TOKEN` not set |

The hint logic is precise and worth quoting in support tickets:

```
mode !== "subscribe"       → "hub.mode must be subscribe"
!token                     → "hub.verify_token query param is missing"
token !== expected         → "hub.verify_token does not match META_VERIFY_TOKEN"
otherwise                  → "hub.challenge is missing"
```

### `POST /api/messenger/webhook` — event delivery

Headers: `X-Hub-Signature-256: sha256=<hex hmac of raw body with META_APP_SECRET>`.

Verification uses `crypto.timingSafeEqual` after a length check — no early-exit
string comparison.

**Request** — standard Meta page webhook envelope:

```json
{
  "object": "page",
  "entry": [{
    "id": "<PAGE_ID>",
    "messaging": [{
      "sender":    { "id": "<PSID>" },
      "recipient": { "id": "<PAGE_ID>" },
      "timestamp": 1735689600000,
      "message": {
        "mid": "m_abc123",
        "text": "কুর্তি দাম কত?",
        "attachments": [{ "type": "image", "payload": { "url": "https://..." } }]
      }
    }]
  }]
}
```

**200**

```json
{
  "ok": true,
  "processed": 1,
  "results": [
    { "handled": true, "reason": "reply_llm", "replyPreview": "কুর্তির দাম ৳1,250…" }
  ]
}
```

**`reason` vocabulary** — the complete set returned by `handleInboundMessage`:

| `reason` | Meaning |
| --- | --- |
| `duplicate_mid_skipped` | Meta redelivered an already-processed `mid` |
| `operator_echo_handoff` | Page operator replied → handoff enabled |
| `handoff_cleared` | Customer typed `bot on` / `resume` / `এআই চালু` |
| `handoff_active_skip` | A human owns the thread; bot stayed silent |
| `handoff_active_after_ai_skip` | Human took over *while* the LLM was generating |
| `escalate_refund` / `escalate_legal` / `escalate_angry` | Guardrail hit |
| `escalate_low_confidence` | Confidence below `confidenceThreshold` |
| `complaint_detected` | Complaint row created |
| `product_recognition` | Image matched a catalog product heuristically |
| `image_vision` | Image sent to a multimodal model |
| `image_ack_stub` | Image acknowledged, no vision available |
| `order_tracking` | Answered a "where is my order" question |
| `order_captured` | Order parsed and stored (`orderId` also returned) |
| `product_image_sent` / `product_image_via_rules` | Catalog image sent |
| `reply_llm` / `reply_rules` / `reply_fallback` | Normal reply, by source |
| `reply_skipped_no_token` | Reply generated but `META_PAGE_ACCESS_TOKEN` missing |
| `empty` | No text and no image → `handled: false` |
| `error` | Exception; logged as `[webhook] handle error:` |

| Status | Cause |
| --- | --- |
| `401` | signature mismatch, or `META_APP_SECRET` unset in production |
| `400` | body is not valid JSON |
| `200` | always, once the signature passes — even if individual events error |

> In development (`NODE_ENV !== "production"`) with no `META_APP_SECRET`,
> unsigned POSTs are accepted so you can replay fixtures with `curl`.

---

## 4.5 Public conversational endpoints

### `POST /api/webchat`

Website chat widget. Creates `channel: "web"` conversations in the same store.

```json
{
  "text": "Kurti dam koto?",
  "senderId": "web_a1b2c3d4e5",
  "senderName": "Website visitor",
  "tenantId": "tenant_demo",
  "reply": true
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `text` | ✅ | trimmed, truncated to **2000 chars** |
| `senderId` | — | auto-generated `web_<10 hex>` when absent |
| `senderName` | — | defaults to `"Website visitor"` |
| `tenantId` | — | **only honoured with a matching session**, else silently downgraded |
| `reply` | — | `false` → ingest only, no AI call |

**200**

```json
{
  "ok": true,
  "channel": "web",
  "conversationId": "conv_...",
  "senderId": "web_a1b2c3d4e5",
  "message": { "id": "msg_...", "direction": "inbound", "text": "..." },
  "reply": "কুর্তির দাম ৳1,250। স্টক আছে ৮টি।"
}
```

### `POST /api/bot/reply`

Reply generator with **no** Messenger send — for local testing and QA fixtures.

```json
{ "text": "কোন প্রোডাক্ট সাজেস্ট করবে?", "imageUrl": "https://...", "tenantId": "..." }
```

**200**

```json
{
  "ok": true,
  "reply": "সাজেস্টেড প্রোডাক্ট: …",
  "source": "llm",
  "model": "qwen2.5:7b-instruct",
  "provider": "ollama",
  "note": "This endpoint does not send to Messenger — use /api/messenger/webhook for live Page traffic."
}
```

`source` ∈ `llm` | `rules` | `fallback`. At least one of `text`/`imageUrl` is
required (`400` otherwise).

> This route feeds the tenant's *private* system prompt and knowledge base to the
> model, which is exactly why `resolvePublicTenantId` guards it. Never re-add
> raw `body.tenantId` trust here.

### `POST /api/leads` · `POST /api/orders`

Public capture endpoints used by the landing page forms. Both validate first and
return `{ error }` with `400` on failure; both optionally forward the row as
JSON to `LEADS_WEBHOOK_URL` / `ORDERS_WEBHOOK_URL`.

### `GET|POST /api/comments`

Comment AI. **`liveGraph: false`** — nothing is sent to or deleted from Meta.

`GET` returns the current posture:

```json
{
  "ok": true,
  "status": "partial",
  "feature": "comment_auto_reply_spam_lead_capture",
  "liveGraph": false,
  "settings": { "autoReplyEnabled": true, "spamKeywordCount": 12, "leadCaptureEnabled": true },
  "requiredForLiveMeta": [
    "pages_manage_engagement / pages_read_engagement (App Review)",
    "Webhook field: feed subscribed",
    "Page access token"
  ]
}
```

`POST` processes one comment:

```json
{ "text": "দাম কত?", "authorName": "Rahim", "commentId": "...", "postId": "...", "phone": "01712345678" }
```

**200**

```json
{
  "ok": true,
  "liveGraph": false,
  "spamAction": null,
  "autoReply": { "wouldSend": true, "text": "…", "note": "Stored; Meta Graph send when Page token + permissions ready." },
  "leadId": "lead_...",
  "event": { "id": "cev_...", "isSpam": false, "autoReplied": true }
}
```

---

## 4.6 Connect (Facebook Page)

### `GET /api/connect`

Session required. Returns everything the Connect wizard needs.

```json
{
  "ok": true,
  "connect": { "appId": true, "appSecret": true, "redirectUri": true },
  "pages": [ { "id": "page_...", "pageId": "1234", "pageName": "My Shop",
               "accessToken": "[redacted]", "status": "pending", "mode": "oauth",
               "permissionsOk": false, "webhookSubscribed": false } ],
  "loginUrl": "https://www.facebook.com/v21.0/dialog/oauth?...",
  "mode": "oauth_ready",
  "docs": { "steps": [ … ], "note": "Without META_APP_ID credentials, use Demo Connect…" }
}
```

`mode` is `oauth_ready` when both `META_APP_ID` and `META_REDIRECT_URI` are set,
otherwise `demo_only`. `loginUrl` is `null` in `demo_only`.

### `POST /api/connect`

| `action` | Body | Effect |
| --- | --- | --- |
| `demo_connect` | `{ pageName? }` | Marks existing demo pages disconnected, creates a new `demo_page_<ts>` with `status: "active"` |
| `select_page` | `{ pageId?, pageName? }` | Records a `pending` OAuth page stub |

Unknown action → `400 {"error": "Unknown action."}`.

### `GET /api/connect/callback`

The OAuth redirect target. Always ends in a **302 to `/dashboard/connect`** with
either `?connected=<PageName>` or `?error=<message>`.

Full flow and its gaps: [`05-messenger-connect.md`](./05-messenger-connect.md).

---

## 4.7 Dashboard API

All require a session. All operate strictly on `session.tenantId`.

### `GET /api/dashboard/summary`

Overview KPI cards: today's chats, orders, revenue, conversion, open leads, AI
cost estimate (`AI_COST_PER_1K`).

### `/api/dashboard/chats`

| Method | Purpose |
| --- | --- |
| `GET` | List threads; `?id=` returns one thread with messages (`404` if not in tenant) |
| `POST` | Ingest a message into a thread (`400` if `text` missing) |
| `PATCH` | Thread actions — requires ≥ `agent` |

`PATCH` actions: take handoff, leave handoff, add note. Unknown action → `400`.
Every handoff transition writes an `AuditLog` row.

### `/api/dashboard/orders`

| Method | Purpose |
| --- | --- |
| `GET` | List orders for the tenant |
| `POST` | Create; runs `validateOrder` → `400 {error}` on failure |
| `PATCH` | Update status / tracking / courier fields |

### `GET /api/dashboard/orders/[id]/invoice`

Returns a rendered invoice for one order. `404` when the order is not in the
caller's tenant.

### `/api/dashboard/products`

Full CRUD (`GET`/`POST`/`PATCH`/`DELETE`). `POST` requires `name`. `DELETE`
requires `id`.

### `/api/dashboard/recommendations`

`GET` lists products with their relation arrays; `PATCH` edits
`upsellOf` / `crossSellOf` / `bundleWith` for one product id.

### `/api/dashboard/knowledge`

| Method | Purpose |
| --- | --- |
| `GET` | FAQ items, KB documents, current bot config |
| `PUT` | Action-dispatched: FAQ upsert, `stub_notion`, `save_config`, … |
| `POST` | File upload → extract → `chunkText` → embed → `KbChunk` rows |

`PUT` with `action: "save_config"` returns **403** for role `agent`
(`"Agents cannot edit bot config."`). Unknown action → `400`.

### `/api/dashboard/leads` · `/complaints` · `/comments` · `/ecommerce` · `/analytics`

Same shape: `GET` to read, `PATCH`/`PUT`/`POST` to mutate, `404` when the id does
not belong to the tenant, `400` for missing required fields.

`/api/dashboard/ecommerce` `POST` supports sync/import actions and returns
`400` with a specific message when the connection or platform is unusable.

### `/api/dashboard/team`

| Method | Guard |
| --- | --- |
| `GET` | any session — returns users **without** `passwordHash` |
| `POST` | `admin` or `manager` only → else `403 "Only Admin/Manager can add team members."` |

`POST` validates the role against the known set → `400 "Invalid role."`.
Creation writes `AuditLog` action `team.user_create`.

---

## 4.8 Platform admin API

### `/api/admin/config`

Legacy admin-lite knowledge editor. Accepts either a session **or** the
`x-admin-password` header matching `ADMIN_PASSWORD`. There is no unauthenticated
fallback in any environment.

### `/api/admin/tenants`

Cross-tenant console. Access requires `session.email === SUPER_ADMIN_EMAIL` —
a tenant's own `admin` role is **not** sufficient.

| Method | Purpose | Errors |
| --- | --- | --- |
| `GET` | List all tenants | `401` no session · `403` not super admin |
| `PATCH` | `{ tenantId, disabled }` — enable/disable a tenant | `400` bad body · `403` · `500` |

Disabling writes `AuditLog` action `tenant.disable` / `tenant.enable` and
immediately blocks that tenant's logins.

---

## 4.9 Webhook payloads emitted by ReplyPilot AI

When `LEADS_WEBHOOK_URL` / `ORDERS_WEBHOOK_URL` are set, each captured row is
POSTed as JSON (fire-and-forget, no retry).

```jsonc
// → LEADS_WEBHOOK_URL
{
  "id": "lead_...", "tenantId": "tenant_demo",
  "name": "Rahim", "phone": "01712345678",
  "businessType": "clothing", "interest": "monthly",
  "source": "landing_form", "crmStage": "new",
  "createdAt": "2026-08-03T09:12:44.000Z"
}
```

```jsonc
// → ORDERS_WEBHOOK_URL
{
  "id": "ord_...", "tenantId": "tenant_demo",
  "invoiceNumber": "INV-2026-0041",
  "name": "Rahim", "phone": "01712345678",
  "product": "Cotton Kurti — Maroon", "qty": "2",
  "unitPrice": 1250, "status": "new", "trackingStatus": "new",
  "createdAt": "2026-08-03T09:14:02.000Z"
}
```

> ⚠️ These deliveries are not retried and not signed. If the Apps Script
> endpoint is down the row is silently lost from the sheet (it remains in
> Postgres). Tracked as **GAP-16**.

---

## 4.10 Copy-paste QA suite

```bash
BASE=http://127.0.0.1:3000

# health
curl -s $BASE/api/health | jq

# rules / llm reply
curl -s -X POST $BASE/api/bot/reply -H 'Content-Type: application/json' \
  -d '{"text":"কোন প্রোডাক্ট সাজেস্ট করবে?"}' | jq

# web chat ingest + reply
curl -s -X POST $BASE/api/webchat -H 'Content-Type: application/json' \
  -d '{"text":"Kurti dam koto?"}' | jq

# escalation guardrail — expect reason escalate_refund
curl -s -X POST $BASE/api/bot/reply -H 'Content-Type: application/json' \
  -d '{"text":"amar taka ferot chai"}' | jq

# webhook verification (403 expected with a wrong token)
curl -si "$BASE/api/messenger/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42"

# webhook delivery (dev only, unsigned)
curl -s -X POST $BASE/api/messenger/webhook -H 'Content-Type: application/json' -d '{
  "object":"page",
  "entry":[{"id":"PAGE_1","messaging":[{"sender":{"id":"PSID_1"},
    "recipient":{"id":"PAGE_1"},"message":{"mid":"m_test_1","text":"দাম কত?"}}]}]
}' | jq

# replay the same mid — expect duplicate_mid_skipped
curl -s -X POST $BASE/api/messenger/webhook -H 'Content-Type: application/json' -d '{
  "object":"page",
  "entry":[{"id":"PAGE_1","messaging":[{"sender":{"id":"PSID_1"},
    "recipient":{"id":"PAGE_1"},"message":{"mid":"m_test_1","text":"দাম কত?"}}]}]
}' | jq

# login + session-bound call
curl -s -c /tmp/rp.jar -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.replypilot.local","password":"facetai-demo"}' | jq
curl -s -b /tmp/rp.jar $BASE/api/dashboard/summary | jq

# cross-tenant probe — must come back scoped to the default tenant
curl -s -X POST $BASE/api/webchat -H 'Content-Type: application/json' \
  -d '{"text":"hi","tenantId":"tenant_someone_else"}' | jq
```

### Signed webhook request (production parity)

```bash
SECRET="$META_APP_SECRET"
BODY='{"object":"page","entry":[{"id":"PAGE_1","messaging":[{"sender":{"id":"PSID_1"},"recipient":{"id":"PAGE_1"},"message":{"mid":"m_sig_1","text":"হ্যালো"}}]}]}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -s -X POST $BASE/api/messenger/webhook \
  -H 'Content-Type: application/json' \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  -d "$BODY" | jq
```

---

**Next:** [`05-messenger-connect.md`](./05-messenger-connect.md)
