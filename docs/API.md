# FaceTai — API Contracts

> **Status:** Contract doc (Phase 0) — 2026-07-26  
> **Related:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`SECURITY.md`](./SECURITY.md) · [`PRD.md`](./PRD.md)  
> Status on each row: **Current** (in repo) · **Partial** · **Planned** (Phase 1+ shape)

Base URL: same origin as the Next.js app (e.g. `http://127.0.0.1:3000`).  
JSON unless noted. Dashboard routes require session cookie unless stated.

---

## Auth

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | **Current** → harden Phase 1 | Body: `{ email, password }` → Set-Cookie session; 401 on fail |
| `POST` | `/api/auth/logout` | **Current** | Clears session |
| `GET` | `/api/auth/me` | **Current** | `{ user, tenant, role }` or 401 |

**Phase 1:** hashed password verify; signed/encrypted session (not plaintext cookie payload).

---

## Public / marketing

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `POST` | `/api/leads` | **Current** | Body: name, phone, business, interest (validate) → store + optional `LEADS_WEBHOOK_URL` |

---

## Channels

### Website chat

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `POST` | `/api/webchat` | **Current** | Body: `{ text, sessionId?, visitorId? }` → bot reply + persist `channel=web` |
| — | Embed key | **Planned** Phase 1 | Tenant embed snippet + API key header for multi-tenant public sites |

### Messenger

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `GET` | `/api/messenger/webhook` | **Current** | Meta verify challenge (`hub.mode`, `hub.verify_token`, `hub.challenge`) |
| `POST` | `/api/messenger/webhook` | **Current** | Inbound events; `X-Hub-Signature-256` when `META_APP_SECRET` set; ACK fast; run pipeline |

### Comments

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `POST` | `/api/comments` | **Partial** | Process text: spam flag, auto-reply draft, lead capture |
| `GET`/`POST` | `/api/comments/stub` | **Current** | Checklist stub for Graph delete/reply |

### Connect (F39)

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `GET`/`POST` | `/api/connect` | **Partial** | Start Demo Connect / OAuth when env present |
| `GET` | `/api/connect/callback` | **Partial** | OAuth callback; persist Page token per tenant (encrypt Phase 3 Done) |

---

## Bot helpers

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `POST` | `/api/bot/reply` | **Current** | Body: `{ text, tenantId? }` → generate reply **without** channel send (test) |
| `POST` | `/api/orders` | **Current** | Normalize order JSON → store + optional `ORDERS_WEBHOOK_URL` |

---

## Admin-lite

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `GET`/`PUT` | `/api/admin/config` | **Current** | Password header / session; FAQ, greeting, product image |

---

## Dashboard (session + RBAC)

All under `/api/dashboard/*`. Phase 1: enforce roles (`admin` | `manager` | `moderator` | `agent`).

| Method | Path | Status | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/dashboard/summary` | **Partial** | Home KPIs (expand Phase 1) |
| `GET`/`PATCH` | `/api/dashboard/chats` | **Partial** | List threads; take/leave/notes Phase 1 |
| `GET`/`PATCH` | `/api/dashboard/leads` | **Partial** | CRM stages |
| `GET`/`POST`/`PATCH` | `/api/dashboard/orders` | **Current** | Order list/create/update |
| `GET` | `/api/dashboard/orders/[id]/invoice` | **Current** | Printable HTML invoice |
| `GET`/`PATCH` | `/api/dashboard/complaints` | **Partial** | Complaint queue |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/dashboard/products` | **Current** | Catalog CRUD |
| `GET`/`PUT` | `/api/dashboard/recommendations` | **Current** | Relation / upsell settings |
| `GET`/`POST` | `/api/dashboard/ecommerce` | **Partial** | Connect + stub sync + CSV/JSON import |
| `GET`/`POST`/`PUT` | `/api/dashboard/knowledge` | **Partial** | FAQ/uploads; RAG index Phase 1 |
| `GET`/`POST` | `/api/dashboard/comments` | **Partial** | Comment AI settings / simulator |
| `GET`/`PUT` | `/api/dashboard/team` | **Partial** | Team members; RBAC enforce Phase 1 |
| `GET` | `/api/dashboard/analytics` | **Partial** | Thin counts → richer Phase 1–2 |

### Planned Phase 1 additions

| Method | Path | Contract |
| --- | --- | --- |
| `POST` | `/api/dashboard/chats/[id]/take` | Human claims thread; AI silent |
| `POST` | `/api/dashboard/chats/[id]/release` | Return to AI |
| `POST` | `/api/dashboard/chats/[id]/notes` | Agent note → CRM timeline |
| `GET` | `/api/dashboard/customers/[id]/timeline` | Unified events |
| `GET` | `/api/dashboard/audit` | Append-only audit (admin/manager) |
| `POST` | `/api/dashboard/knowledge/reindex` | Chunk/embed KB |

### Planned Super Admin

| Method | Path | Phase |
| --- | --- | --- |
| `GET`/`PATCH` | `/api/platform/tenants` | Phase 1 scaffold list/disable; billing Phase 5 |

---

## Error shape

```json
{ "error": "machine_code", "message": "Human-readable" }
```

| HTTP | Use |
| --- | --- |
| 400 | Validation |
| 401 | Unauthenticated |
| 403 | Authenticated but RBAC deny / wrong tenant |
| 404 | Missing resource (tenant-scoped) |
| 429 | Rate limit (webhooks / public chat) |
| 500 | Unexpected |

---

## Webhook reliability

- Messenger: verify signature when secret configured; respond 200 quickly; process pipeline sync in Phase 1 (queue later if timeouts).
- Idempotency: prefer dedupe on provider message ids when persisting.

---

## Version history

| Date | Notes |
| --- | --- |
| 2026-07-26 | Phase 0 contracts from existing routes + Phase 1 planned endpoints |
