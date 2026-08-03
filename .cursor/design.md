# FaceTai — Design System (AI Knowledge Base)

| Field | Value |
| --- | --- |
| **Source of truth (code)** | `src/app/globals.css` + `src/app/layout.tsx` |
| **Related** | [prd.md](./prd.md) · [architecture.md](./architecture.md) · [rules.md](./rules.md) · [memory.md](./memory.md) |

No separate design-spec markdown existed before this KB. Tokens and patterns below are **extracted from the live UI**, not invented.

---

## Design philosophy

1. **Brand-first landing** — “FaceTai” as `.brand-mark` is a hero-level signal, not nav-only text.
2. **Bangladesh-first warmth** — mint/teal signal + coral CTA on paper-green atmosphere; Bangla-capable typography.
3. **One composition per section** — landing sections have one job (problem, features, pricing, proof, CTA).
4. **Chat as product metaphor** — `ChatRibbon` motion and Messenger-like bubbles reinforce the inbox product.
5. **Honest ops UI** — dashboard is functional (`dash__*`), not a second marketing site; still shares brand colors/fonts.
6. **Avoid AI-default aesthetics** — no purple-indigo themes, no cream+terracotta newspaper looks, no dark-mode-by-default.

---

## Branding

| Element | Spec |
| --- | --- |
| **Name** | FaceTai |
| **Positioning** | AI Business Operating System / Automation Platform (not “chatbot”) |
| **Mark** | Wordmark via `.brand-mark` (Syne, weight 800, tight tracking) |
| **Contact** | WhatsApp 01810-285559 |
| **Language** | `lang="bn"` on `<html>`; BN primary copy on landing |
| **Tone** | Clear packages, fair-use honesty, no competitor clone voice |

---

## Color system

Defined in `:root` (`globals.css`):

| Token | Hex / value | Role |
| --- | --- | --- |
| `--ink` | `#0c2b33` | Primary text |
| `--ink-soft` | `#2f4f58` | Secondary text / leads |
| `--paper` | `#eef6f4` | Base paper |
| `--mist` | `#d4ebe6` | Soft surfaces |
| `--foam` | `#f7fbfa` | Light panels |
| `--signal` | `#0e8a74` | Brand teal / links / focus |
| `--signal-deep` | `#0a6b5a` | Eyebrow / deep accent |
| `--spark` | `#f05a28` | Primary CTA coral |
| `--spark-deep` | `#d4471a` | CTA hover |
| `--chat` | `#ffffff` | Chat bubbles / cards |
| `--line` | `rgba(12, 43, 51, 0.12)` | Borders |
| `--shadow` | `0 24px 60px rgba(12, 43, 51, 0.12)` | Elevation |

**Page atmosphere:** dual radial gradients (teal + coral wash) over linear paper gradient — not flat single-color backgrounds.

**Do not introduce:** purple/indigo gradients, pure black dark themes, or competing accent hues without product-owner approval.

---

## Typography

| Role | Font | CSS variable | Weights |
| --- | --- | --- | --- |
| Display / brand | **Syne** | `--font-display` / `--font-syne` | 600, 700, 800 |
| Body (Latin) | **Sora** | `--font-body` / `--font-sora` | 400–700 |
| Bengali | **Noto Sans Bengali** | `--font-bn` / `--font-noto-bengali` | 400, 600, 700 |

Loaded via `next/font/google` in `src/app/layout.tsx`.

| Class | Usage |
| --- | --- |
| `.brand-mark` | Hero brand — `clamp(2.8rem, 8vw, 5.4rem)`, weight 800 |
| `.brand-mark--sm` | Dashboard / compact mark |
| `.eyebrow` | Uppercase section labels — signal-deep, tracked |
| `.section__title` | Section headlines — display font, `clamp(1.9rem…3rem)` |
| `.section__lead` | Supporting sentence — ink-soft, max ~52ch |
| `.dash__title` / `.dash__lead` | Dashboard page headers |

**Rule:** Prefer expressive Syne for brand/headlines; never fall back to Inter/Roboto/Arial as primary brand fonts.

---

## Grid & layout

| Token / pattern | Value |
| --- | --- |
| `--max` | `1120px` content width |
| `.section` | `padding: 5rem 1.25rem` |
| `.section__inner` | centered max-width container |
| Landing | Single-column section stack; feature grids inside Features |
| Dashboard | Sidebar nav (`.dash__nav`) + main (`.dash__main`) |

---

## Spacing & radius

| Token | Value |
| --- | --- |
| `--radius` | `18px` (panels / chat surfaces) |
| Buttons | Pill (`border-radius: 999px`) — existing pattern for CTAs |
| Section vertical | ~5rem |
| Focus ring | 3px `rgba(14, 138, 116, 0.55)` via `:focus-visible` |

Reuse existing spacing rhythm; do not invent a parallel spacing scale without updating tokens.

---

## Components

### Buttons (`.btn`)

| Modifier | Role |
| --- | --- |
| `.btn--primary` | Coral CTA (`--spark`) |
| `.btn--secondary` | Ink filled |
| `.btn--whatsapp` | WhatsApp CTA styling |
| `.btn--ghost` | Low-emphasis (dashboard logout) |

Behavior: hover lifts `translateY(-1px)`; disabled opacity 0.7.

### Landing blocks

| Component | Job |
| --- | --- |
| `Hero` | Brand + one headline + support + CTA group + visual |
| `ChatRibbon` | Motion signature — animated chat bubbles |
| `Problem` | Pain points |
| `Features` | Platform pillars grid |
| `Pricing` | SaaS plan cards (Starter→Enterprise) |
| `SocialProof` | Marquee focus strips |
| `FinalCTA` + `LeadForm` | Conversion |
| `SiteFooter` | Links (WhatsApp, optional Messenger, dashboard/admin) |
| `WebChatWidget` | Floating site chat |

### Cards / panels

- Landing: prefer section composition over card sprawl; pricing uses restrained card surfaces for **plan selection interaction**.
- Dashboard: `.dash-panel` for operational groupings; roadmap items use panels.
- **Rule:** Cards only when they contain interaction or clear ops grouping — not decorative chrome.

### Forms

- `LeadForm`: name, phone, business, interest → `/api/leads`; `compact` prop changes source.
- Dashboard forms: native inputs with `dash__*` / shared button classes; local error strings from API `error` field.
- Validation: server-side `validateLead` / order validators return `{ ok, error }`.

### Tables / lists

- Dashboard uses list/table-like layouts in page components (orders, leads, chats) — keep dense ops readability; use `dash__muted` for secondary meta.

### Modals

- No shared modal system today. Prefer inline panels or native `dialog` only if needed; match existing dash styles.

### Icons

- No icon library dependency. Prefer text/CSS accents; do not add emoji-heavy UI.

---

## Animations

| Keyframe | Purpose |
| --- | --- |
| `rise-in` | Section entrance |
| `bubble-in` | Chat bubble appear |
| `typing` | Typing indicator |
| `atmosphere-drift` | Background motion |
| `marquee` | Social proof strip |

**Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables/limits motion in `globals.css` — preserve this.

**Guideline:** 2–3 intentional motions on landing (ribbon, rise-in, marquee). Do not add noisy particle/glow stacks.

---

## Responsive rules

| Breakpoint behavior | Pattern |
| --- | --- |
| Fluid type | `clamp()` on brand and titles |
| Section padding | Horizontal `1.25rem` |
| Dashboard | Nav stacks / adapts near bottom of `globals.css` (`@media` on `.dash__nav`) |
| Touch CTAs | `min-height: 3rem` on `.btn` |

Always verify landing + dashboard on mobile width. Bind LAN via `npm run dev:lan` when testing on phone.

---

## Accessibility

| Practice | Status |
| --- | --- |
| `:focus-visible` outline | Implemented (signal teal) |
| `lang="bn"` | Root layout |
| Reduced motion | Implemented |
| Semantic sections | Prefer headings hierarchy (`.section__title`, `dash__title`) |
| Color contrast | Ink on paper; coral CTAs with white text |

**(Recommendations):** Add accessible names to icon-only controls if introduced; ensure webchat open button has aria-label; improve raw HTML SEO for dashboard (currently client-gated “Loading…”).

---

## UX guidelines

1. **Landing first viewport:** brand + one headline + one short support + CTA group + dominant visual — no stats/schedules clutter.
2. **No fake Messenger links** — hide Messenger CTA unless `NEXT_PUBLIC_MESSENGER_URL` is real.
3. **Fair-use wording** on pricing claims.
4. **Stub honesty** — Connect, ecommerce sync, KB connectors must read as scaffold/stub until Done.
5. **Dashboard:** Bangla-friendly but ops-clear English nav labels (current: Inbox, Orders, …) — keep labels consistent with `DashboardShell` NAV.
6. **Errors:** Show API `error` string; never silent fail on lead/order submit.

---

## UI consistency rules

| Do | Don't |
| --- | --- |
| Use CSS variables from `:root` | Hardcode random hex in new components |
| Use `.btn` modifiers | Invent new button systems |
| Use `.brand-mark` for FaceTai | Shrink brand to tiny nav-only word |
| Extend `globals.css` patterns | Introduce shadcn/MUI without explicit approval |
| Match dash class prefixes `dash__` | Mix Tailwind utility soup that fights tokens |
| Keep coral = primary action, teal = signal | Swap CTA to purple or neon |

---

## Dashboard visual language

| Class | Role |
| --- | --- |
| `.dash` | Shell wrapper |
| `.dash__nav` | Sidebar |
| `.dash__link` / `--active` | Nav items |
| `.dash__main` | Content column |
| `.dash__title` / `__lead` / `__muted` | Typography |
| `.dash-panel` | Content panels |
| `.dash-tag` | Status chips (roadmap) |
| `.dash-roadmap` | Roadmap grid |

Nav order is product IA — change only with product-owner approval (see [memory.md](./memory.md)).

---

## Content & localization

- Landing copy: Bengali-primary with clear package numbers (৳1,990…).
- Bot: Bangla-first system prompts; English if user writes English.
- Currency display: Bangladeshi Taka `৳`.
- Do not invent prices/stock in UI outside catalog data.
