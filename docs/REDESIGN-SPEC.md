# Reply Pilot AI — Redesign Specification

Companion to [UX-AUDIT-NON-TECHNICAL.md](./UX-AUDIT-NON-TECHNICAL.md). This document defines the design system, information architecture, onboarding, and wireframes. **No page code is written until Phase 1 and 2 below are complete.**

Design north star: *Apple / Linear / Stripe / OpenAI / Notion* — Dark Premium. Trustworthy, not flashy. Optimised for a 55-year-old shop owner on a 360px Android phone with a slow connection.

---

## Part A — Component inventory audit

The current `globals.css` is **1,361 lines / 108 classes** with **zero reusable primitives**. Every class is page-scoped: `.admin__*`, `.dash-*`, `.hero__*`, `.webchat__*`, `.price-*`. The same visual object is re-implemented per page.

### A1. Duplication found

| Concept | Duplicate implementations | Lines |
|---|---|---|
| Panel / card surface | `.dash-panel`, `.price-item`, `.dash-stat`, `.admin__inner`, `.dash-login__card`, `.empty-state` | 6 |
| Page title | `.dash__title`, `.admin__title`, `.section__title`, `.hero__headline` | 4 |
| Sub-text / lead | `.dash__lead`, `.admin__lead`, `.section__lead`, `.dash__muted`, `.admin__hint` | 5 |
| Preformatted output | `.dash-pre`, `.admin__pre` | 2 |
| Status list | `.dash-checklist`, `.admin__status` | 2 |
| Row layout | `.dash-row`, `.dash-split`, `.dash-form-grid`, `.lead-form__grid` | 4 |
| Small caps label | `.eyebrow`, `.dash-tag`, `.brand-mark--sm` | 3 |

### A2. Missing primitives (do not exist at all)

Toast · Modal / Dialog · Badge (semantic) · Dropdown / Select · Skeleton loader · Progress indicator · Avatar · Tabs · Switch / Toggle · Icon system · Tooltip · Stepper · Alert / Banner (semantic variants) · Segmented control

### A3. Decisions

1. **Drop `@import "tailwindcss"`** (`globals.css:1`). It is dead weight — no utility classes are used anywhere in `src/`.
2. **Invert the theme.** Current tokens are a *light* teal/mint scheme (`--paper: #eef6f4`, `--ink: #0c2b33`). The target is Dark Premium. Every token is replaced.
3. **Split one 1,361-line file into four layers:**
   ```
   src/styles/tokens.css       design tokens only, no selectors
   src/styles/base.css         reset, typography, focus, motion
   src/styles/components.css   reusable primitives (.rp-*)
   src/styles/legacy.css       marketing-page styles, quarantined
   src/app/globals.css         imports the four, nothing else
   ```
4. **Namespace all new primitives `.rp-`** so old and new can coexist during migration and dead CSS is trivially greppable at the end.

---

## Part B — Design tokens

### B1. Colour

```css
--rp-bg:        #09090B;   /* app background          */
--rp-surface:   #111317;   /* sidebar, sticky bars    */
--rp-card:      #181A20;   /* cards, inputs, modals   */
--rp-card-hi:   #1F222A;   /* hover / raised          */
--rp-line:      #26282F;   /* borders, dividers       */

--rp-primary:   #FF6B00;
--rp-secondary: #FF8C42;
--rp-accent:    #FFA94D;
--rp-primary-ink: #09090B;  /* text ON primary        */

--rp-text:      #F8FAFC;
--rp-muted:     #A1A1AA;

--rp-success:   #34D399;
--rp-warning:   #FBBF24;
--rp-danger:    #F87171;
--rp-info:      #60A5FA;
```

**Contrast verification (WCAG AA requires 4.5:1 body / 3:1 large):**

| Pair | Ratio | Result |
|---|---|---|
| `--rp-text` on `--rp-bg` | 19.1:1 | AAA |
| `--rp-text` on `--rp-card` | 15.8:1 | AAA |
| `--rp-muted` on `--rp-card` | 6.9:1 | AA ✓ |
| `--rp-primary` on `--rp-bg` | 6.3:1 | AA ✓ |
| **white on `--rp-primary`** | **3.1:1** | **FAILS** |
| `--rp-primary-ink` on `--rp-primary` | 6.3:1 | AA ✓ |

> **Rule: primary buttons use near-black text on orange, never white.** This is why Stripe and Linear do the same.

### B2. Typography — base 16px, 1.25 ratio

```css
--rp-text-xs:   0.875rem;  /* 14px — badges, timestamps ONLY. Never body. */
--rp-text-sm:   1rem;      /* 16px — secondary text                      */
--rp-text-base: 1.0625rem; /* 17px — body default                        */
--rp-text-lg:   1.25rem;   /* 20px — card titles, list items             */
--rp-text-xl:   1.5rem;    /* 24px — section headings                    */
--rp-text-2xl:  1.875rem;  /* 30px — page titles                         */
--rp-text-3xl:  2.5rem;    /* 40px — onboarding headlines                */

--rp-leading-tight: 1.25;
--rp-leading-base:  1.6;   /* generous — low digital literacy            */
```

**Floor: nothing below 14px, and 14px only for non-essential metadata.** This deletes every `0.72rem`–`0.92rem` value flagged as M1 in the audit.

### B3. Spacing — strict 8px system

```css
--rp-space-1: 0.5rem;   /*  8px */
--rp-space-2: 1rem;     /* 16px */
--rp-space-3: 1.5rem;   /* 24px */
--rp-space-4: 2rem;     /* 32px */
--rp-space-5: 2.5rem;   /* 40px */
--rp-space-6: 3rem;     /* 48px */
--rp-space-8: 4rem;     /* 64px */
```

Card padding `--rp-space-3` mobile / `--rp-space-4` desktop. Section gap `--rp-space-5`. This is the **+35% whitespace** requirement: current `.dash-panel` padding is ~1.15rem → becomes 1.5rem mobile / 2rem desktop.

### B4. Radius, shadow, motion

```css
--rp-radius-sm:  10px;   /* badges, tags        */
--rp-radius-md:  14px;   /* inputs, buttons     */
--rp-radius-lg:  20px;   /* cards — the default */
--rp-radius-xl:  28px;   /* modals, sheets      */
--rp-radius-full: 999px;

--rp-shadow-sm: 0 1px 2px rgba(0,0,0,.4);
--rp-shadow-md: 0 4px 16px rgba(0,0,0,.45);
--rp-shadow-lg: 0 12px 40px rgba(0,0,0,.55);
--rp-glow:      0 0 0 1px rgba(255,107,0,.28), 0 8px 32px rgba(255,107,0,.18);

--rp-ease: cubic-bezier(.4, 0, .2, 1);
--rp-dur-fast: 120ms;
--rp-dur-base: 200ms;
--rp-dur-slow: 320ms;
```

Glassmorphism is used **only** on the sticky mobile bottom bar and modal scrim: `backdrop-filter: blur(20px)` over `rgba(17,19,23,.72)`. Nowhere else — it costs GPU on cheap Android devices.

### B5. Touch targets

```css
--rp-tap-min:    48px;  /* absolute floor, all interactive elements */
--rp-control-h:  56px;  /* buttons, inputs, selects                 */
--rp-control-sm: 44px;  /* dense contexts only — never primary      */
```

---

## Part C — Component specifications

Each gets one implementation in `components.css`.

| Primitive | Class | Key rules |
|---|---|---|
| Button | `.rp-btn` + `--primary` `--secondary` `--ghost` `--danger` | 56px h, 20px radius, dark ink on orange, `:active` scale .98 |
| Icon button | `.rp-icon-btn` | 48×48 min, always `aria-label` |
| Input / Select / Textarea | `.rp-input` | 56px h, 17px text, 14px radius, label always visible above |
| Field group | `.rp-field` | label + input + hint + error, 8px rhythm |
| Card | `.rp-card` | surface `--rp-card`, 20px radius, 24/32px pad, one primary action |
| Action card | `.rp-action-card` | icon + title + one-line body + chevron; whole card tappable |
| Stat card | `.rp-stat` | big number 30px + plain label; **no charts** |
| List row | `.rp-row` | 72px min height, avatar + two lines + chevron |
| Table→Cards | `.rp-table` | real table ≥861px; `<860px` stacks to cards via `data-label` |
| Badge | `.rp-badge` + semantic variants | 14px, pill, 6.5:1 min contrast |
| Toast | `.rp-toast` | bottom-centre mobile / bottom-right desktop, `role="status"`, auto-dismiss 4s |
| Modal | `.rp-modal` | 28px radius, blurred scrim, focus trap, Esc to close |
| Sheet | `.rp-sheet` | mobile bottom sheet, drag handle |
| Dropdown | `.rp-menu` | 48px rows, keyboard nav |
| Tabs | `.rp-tabs` | 48px targets, scrollable on mobile |
| Switch | `.rp-switch` | 52×32 track, label describes ON state |
| Skeleton | `.rp-skeleton` | shimmer, respects `prefers-reduced-motion` |
| Progress | `.rp-progress` / `.rp-stepper` | onboarding "Step 2 of 3" |
| Empty state | `.rp-empty` | icon + what this is + one action |
| Error state | `.rp-error-state` | plain sentence + retry + help link |
| Banner | `.rp-banner` + semantic | inline page-level messages |
| Nav | `.rp-nav` | sidebar ≥861px, bottom tab bar `<860px` |

### Accessibility contract (every component)

- Visible focus: `outline: 3px solid var(--rp-accent); outline-offset: 3px`
- Full keyboard operation; logical tab order; focus trap in modals
- Status changes announced via `role="status" aria-live="polite"`
- `prefers-reduced-motion` disables all transform/opacity animation
- Never colour alone to convey meaning — always icon + text

---

## Part D — Information architecture

**17 destinations → 5.**

```
🏠 Home          Status + what needs my attention today
💬 Messages      All customer conversations + Facebook comments
🤖 AI Assistant  What my AI knows and how it behaves
👥 Customers     People + their orders + their problems
⚙️ Settings      Facebook page, team, language, account, Advanced ▸
```

### Full mapping of every existing screen

| Old screen | Goes to |
|---|---|
| `/dashboard` Overview | **Home** — rebuilt as action cards |
| `/dashboard/analytics` | **Home** — merged, plain-language numbers |
| `/dashboard/chats` Inbox | **Messages** |
| `/dashboard/comments` Comments AI | **Messages** → "Facebook comments" tab |
| `/dashboard/knowledge` | **AI Assistant** → My business info |
| `/dashboard/catalog` | **AI Assistant** → What I sell |
| `/dashboard/recommendations` | **Automatic.** No UI. Engine already scores; remove the ID-entry screen |
| `/dashboard/leads` Leads/CRM | **Customers** → People |
| `/dashboard/complaints` | **Customers** → shown on the customer record |
| `/dashboard/orders` | **Customers** → Orders tab |
| `/dashboard/connect` | **Onboarding Step 1**, then Settings → My Facebook Page |
| `/dashboard/team` | **Settings** → My Team |
| `/dashboard/ecommerce` | **Settings → Advanced** → Connect my online shop |
| `/dashboard/planned` Roadmap | **Deleted** |
| `/admin` Admin lite | **Removed from user nav.** Staff-only, password-gated |
| `/admin/tenants` | Staff-only, unchanged |

### What moves behind "Advanced Settings ▸"

Collapsed, warning-labelled, never surfaced during onboarding:
AI Instructions (system prompt) · Reply Accuracy threshold · guardrail rules · reply delay · abandoned-customer timing · online shop sync · CSV/JSON import · spam keywords · webhook status · product relations

---

## Part E — Onboarding (3 steps, target < 3 minutes)

Progress bar on every screen. One question per view. One primary button per view.

### Step 1 of 3 — Connect Facebook

```
┌──────────────────────────────────────┐
│  ●━━━━━━━━━○─────────○   Step 1 of 3 │
│                                      │
│            ┌────────┐                │
│            │   👋   │                │
│            └────────┘                │
│                                      │
│      Let's connect your              │
│      Facebook Page                   │
│                                      │
│   Your AI will start answering       │
│   customers as soon as this is done. │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Connect My Facebook Page      │  │  ← 56px, orange
│  └────────────────────────────────┘  │
│                                      │
│  🔒 We only read and reply to your   │
│     messages. We never post anything.│
│                                      │
│  Need help? Message us on WhatsApp   │
└──────────────────────────────────────┘
```

**Page choice happens inside this step** (that is why it is 3 steps, not 4):
- 0 pages → "We couldn't find a Facebook Page on your account." + [ Try again ] + help link
- 1 page → auto-select, show confirmation card, advance
- 2+ pages → large cards (photo + name + follower count), one tap

Failure copy is always: *"We couldn't connect your Facebook page. Please try again."* — never an OAuth code.

### Step 2 of 3 — Tell your AI about your business

One question per screen, `[ Skip for now ]` always present. 8 micro-screens, each ~10 seconds.

```
┌──────────────────────────────────────┐
│  ●━━━━━━━━━●━━━━━━━━━○   Step 2 of 3 │
│  ← Back                      Skip    │
│                                      │
│   What kind of business               │
│   do you have?                        │
│                                      │
│  ┌─────────┐  ┌─────────┐            │
│  │   🍽️    │  │   🛒    │            │  ← 2-col, ~140px tall
│  │Restaurant│  │  Shop   │            │
│  └─────────┘  └─────────┘            │
│  ┌─────────┐  ┌─────────┐            │
│  │   🏥    │  │   📚    │            │
│  │ Clinic  │  │Education│            │
│  └─────────┘  └─────────┘            │
│  ┌─────────┐  ┌─────────┐            │
│  │   🏠    │  │   ✨    │            │
│  │Property │  │  Other  │            │
│  └─────────┘  └─────────┘            │
└──────────────────────────────────────┘
```

The answer **silently seeds** the system prompt, tone, and starter FAQs. The user never sees the word "prompt".

Remaining questions, one per screen: business name · phone · address · opening hours · delivery (Yes/No/Sometimes) · what you sell · rules customers should know · top 3 questions customers ask *(pre-filled from business type — user edits or accepts)*.

### Step 3 of 3 — Ready

```
┌──────────────────────────────────────┐
│  ●━━━━━━━━━●━━━━━━━━━●   Step 3 of 3 │
│                                      │
│                🎉                     │
│                                      │
│      Your AI is now answering         │
│      your customers                   │
│                                      │
│   It replies day and night, even      │
│   when you're asleep.                 │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      Go To Messages            │  │
│  └────────────────────────────────┘  │
│                                      │
│      Send myself a test message       │  ← ghost
└──────────────────────────────────────┘
```

---

## Part F — Screen wireframes

### F1. Home — action cards, no charts

```
┌────────────────────────────────────────┐
│ Good morning, Rahim                    │
│ Your AI answered 12 customers today    │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ ✅  Your AI is working              │ │  ← status card
│ │     Connected to "Rahim Store"      │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Needs your attention                   │
│ ┌────────────────────────────────────┐ │
│ │ 💬  3 customers are waiting     ›  │ │  ← action cards,
│ │     They asked something new       │ │    whole card tappable
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ 📦  5 orders to pack            ›  │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ ⚠️  1 unhappy customer          ›  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Today                                  │
│ ┌──────────┐ ┌──────────┐             │
│ │    12    │ │     4    │             │  ← plain numbers,
│ │ Customers│ │  Orders  │             │    no charts
│ └──────────┘ └──────────┘             │
│ ┌──────────┐ ┌──────────┐             │
│ │  ৳4,200  │ │    9     │             │
│ │  Earned  │ │AI replied│             │
│ └──────────┘ └──────────┘             │
└────────────────────────────────────────┘
```

Removed vs today: env-var checklist, Tenant/Role line, "AI cost (est.)", "Conversion %", "Postgres".

### F2. Messages

```
┌────────────────────────────────────────┐
│ Messages                               │
│ ┌────────────┬───────────────────────┐ │
│ │  Chats (3) │  Facebook comments    │ │  ← 2 tabs
│ └────────────┴───────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ (K) Karim Ahmed        2 min ago ›│ │  ← 72px rows
│ │     "Do you deliver to Mirpur?"    │ │
│ │     🟠 Waiting for you             │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ (S) Sadia            10 min ago  ›│ │
│ │     "Thank you!"                   │ │
│ │     ✅ AI replied                  │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

Conversation view: real chat bubbles (customer left, AI right, you right in orange). Single primary button **[ I'll reply myself ]** which swaps to **[ Let AI continue ]**. "Add a private note" behind a `⋯` menu.

Removed: Demo ingest form, `in`/`out` labels, lowercase channel enums, stub channels, `/api/webchat` reference, raw recognition method.

### F3. AI Assistant

```
┌────────────────────────────────────────┐
│ AI Assistant                           │
│ ┌────────────────────────────────────┐ │
│ │ ✅ Your AI knows 12 things about    │ │
│ │    your business                    │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ 🏪  My business info            ›  │ │
│ │     Name, phone, hours, delivery   │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ 🏷️  What I sell            12 items│ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ ❓  Common questions        5 saved│ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ 💬  Test my AI                  ›  │ │
│ └────────────────────────────────────┘ │
│                                        │
│  ⚙️ Advanced Settings ▸                │  ← collapsed
└────────────────────────────────────────┘
```

"What I sell" → product cards with **photo upload**, not an image URL field. "Common questions" → plain Q/A pairs with an [ Add a question ] button.

Removed: system prompt textarea, Personality field, Hard guardrails fieldset, Confidence threshold, "Abandoned lead hours", 5 non-functional stub buttons, "unique vs LazyChat".

### F4. Customers

```
┌────────────────────────────────────────┐
│ Customers                              │
│ ┌────────────┬───────────────────────┐ │
│ │  People    │  Orders               │ │
│ └────────────┴───────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ (K) Karim Ahmed                 ›  │ │
│ │     017XXXXXXXX                    │ │
│ │     🟠 Interested · 2 orders       │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

Customer detail = one page: contact, their orders, their messages, their complaints, status. Replaces three separate screens. Stage names become **New → Interested → Buying → Bought → Not interested**. Order statuses become **New → Packing → Sent → Delivered → Cancelled** (drop `unknown`).

Orders tab uses cards on mobile, table only ≥861px. Editing an order opens a sheet with an explicit **[ Save ]** — no blur-to-save.

### F5. Settings

```
│ ⚙️ Settings                            │
│ ┌────────────────────────────────────┐ │
│ │ 📘 My Facebook Page             ›  │ │
│ │    ✅ Connected — Rahim Store      │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ 👥 My Team                 2 people│ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ 🌐 Language          English/বাংলা │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ 👤 My Account                   ›  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ⚙️ Advanced Settings ▸                 │
│ ┌────────────────────────────────────┐ │
│ │ Only change these if you know      │ │
│ │ what you're doing.                 │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [ Log out ]                            │
└────────────────────────────────────────┘
```

Team invites become **name + phone → send invite link**. No owner-typed passwords. Roles become **Owner / Manager / Helper**.

### F6. Navigation

Desktop ≥861px — left sidebar, 260px, large icon + 17px label.
Mobile <860px — **fixed bottom tab bar**, 5 items, 64px tall, icon + 14px label, safe-area inset. Replaces the current "Menu"/"Close" text drawer entirely.

### F7. Sign in

Logo · "Welcome back" · email · password · **[ Sign in ]** · "Forgot password?" · WhatsApp help link.
**No pre-filled email. No password printed on screen.** (Audit C1.)

---

## Part G — Implementation plan

### Phase 1 — Design system foundation *(no page changes)*
1. Create `src/styles/tokens.css` — Part B.
2. Create `src/styles/base.css` — reset, 16px base, focus, reduced motion.
3. Create `src/styles/components.css` — all `.rp-*` primitives from Part C.
4. Move marketing CSS to `src/styles/legacy.css`; reduce `globals.css` to imports.
5. Remove `@import "tailwindcss"`.
6. Build `/design-system` preview route rendering every primitive in every state for visual QA.

### Phase 2 — Shell and navigation
7. `AppShell` — sidebar desktop / bottom tabs mobile, 5 items.
8. Toast provider + `role="status"` region.
9. Friendly-error mapper: HTTP status + server string → human sentence (audit §7).

### Phase 3 — Onboarding
10. `/welcome` — 3-step wizard, resumable, progress persisted.
11. Rebuild Connect as Step 1; delete demo-connect and mock-page UI.
12. Business-type → auto-seeded AI instructions (silent).

### Phase 4 — Screen migration
13. Home · 14. Messages · 15. AI Assistant · 16. Customers · 17. Settings + Advanced

### Phase 5 — Removal and cleanup
18. Delete `/dashboard/planned`; unlink `/admin` from user nav.
19. Strip demo seed data; ship empty tenants with real empty states.
20. Remove `stub_*` handlers and the buttons that call them.
21. Purge dead `.dash-*` / `.admin__*` CSS; delete `legacy.css` leftovers.
22. Sweep all copy against the audit vocabulary table.

### Phase 6 — Verification
23. Axe pass, keyboard-only pass, 360px pass, contrast re-verify.
24. Throttled 3G check — skeletons, no layout shift.
25. Task timings: connect < 90s, add product < 30s, answer customer < 15s.

**Definition of done per screen:** first-time smartphone user understands it · no documentation needed · primary task < 3 min · exactly one obvious next action · no word from the audit's banned vocabulary.
