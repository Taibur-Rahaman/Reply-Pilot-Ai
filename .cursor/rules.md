# FaceTai — AI Development Rules

| Field | Value |
| --- | --- |
| **Purpose** | Strict rules for all future AI-assisted development |
| **Related** | [prd.md](./prd.md) · [architecture.md](./architecture.md) · [design.md](./design.md) · [phases.md](./phases.md) · [memory.md](./memory.md) |
| **Product conflict rule** | `docs/PRD.md` wins on scope/SKUs |

---

## General principles

1. **Search before create** — find existing implementations in `src/lib`, `src/components`, `src/app/api` before adding files.
2. **Reuse before invent** — extend `lib/db/*` and `lib/bot/*`; do not duplicate domain logic.
3. **Never duplicate logic** — extract shared helpers when a third copy appears.
4. **No breaking changes** without explicit user approval — preserve API shapes and cookie names.
5. **Backward compatibility** — keep env-token Messenger path while building Connect.
6. **Honesty over hype** — never invent Meta credentials, fake `m.me`, or claim stubs as live.
7. **PRD wins** — do not silently expand MVP to native IG/TG/TikTok bots.
8. **Secrets never in git** — only empty placeholders in `.env.example`.
9. **Tenant isolation** — every business query filters by `tenantId`; fail closed.
10. **Bangla-first** — bot defaults BN; landing stays BN-primary unless asked otherwise.

---

## Architecture rules

1. Keep the **monolith Next.js App Router** structure unless the user approves a split.
2. Bot inbound path: webhook → `lib/bot/pipeline` → db + AI + Graph.
3. Dashboard data: session API → `lib/db/*` → JSON (or future Postgres behind same module APIs).
4. Prefer extending `withDb` domain modules over ad-hoc file I/O.
5. Do not add Redux/Zustand/etc. without approval — local React state is the convention.
6. API routes use `export const runtime = "nodejs"` when touching filesystem or crypto.
7. Deprecate toward single config model (`BotConfig` in db); avoid new `BusinessConfig` usage.

---

## Folder organization

| Put here | Not here |
| --- | --- |
| Domain mutations → `src/lib/db/` | Random `utils/` duplicates |
| Bot orchestration → `src/lib/bot/` | API routes with heavy business logic (thin handlers) |
| Landing UI → `src/components/` | Dashboard pages importing landing-only chrome unnecessarily |
| Dashboard pages → `src/app/dashboard/` | New top-level app folders without need |
| Knowledge docs → `.cursor/` + `docs/` | Secrets or generated dumps |

---

## Component creation

1. Prefer CSS classes in `globals.css` (`btn`, `section`, `dash__*`) over new CSS frameworks.
2. Marketing components: PascalCase files under `src/components/`.
3. Dashboard chrome goes through `DashboardShell`; don’t fork nav without approval.
4. Mark client components with `"use client"` only when needed.
5. Props: keep minimal (follow `LeadForm` / `DashboardShell` patterns).
6. No decorative card stacks on landing hero; follow [design.md](./design.md).

---

## Code reuse checklist (before new file)

- [ ] Is there already an API route for this?
- [ ] Is there a `lib/db` function?
- [ ] Is AI reply assembly already in `pipeline` / `ai.ts`?
- [ ] Can an existing page be extended?
- [ ] Will this break env dual-mode Connect transition?

---

## TypeScript

1. `strict: true` — do not weaken.
2. Use types from `src/lib/db/types.ts` for domain entities.
3. Prefer discriminated unions `{ ok: true; data } | { ok: false; error }`.
4. Path alias `@/` only — no deep relative `../../../` sprawl for lib imports.
5. Avoid `any`; if unavoidable, isolate and comment why.

---

## API development

1. Return `NextResponse.json` with clear `{ ok: true }` or `{ error }`.
2. Log with prefix: `console.error("[api/...]", error)`.
3. Validate input before `withDb` writes.
4. Dashboard routes: require session first.
5. Public write endpoints: validate strictly (phone, required fields).
6. Do not add new unauthenticated reply/test endpoints.
7. Meta webhook: always ACK appropriately; soft-fail side effects with logs.
8. Prefer `action` fields on POST/PUT for multi-mode handlers (see connect/ecommerce).

---

## Database

1. All entities include `tenantId` (except global non-business config if any).
2. Mutate only inside `withDb`.
3. Use `newId("prefix")` and `nowIso()`.
4. Do not introduce a second JSON schema file for the same domain (no return to `orders.jsonl`).
5. Production path must not rely solely on ephemeral disk — use webhooks or plan Postgres.
6. Never log access tokens in plaintext.

---

## Validation

1. Centralize in domain modules (`validateLead`, order validators).
2. Normalize phones consistently — **consolidate** duplicate `normalizePhone` when touching those files.
3. Reject invented catalog prices in bot prompts — ground on products/KB.
4. Interest values for landing leads must match allowlists unless intentionally extended.

---

## Authentication & authorization

1. Preserve cookie name `facetai_session` unless migrating with approval.
2. Support header `x-facetai-session` for tooling.
3. Do not remove demo login path without replacement.
4. Enforce RBAC on sensitive mutations; expand beyond team POST as part of F44.
5. Production: require `ADMIN_PASSWORD`; do not leave open admin.
6. **(Required before prod multi-tenant)** hash passwords — do not add more plain-text password features.

---

## Security

1. No secrets in client bundles except intentional `NEXT_PUBLIC_*`.
2. `NEXT_PUBLIC_MESSENGER_URL` only when real.
3. Verify webhook signatures in production.
4. Sanitize KB upload handling; cap sizes reasonably.
5. Do not commit `data/facetai-db.json` with real customer tokens.
6. Gate dangerous debug routes in production.

---

## Performance

1. Avoid full-file patterns that will worsen without migration plan notes.
2. Keep first bot reply path lean; fall back to rules on LLM failure.
3. Prefer `next/font` for fonts; don’t add large icon packs casually.
4. Respect Meta timeouts — acknowledge webhooks quickly.

---

## Accessibility & UI consistency

1. Keep `:focus-visible` and `prefers-reduced-motion` behaviors.
2. Use design tokens from [design.md](./design.md).
3. Coral = primary CTA; teal = signal — do not retheme without approval.
4. Brand mark remains hero-level on landing.
5. Dashboard nav labels stay consistent with `DashboardShell` NAV array.

---

## State management

1. Server: DB + session.
2. Client: `useState` / `useEffect` / `useCallback` as today.
3. No new global store without approval.

---

## Responsive design

1. Test landing and dashboard at mobile widths.
2. Use existing `clamp` and section padding patterns.
3. Default scripts bind `127.0.0.1`; use `dev:lan` for device testing — don’t “fix” by binding `0.0.0.0` in default `dev` without reason.

---

## Testing

1. No test framework in repo yet — when adding tests, prefer Vitest or Playwright aligned with Next 16.
2. Minimum valuable tests: lead validation, tenant isolation, handoff silence, order validate.
3. Do not claim QA green for Blocked Meta/OpenAI items without credentials.
4. Update `docs/QA-REPORT.md` when running a full QA pass.

---

## Logging & error handling

1. Prefix logs with route or module tags.
2. User-facing errors: short BN/EN strings already used in product voice where applicable.
3. Webhooks: log and still return 200 when appropriate to avoid Meta retry storms — don’t hide real prod misconfig forever (surface in dashboard).
4. Operator events → existing jsonl path or successor.

---

## Git commits

1. Commit only when the user asks.
2. Never commit `.env.local`, secrets, or real Page tokens.
3. Follow user git safety rules (no force push to main, no `--no-verify`, no interactive rebase).
4. Message style: concise why-focused sentences.

---

## Documentation

1. Update `.cursor/memory.md` decision log for significant choices.
2. Keep shipped vs stub language aligned across README, PRD Current status, and UI.
3. When changing SKUs/pricing, update landing + PRD + `.cursor/prd.md` together.
4. Do not create unsolicited markdown files outside `.cursor/` / `docs/` unless asked.

---

## Naming conventions

| Kind | Convention |
| --- | --- |
| React components | PascalCase |
| Functions / variables | camelCase |
| API routes | kebab folders under `app/api` |
| CSS | BEM-ish `block__elem--mod` |
| IDs | `newId("lead")` → `lead_…` |
| Feature IDs | F01–F60, F-mobile as in PRD |
| Env vars | SCREAMING_SNAKE |

---

## Dependency management

1. Prefer zero new dependencies — stack is intentionally minimal.
2. Adding Prisma/auth SDK/UI kit requires explicit approval.
3. Keep Next/React/ESLint aligned; don’t skip major upgrades silently.
4. Use OpenAI-compatible `fetch` — don’t add official SDK unless approved.

---

## Refactoring

1. Small, behavior-preserving refactors preferred.
2. When deduplicating AI context assembly, keep reply quality identical.
3. Removing `/admin` requires redirect + user approval (legacy still linked).
4. Do not rename public API paths used by Meta webhooks (`/api/messenger/webhook`).

---

## Code review checklist

- [ ] Searched for existing implementation first
- [ ] `tenantId` scoped on reads/writes
- [ ] No secrets committed; `.env.example` updated if new env vars
- [ ] Stub vs live labeled in UI/copy
- [ ] Session required on dashboard APIs
- [ ] Types from `lib/db/types.ts` reused
- [ ] Design tokens / `.btn` / `dash__` used
- [ ] No fake `m.me` / no false Connect claims
- [ ] No invented catalog prices in prompts
- [ ] Handoff behavior preserved
- [ ] Webhook path unchanged unless intentional migration
- [ ] README/PRD honesty lines still accurate
- [ ] Lint passes (`npm run lint`)
- [ ] Build passes if touching routes (`npm run build`)

---

## Things that always need explicit user approval

- Changing SaaS prices or SKU structure
- Removing env-token dual-mode
- Introducing a second backend service / rewriting in Nest/FastAPI
- Dark mode / full visual rebrand
- Claiming competitor feature-parity
- Forceful DB migration that drops demo data
- Native mobile app kickoff
- Marketing “Connect in 2 minutes” before F39 Done
