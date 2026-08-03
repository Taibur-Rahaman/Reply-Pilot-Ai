# FaceTai — Long-Term AI Memory

| Field | Value |
| --- | --- |
| **Last updated** | 2026-07-26 |
| **Related** | [prd.md](./prd.md) · [architecture.md](./architecture.md) · [design.md](./design.md) · [phases.md](./phases.md) · [rules.md](./rules.md) |
| **Canonical product doc** | `docs/PRD.md` v2.0 |

Use this file as persistent memory across chats. Prefer updating the Decision log when the user resolves open questions.

---

## Project overview

FaceTai is a **Bangladesh-first AI Business Operating System**: hybrid software (Next.js Messenger/webchat bot + multi-tenant ops dashboard) and services (ManyChat-style setups + monthly retainers). Primary acquisition is a Bangla landing page with SaaS plans from **৳1,990/mo** and WhatsApp sales at **01810-285559**.

Stack: Next.js 16 + React 19 + TypeScript + Tailwind v4 + JSON multi-tenant store (`data/facetai-db.json`). No Prisma, no NextAuth, no Meta/OpenAI SDKs.

---

## Important business rules

1. **Hybrid model** — software + services; don’t erase service SKUs when building SaaS.
2. **Primary packaging** — SaaS Starter→Enterprise; legacy ৳990–৳4,900 is pure service unless upsold to Custom AI.
3. **Custom AI floor** — ৳15,000 minimum for full Custom AI feature set (Q1 resolved).
4. **Fair-use disclaimer** — never absolute zero API/hosting claims.
5. **Messenger first**, WhatsApp second; IG/TG/TikTok native bots are not MVP software.
6. **F39 Connect** is Must for true SaaS but **must not be marketed live** until Done criteria pass.
7. **No fake `m.me`** — only set `NEXT_PUBLIC_MESSENGER_URL` for real Pages.
8. **Bot must not invent** inventory/prices outside catalog/KB.
9. **Handoff silence** when operator replies; resume via `bot on` / `এআই চালু`.
10. **Tenant isolation** — Client A never sees Client B.
11. **1-hour support guarantee** is an ops SLA for paying clients (process), not only code.
12. **Brand** — FaceTai identity; not a competitor white-label clone.

---

## Architecture decisions (locked unless user overrides)

| Decision | Choice |
| --- | --- |
| App shape | Single Next.js App Router monolith |
| Bot entry | `/api/messenger/webhook` (path stable) |
| Data today | JSON file + `withDb` queue |
| Data preferred prod | Postgres (Q4 preference) |
| AI | OpenAI-compatible HTTP; rules fallback without key |
| Page auth transition | Env tokens **and** Connect (dual-mode) |
| Session | Cookie `facetai_session` |
| Design | Mint/teal + coral; Syne / Sora / Noto Sans Bengali |
| Deploy target | Vercel (ephemeral FS acknowledged) |
| Demo login | `admin@demo.facetai.local` / `ADMIN_PASSWORD` or `facetai-demo` |

---

## Completed features (demo / codebase)

- Landing OS positioning + SaaS pricing + lead form + WhatsApp CTAs
- WebChat widget → `/api/webchat`
- Messenger webhook + pipeline (BN rules/AI, handoff, orders, image send path)
- Product recognition heuristics + recommendation engine
- Dashboard: inbox, CRM, orders + HTML invoices, complaints, catalog, ecommerce UI, knowledge, comments AI, connect scaffold, team, thin analytics, roadmap
- Multi-tenant schema + seed (`tenant_demo`)
- Comment spam/auto-reply/lead processing (Graph actions need tokens)
- CSV/JSON product import
- QA 2026-07-20: 52 Pass / 0 Fail / 4 Blocked (credentials)

---

## Known issues

| Issue | Severity |
| --- | --- |
| Plain-text passwords in JSON | Critical for production |
| Page tokens unencrypted locally | High (F39) |
| `/api/bot/reply` unauthenticated | High in prod |
| JSON store unsafe on multi-instance serverless | High |
| Live Meta/OpenAI/Connect E2E blocked without secrets | Ops |
| RBAC mostly stub | Medium |
| Analytics thin vs F47 | Medium |
| Docs drift (PHASE2 vs PRD vs code) | Medium |
| Duplicated phone normalize / AI context assembly / session checks | Low–Medium |
| Deprecated `BusinessConfig` dual model | Low–Medium |
| Dashboard client-rendered shell → “Loading…” in raw HTML | Low (SEO/QA note) |
| Turbopack EMFILE watch warnings in some envs | Low |
| No automated test suite | Medium |
| No `.git` in workspace at KB creation | Process |

---

## Technical debt

1. Migrate off ephemeral JSON for production.
2. Hash passwords; encrypt tokens.
3. Unify leads entrypoints (`leads.ts` / `leads-compat.ts` / `db/leads.ts`).
4. Single AI reply facade for pipeline / webchat / bot reply.
5. Shared dashboard auth helper.
6. Retire or redirect `/admin` into dashboard knowledge.
7. Refresh `docs/PHASE2-AI-BOT.md` (still mentions stub-only comments / jsonl paths).
8. Align PRD milestone checkboxes with Current status.
9. Consolidate hardcoded WhatsApp number strings with `lib/config.ts`.

---

## Pending work

See [phases.md](./phases.md). Top of queue:

1. Production durability (Postgres or webhooks everywhere)
2. F39 Connect Done criteria
3. Auth hardening
4. Live ecommerce sync (one platform)
5. WhatsApp Cloud adapter
6. Tests for isolation + handoff + validation

---

## Future ideas (not committed)

- Native Android/iOS + push (F-mobile)
- Voice Calling AI (F45)
- Workflow builder (F49)
- Agency white-label (F50)
- Billing portal (F37)
- Split stack (Nest/FastAPI) — proposed in a draft chat; **not adopted**; stay Next.js unless user chooses otherwise
- Richer RAG memory beyond extracted KB text blobs

---

## Developer preferences (inferred)

- Minimal dependencies; raw `fetch` over SDKs
- Honest stub labeling over fake polish
- Bangla-first product voice
- Bind `127.0.0.1` by default for local stability
- Design: mint/teal/coral — avoid purple/cream-serif/dark-default clichés
- User commits only when asked
- Hybrid business model must remain visible in packaging

---

## NEVER change without explicit permission

1. SaaS price table (৳1,990 / ৳4,990 / ৳9,990 / ৳14,990 / Custom)
2. Custom AI floor ৳15,000
3. Sales WhatsApp **01810-285559**
4. Webhook path `/api/messenger/webhook`
5. Cookie name `facetai_session`
6. Claiming F39 “2-minute Connect” as live
7. Adding fake Messenger URLs
8. Removing rules fallback for AI
9. Removing env-token dual-mode before Connect Done
10. Rebrand colors/fonts away from Syne/Sora/teal/coral system
11. Expanding MVP to native IG/TG/TikTok FaceTai bots
12. Absolute “no API/hosting charge” marketing copy
13. Dropping `tenantId` from schema
14. Rewriting the app into a different framework/stack

---

## Frequently reused patterns

```text
API: try/catch → console.error("[api/…]") → NextResponse.json({ error }, { status })
Success: { ok: true, … }
Domain validate: { ok: true, data } | { ok: false, error }
DB write: await withDb(async (db) => { … })
Session: getSessionFromRequest / requireSession
IDs: newId("order")
Client dash: useState + useEffect fetch + local error string
CSS: .btn--primary | .dash__title | var(--signal) | var(--spark)
Bot: handoff check → build knowledge/catalog → generateAiReply || rulesReply → Graph send
```

Demo credentials: `admin@demo.facetai.local` / `facetai-demo` (or `ADMIN_PASSWORD`).

---

## Important assumptions

- Market = BD SMB / Facebook ads → Messenger / COD orders.
- Google Sheets via webhook is an acceptable ops sink for v1.
- Single demo tenant is fine for UI; schema must stay multi-tenant.
- Open questions in PRD §14 remain open — do not invent answers (invoice format Q2, host worker Q3, retention confirm Q7, Meta scopes Q12, couriers Q13, agency domains Q14).

---

## Current priorities

1. Keep documentation honesty (shipped vs stub).
2. Production data durability.
3. Finish Connect properly.
4. Security hardening (passwords, open test routes, tokens).
5. Deduplicate core bot/dashboard plumbing.
6. Add tests.

---

## Lessons learned

1. **PRD drift is real** — “Current status”, milestone checkboxes, and honesty notes can disagree; prefer code + QA for what works, Done checklists for what may be marketed.
2. **PHASE2 docs go stale quickly** — treat as sketch; PRD + code win.
3. **Ephemeral filesystem** bites immediately on Vercel — design for webhooks/DB from the start.
4. **Pricing changed** from ৳990-primary landing to ৳1,990 SaaS — always grep for old amounts when editing copy.
5. **Zero-env demo is a product feature** — rules fallback + default admin password enable QA without secrets; don’t break it.
6. **Client-only dashboard shell** complicates HTML snapshot QA — test APIs as source of truth.
7. User foundational choice (transcript): hybrid “landing first then own AI bot”; Messenger then WhatsApp.

---

## Decision log

| Date | Decision | Source |
| --- | --- | --- |
| 2026-07-20 | Hybrid software + services; Messenger then WhatsApp | User + PRD |
| 2026-07-20 | Position as AI Business OS, not chatbot-only | PRD v1.2 |
| 2026-07-20 | F39 Connect Must for SaaS; env dual-mode until Done | PRD |
| 2026-07-20 | Custom AI ৳15k–৳50k+; floor ৳15k (Q1) | PRD §14 |
| 2026-07-20 | ৳990 monthly = pure service unless upsold (Q6) | PRD §14 |
| 2026-07-20 | FaceTai 2.0 surfaces + SaaS plans ৳1,990+ | PRD v2.0 |
| 2026-07-20 | QA: 52 Pass / 0 Fail / 4 Blocked | `docs/QA-REPORT.md` |
| 2026-07-20 | Prefer Postgres for tenancy (Q4 proposed) | PRD |
| 2026-07-20 | Retention proposal 90d chats / 24mo orders (Q7 proposed, unconfirmed) | PRD |
| 2026-07-26 | Created `.cursor/` AI knowledge base (prd/architecture/design/phases/rules/memory) | This initiative |

### Open (do not invent)

| ID | Topic |
| --- | --- |
| Q2 | Invoice format (chat vs PDF vs Sheet #) — note: HTML invoice path exists; confirm product intent |
| Q3 | Vercel alone vs worker for webhooks |
| Q5 | Comment spam: keywords vs ML |
| Q7 | Retention confirm |
| Q8 | Who owns Meta tokens long-term |
| Q10 | Fair-use numeric caps per tier |
| Q11 | F39 slip to early P2 OK if needed — still Must for SaaS |
| Q12 | Exact Meta scopes / Embedded Signup vs Login for Business |
| Q13 | BD courier APIs |
| Q14 | Agency custom domain vs subdomain |

---

## Improvements highlighted for future work

| Area | Recommendation |
| --- | --- |
| Architecture | Postgres + object storage; channel adapter interface |
| Security | Hash passwords; encrypt tokens; auth-gate `/api/bot/reply` |
| Duplication | Shared session helper; shared AI context builder; one `normalizePhone` |
| Docs | Refresh PHASE2; sync PRD checkboxes; keep `.cursor/*` updated |
| Tests | Tenant isolation, handoff, lead/order validation, webhook signature |
| Performance | Avoid whole-file rewrite at scale; queue Sheet posts |
| Scalability | Multi-instance safe store before paid multi-tenant SaaS |
| Missing docs | Runbook for Meta App Review; support SLA process; incident retention |

---

## Chat transcript pointers (local Cursor)

| Theme | Transcript id |
| --- | --- |
| Product kickoff / hybrid / PRD evolution | `0b12311c-4618-402a-835b-3774f22289c9` |
| Phase 1 landing | `59d6c054-8a6d-4066-a584-882ee4011012` |
| Phase 2 Messenger MVP | `4819538d-1c83-48ad-9cfc-c3fffb654529` |
| QA fix pass | `06dc2800-acdb-435b-b093-a691bee6956d` |
| AI Sales Agent draft (awaiting stack choice) | `579692ab-5063-4da5-be31-8e92f574e2ef` |
| This knowledge base request | `916da9dc-5ba4-4fbf-acd0-a8c445d6b654` |

RentBee chats are **out of scope** for FaceTai decisions.
