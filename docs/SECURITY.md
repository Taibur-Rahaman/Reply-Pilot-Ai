# FaceTai — Security

> **Status:** Implementation security contract + pilot gates — 2026-08-21  
> **Canonical execution:** [`REAL-APPROACH.md`](./REAL-APPROACH.md)  
> **Related:** [`BUSINESS_DECISIONS.md`](./BUSINESS_DECISIONS.md) · [`API.md`](./API.md) · [`AI_GUARDRAILS.md`](./AI_GUARDRAILS.md)

---

## Security posture

The repository already contains meaningful security controls. The remaining milestone is to **prove coverage across every route and remove known production gaps**.

### Implemented foundations

- bcrypt password hashing
- signed JWT HTTP-only session cookie
- production refusal when `SESSION_SECRET` is missing/too short
- role helpers for `admin > manager > moderator > agent`
- tenant-scoped Prisma repositories
- append-style audit-log persistence
- public endpoint rate limiting
- Messenger signature verification support
- Messenger message deduplication
- secret values kept in environment configuration rather than source

These are not automatically "production-ready" until Wave A/B tests verify the complete route surface.

---

## Authentication

| Topic | Rule | Status |
| --- | --- | --- |
| Dashboard login | Email + password per tenant user | Implemented |
| Passwords | bcrypt hashes only | Implemented |
| Session | Signed JWT in HTTP-only cookie | Implemented |
| Production secret | Long random `SESSION_SECRET` required | Implemented fail-closed behavior |
| Session expiry | 14-day signed token in current implementation | Implemented; review rotation policy before production |
| Legacy admin header | Only works with explicit `ADMIN_PASSWORD` | Compatibility path; minimize/remove later |

**Never** restore unsigned/base64 session fallback behavior.

---

## Authorization & tenancy

| Topic | Rule | Status |
| --- | --- | --- |
| Roles | `admin` · `manager` · `moderator` · `agent` | Implemented |
| Dashboard auth | Session required | Implemented on dashboard paths; verify every mutation |
| Role gates | Fail closed with 403 | Helpers implemented; endpoint matrix required |
| Tenant scope | Derive from trusted session for dashboard data | Implemented in repository layer; test all routes |
| Cross-tenant | Default deny | Required acceptance test |
| Super Admin | Separate platform/admin capability | Scaffold/verify |

### Critical pilot requirement

Any webhook or public request that cannot unambiguously resolve a tenant must **fail closed**. It must never silently fall back to the demo tenant in production.

---

## Secrets

| Secret | Storage |
| --- | --- |
| User passwords | bcrypt hashes in DB |
| `SESSION_SECRET` | Environment secret |
| `ADMIN_PASSWORD` | Environment secret; production explicit |
| `META_*`, `OPENAI_API_KEY` / `AI_*` | Environment only |
| Page access tokens | Current DB persistence exists; **production encryption-at-rest must be completed before Connect launch** |
| Webhook verify tokens | Environment; rotate if leaked |
| `.env*` | Gitignored; `.env.example` contains names only |

**Logging:** redact tokens, Authorization headers, password fields and unnecessary PII.

---

## PII & privacy

| Data | Guidance |
| --- | --- |
| Collected | Name, phone, address for COD orders; conversation/CRM data needed for service |
| Consent | Explain why phone/address is needed before collecting unnecessary PII |
| Retention | Define and implement tenant/product retention before production scale |
| Deletion | Delete subject-linked messages, leads, orders/CRM records and embeddings according to policy |
| Training | Never use one tenant's chats as another tenant's training context |
| Bangla UX | Privacy copy should be available in BN for customer-facing flows |

Retention periods remain an operational decision; do not present the old proposed values as an implemented guarantee.

---

## Channel security

| Channel | Controls |
| --- | --- |
| Messenger | Verify Meta signature in production; resolve Page → tenant fail-closed; deduplicate message IDs |
| Website chat | Rate limits + explicit tenant/embed identity before multi-tenant public launch |
| Future WA/IG/TG | Provider signature verification + same tenant-resolution rules |
| Connect | OAuth state validation + encrypted token storage required before production launch |

---

## Audit

Audit records exist in the data model and repository. The pilot gate is coverage, not existence.

Required events include:

- auth success/failure without passwords
- bot config / guardrail changes
- KB upload/reindex
- handoff take/release
- team role changes
- tenant enable/disable
- security-sensitive integration changes

Audit failures should not silently erase evidence. Decide fail-open/fail-closed per event class during Wave B.

---

## Hosting and durability

- PostgreSQL must be durable and managed with TLS in production.
- Local application disk must **not** be the sole store for chats, CRM, or KB assets.
- Current KB uploads use local filesystem storage and must move to durable object storage/persistent volume before pilot deployment.
- Secrets belong in the hosting platform's secret manager/environment.
- Observability must capture authentication failures, webhook failures, AI failures and database failures without logging secrets.

---

## Incident basics

1. Rotate leaked Meta/AI/database credentials immediately.
2. Rotate `SESSION_SECRET` if session compromise is suspected and force session invalidation.
3. Investigate cross-tenant access as a P0.
4. Preserve relevant audit evidence.
5. Notify affected tenants when confirmed PII/cross-tenant exposure meets incident criteria.

---

## Security exit gate

Before the Sales Agent pilot:

- [ ] Clean production-like environment passes auth/RBAC tests.
- [ ] Cross-tenant negative tests pass.
- [ ] Public rate-limit behavior is verified under deployment topology.
- [ ] Messenger signature verification is mandatory in production.
- [ ] Webhook tenant resolution fails closed.
- [ ] Connect token handling is not marketed as production until encrypted.
- [ ] KB storage is durable.
- [ ] Secrets are absent from logs and repository history.
- [ ] Audit coverage is verified.

---

## Version history

| Date | Notes |
| --- | --- |
| 2026-07-26 | Phase 0 security baseline |
| 2026-08-21 | Rebased on actual auth/RBAC/audit implementation and added production security gates |
