# FaceTai — Security

> **Status:** Phase 0 policy — 2026-07-26  
> **Related:** [`BUSINESS_DECISIONS.md`](./BUSINESS_DECISIONS.md) · [`API.md`](./API.md) · [`AI_GUARDRAILS.md`](./AI_GUARDRAILS.md)

---

## Goals

- Protect tenant data isolation.
- Harden auth before production scale.
- Keep secrets out of git and logs.
- Minimize PII; honor consent and deletion.

---

## Authentication

| Topic | Rule |
| --- | --- |
| Dashboard login | Email + password per tenant user |
| Phase 1 | Passwords hashed (bcrypt or argon2); **no plaintext** demo passwords in production |
| Session | Signed (or encrypted) HTTP-only cookie; rotate on login; clear on logout |
| Today (honest) | Cookie session exists; demo credentials — treat as **Partial** until Phase 1 Done |
| Public APIs | Leads / webchat: rate-limit; Phase 1 embed API key for multi-tenant widgets |
| Webhooks | Meta signature (`X-Hub-Signature-256`) required when `META_APP_SECRET` set; prod must set secret |

---

## Authorization & tenancy

| Topic | Rule |
| --- | --- |
| Roles | `admin` · `manager` · `moderator` · `agent` (map to PRD personas) |
| Enforcement | Every `/api/dashboard/*` checks session **and** role; fail closed (403) |
| Agent limits | `agent` cannot edit team, billing, or global bot secrets |
| Tenant scope | All queries filter `tenantId` from session (or Page→tenant map for webhooks) |
| Cross-tenant | Default deny; automated tests for isolation in Phase 1 |
| Super Admin | Separate platform route; list/disable tenants only in Phase 1 scaffold — no tenant data browsing without explicit audit |

---

## Secrets

| Secret | Storage |
| --- | --- |
| `ADMIN_PASSWORD` / user password hashes | Env / DB hashes — never commit |
| `META_*`, `OPENAI_API_KEY` / `AI_*` | Env only |
| Page tokens (Connect) | Encrypted at rest per tenant; never log plaintext |
| Webhook verify tokens | Env; rotate if leaked |
| `.env*` | Gitignored; `.env.example` documents names without values |

**Logging:** Redact tokens, Authorization headers, raw password fields, full card/PII dumps.

---

## PII & privacy

| Data | Guidance |
| --- | --- |
| Collected | Name, phone, address for COD orders; chat transcripts as needed for reply/CRM |
| Consent | State purpose when collecting phone/address; no unnecessary PII in prompts beyond need |
| Retention (proposed) | Conversations ~90 days; orders ~24 months — confirm ops; document deletions |
| Deletion | Process for customer/tenant delete-on-request; scrub messages + leads + embeddings for that subject |
| Training | Do not use one tenant’s chats to train another tenant’s models |
| Bangla UX | Privacy copy available in BN where user-facing |

See also [`AI_GUARDRAILS.md`](./AI_GUARDRAILS.md) — consent before PII collection in chat.

---

## Channel security

| Channel | Controls |
| --- | --- |
| Messenger | App Secret signature; Page token scoped; dual-mode env vs Connect vault |
| Website chat | Origin/embed key (Phase 1); abuse rate limits |
| Future WA/IG/TG | Provider signature verify; same tenant resolution rules |

---

## Audit

Phase 1 append-only audit events (tenant-scoped):

- Auth success/failure (no password in event)
- Bot config / Prompt Builder / guardrail changes
- KB upload / reindex
- Handoff take / release
- Team role changes

Super Admin actions audited at platform level.

---

## Hosting notes

- Ephemeral filesystem: **never** sole store for auth sessions lasting across instances, chats, or KB.
- Prefer managed Postgres with TLS.
- Render/Vercel: secrets via platform env; bind correctly; case-sensitive paths on Linux.

---

## Incident basics

1. Rotate leaked tokens immediately (Meta, AI, DB).
2. Invalidate sessions if cookie signing key rotates.
3. Notify affected tenants on confirmed cross-tenant or PII exposure.

---

## Version history

| Date | Notes |
| --- | --- |
| 2026-07-26 | Phase 0 security baseline |
