# ReplyPilot AI — API Contracts

> **Status:** Implementation contract — 2026-08-21  
> **Canonical execution:** [`REAL-APPROACH.md`](./REAL-APPROACH.md)  
> See [`../API_GUIDE.md`](../API_GUIDE.md) for a practical calling reference.  
> **Related:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`SECURITY.md`](./SECURITY.md) · [`PRD.md`](./PRD.md)  
> Status: **Implemented** (route exists and behavior is implemented) · **Partial** · **Scaffold** · **Planned**

Base URL: same origin as the Next.js app (e.g. `http://127.0.0.1:3000`). JSON unless noted. Dashboard routes require session cookie unless stated.

---

## Auth

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | **Implemented** | Email/password → signed HTTP-only session cookie; 401 on failure |
| `POST` | `/api/auth/logout` | **Implemented** | Clears session |
| `GET` | `/api/auth/me` | **Implemented** | `{ user, tenant, role }` or 401 |

Production gate: verify secret entropy, cookie flags, session expiry/rotation expectations and invalid-session fail-closed behavior.

---

## Public / marketing

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `POST` | `/api/leads` | **Implemented** | Validated lead → tenant/demo handling + optional `LEADS_WEBHOOK_URL` |
| `GET` | `/api/health` | **Implemented** | Database health → `{ ok, status }` with 200/503 behavior |

---

## Channels

### Website chat

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `POST` | `/api/webchat` | **Implemented** | `{ text, sessionId?, visitorId? }` → reply + persistent conversation/message records |
| — | Embed key / public tenant identification | **Partial** | Production multi-tenant embed security still requires explicit verification |

### Messenger

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `GET` | `/api/messenger/webhook` | **Implemented** | Meta verification challenge |
| `POST` | `/api/messenger/webhook` | **Implemented** | Signature verification when configured, inbound normalization, deduplication and reply pipeline |

Production gate: real Meta configuration, signature-required policy, page-to-tenant fail-closed behavior and retry/observability tests.

### Comments

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `POST` | `/api/comments` | **Partial** | Spam flag, auto-reply/lead logic |
| `GET`/`POST` | `/api/comments/stub` | **Scaffold** | Graph delete/reply integration shape; not a live Graph integration |

### Connect (F39)

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `GET`/`POST` | `/api/connect` | **Scaffold / Partial** | Demo/OAuth flow shape when Meta env is present |
| `GET` | `/api/connect/callback` | **Scaffold / Partial** | OAuth callback and page persistence path |

Do not market self-serve Connect as production-ready until the real OAuth/Page selection/subscription flow is tested and token protection is complete.

---

## Bot helpers

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `POST` | `/api/bot/reply` | **Implemented** | Test AI/rules reply without channel send |
| `POST` | `/api/orders` | **Implemented** | Normalize order JSON → Postgres + optional webhook |

---

## Admin-lite

| Method | Path | Status | Contract |
| --- | --- | --- | --- |
| `GET`/`PUT` | `/api/admin/config` | **Implemented / compatibility** | Config/FAQ update path; legacy password header requires explicit `ADMIN_PASSWORD` |

---

## Dashboard (session + RBAC)

All under `/api/dashboard/*`. Role keys are `admin | manager | moderator | agent`.

| Method | Path | Status | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/dashboard/summary` | **Implemented / verify KPIs** | Home summary |
| `GET`/`PATCH` | `/api/dashboard/chats` | **Implemented / verify handoff semantics** | Inbox threads; take/leave/notes behavior |
| `GET`/`PATCH` | `/api/dashboard/leads` | **Implemented** | CRM stages |
| `GET`/`POST`/`PATCH` | `/api/dashboard/orders` | **Implemented** | Order list/create/update |
| `GET` | `/api/dashboard/orders/[id]/invoice` | **Implemented** | Printable HTML invoice |
| `GET`/`PATCH` | `/api/dashboard/complaints` | **Implemented** | Complaint queue |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/dashboard/products` | **Implemented** | Catalog CRUD |
| `GET`/`PUT` | `/api/dashboard/recommendations` | **Implemented** | Relation / upsell settings |
| `GET`/`POST` | `/api/dashboard/ecommerce` | **Partial** | Connection + stub sync/import |
| `GET`/`POST`/`PUT` | `/api/dashboard/knowledge` | **Implemented / RAG verify** | FAQ/uploads/index/retrieval |
| `GET`/`POST` | `/api/dashboard/comments` | **Partial** | Comment AI settings/simulator |
| `GET`/`PUT` | `/api/dashboard/team` | **Implemented / RBAC verify** | Team members and roles |
| `GET` | `/api/dashboard/analytics` | **Implemented / KPI verify** | Analytics counts/metrics |

### Phase 1 acceptance endpoints

The older roadmap listed these as future endpoints. Treat them as **required behavior**, not automatic implementation claims:

| Endpoint | Requirement | Status rule |
| --- | --- | --- |
| `/api/dashboard/chats/[id]/take` | Human claims thread; AI silent | Implement only if existing route does not already provide equivalent behavior |
| `/api/dashboard/chats/[id]/release` | Return control to AI | Same |
| `/api/dashboard/chats/[id]/notes` | Agent note → CRM timeline | Same |
| `/api/dashboard/customers/[id]/timeline` | Unified events | Required milestone behavior |
| `/api/dashboard/audit` | Append-only audit | Required milestone behavior |
| `/api/dashboard/knowledge/reindex` | Explicit KB reindex | Required if current UI cannot trigger equivalent indexing |

Do not create duplicate endpoints simply to match an old document. First verify whether the current implementation already satisfies the contract through another route.

### Super Admin

| Method | Path | Status | Purpose |
| --- | --- | --- | --- |
| `GET`/`PATCH` | `/api/platform/tenants` or current equivalent | **Scaffold / verify** | Tenant list/disable; billing is future |

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
| 429 | Rate limit |
| 500 | Unexpected |

---

## Webhook reliability

- Messenger should verify `X-Hub-Signature-256` in production.
- Inbound Messenger events are deduplicated by Meta message ID before processing.
- Keep webhook acknowledgement fast; introduce a queue only when measured load requires it.

## Rate limiting

Current public-sensitive endpoints use in-memory per-process rate limiting. This is acceptable for local/single-instance development but **is not a complete distributed production abuse-control strategy**. Pilot deployment must decide whether the host topology requires a shared limiter.

---

## Version history

| Date | Notes |
| --- | --- |
| 2026-07-26 | Phase 0 contracts from existing routes + Phase 1 planned endpoints |
| 2026-08-21 | Reclassified routes by implementation reality; added production verification gates and duplicate-endpoint rule |
