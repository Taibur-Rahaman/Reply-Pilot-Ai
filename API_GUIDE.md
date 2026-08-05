# API Guide

Practical reference for calling the ReplyPilot AI HTTP API. For the fuller endpoint-by-endpoint status/contract tracker, see [`docs/API.md`](docs/API.md).

Base URL: same origin as the app (e.g. `http://127.0.0.1:3000` locally). All bodies are JSON unless noted. Error responses look like `{ "error": "Human-readable message." }` with a matching HTTP status.

## Authentication

Dashboard/admin routes require a session cookie (`facetai_session`, httpOnly). Get one via login:

```bash
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"your-password"}' \
  -c cookies.txt
```

Then pass `-b cookies.txt` on subsequent requests. `POST /api/auth/logout` clears the cookie. `GET /api/auth/me` returns the current session or 401.

Rate limit: 10 attempts / 15 min per IP.

## Public endpoints (no auth)

These are meant to be called from the public website/chat widget or Meta. All are rate-limited per IP — expect a `429` with a `Retry-After` header if you exceed the limit.

| Endpoint | Limit | Purpose |
| --- | --- | --- |
| `POST /api/leads` | 20/hr | Website lead form → CRM + optional `LEADS_WEBHOOK_URL` |
| `POST /api/orders` | 20/hr | Normalize + store an order |
| `POST /api/webchat` | 30/5min | Website chat widget → AI reply, `channel=web` |
| `POST /api/bot/reply` | 20/10min | Generate a reply without sending anywhere (testing) |
| `POST /api/comments` | 30/hr | Facebook comment moderation (spam flag / auto-reply / lead capture) |
| `GET/POST /api/messenger/webhook` | — (Meta traffic) | Meta verify handshake + inbound Messenger events, signature-verified |
| `GET /api/health` | — | `{ ok, status }` — liveness probe for uptime monitoring |

```bash
curl -s -X POST http://127.0.0.1:3000/api/webchat \
  -H 'Content-Type: application/json' \
  -d '{"text":"Kurti dam koto?"}'

curl -s -X POST http://127.0.0.1:3000/api/bot/reply \
  -H 'Content-Type: application/json' \
  -d '{"text":"কোন প্রোডাক্ট সাজেস্ট করবে?"}'
```

The AI reply itself also has a per-tenant daily cap (`MAX_AI_REPLIES_PER_DAY`, default 500) — once hit, replies fall back to rule-based text instead of calling the paid LLM.

## Dashboard endpoints (session required)

All under `/api/dashboard/*`. `tenantId` is always derived from your session — never accepted from the request body — so you only ever see/modify your own tenant's data.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/dashboard/summary` | GET | Home KPIs + bundled lists (leads, orders, products, conversations, config) |
| `/api/dashboard/analytics` | GET | Analytics breakdowns |
| `/api/dashboard/chats` | GET, PATCH | Threads, messages, take/leave handoff, notes |
| `/api/dashboard/leads` | GET, PATCH | CRM stage updates, follow-up queue |
| `/api/dashboard/orders` | GET, POST, PATCH | Order list/create/update |
| `/api/dashboard/orders/[id]/invoice` | GET | Printable HTML invoice |
| `/api/dashboard/complaints` | GET, PATCH | Complaint queue |
| `/api/dashboard/products` | GET, POST, PATCH, DELETE | Catalog CRUD |
| `/api/dashboard/recommendations` | GET, PUT | Upsell/cross-sell/bundle config |
| `/api/dashboard/ecommerce` | GET, POST | Store connections, stub sync, CSV/JSON import |
| `/api/dashboard/knowledge` | GET, POST, PUT | FAQ, uploads, Prompt Builder + guardrails |
| `/api/dashboard/comments` | GET, POST | Comment AI settings + event log |
| `/api/dashboard/team` | GET, PUT | Team members / roles |

Role gates use `admin > manager > moderator > agent`; some actions (e.g. team management) require `manager` or above.

## Super-admin (cross-tenant)

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/admin/tenants` | GET, PATCH | List all tenants / disable-enable one |

Requires `session.email` to exactly match `SUPER_ADMIN_EMAIL` — a tenant's own `admin` role does not grant this.

## Admin-lite (legacy, single default tenant)

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/admin/config` | GET, PUT | Business name, greeting, system prompt, guardrails |

Auth via `x-admin-password` header matching `ADMIN_PASSWORD` (query-string auth was removed — it leaked into logs).

## Error shape and status codes

| HTTP | Meaning |
| --- | --- |
| 400 | Validation failure |
| 401 | Missing/invalid session |
| 403 | Authenticated but not authorized (role or super-admin check) |
| 429 | Rate limited — see `Retry-After` header |
| 500 | Unexpected server error |
| 503 | `/api/health` when Postgres is unreachable |
