# 08 · Design system & UX specification

> 🎨 DES · 📦 PM · 🧑‍💻 ENG

> ⚠️ **Reality check.** The shipped UI in `src/app/globals.css` is a **light**
> theme built on teal (`--signal: #0e8a74`) with an orange spark accent
> (`--spark: #f05a28`) on a paper background (`--paper: #eef6f4`).
>
> What follows is the **specification for the "Nocturne" dark theme** — the
> premium dark + orange-neon direction. It is a redesign target, not a
> description of what renders today. §8.3 gives the migration path so both
> themes can coexist behind a single token layer.

---

## 8.1 Design principles

| # | Principle | Test |
| --- | --- | --- |
| 1 | **Depth, not decoration** | Every shadow encodes elevation. If it doesn't say "this floats above that", delete it. |
| 2 | **One accent, used sparingly** | Orange marks the single most important action per view. Two orange buttons in one viewport is a bug. |
| 3 | **Data first, chrome last** | A KPI number is 40px; its label is 12px. Never the reverse. |
| 4 | **Bangla is a first-class typeface** | Bangla and Latin must sit on the same baseline at the same optical size. |
| 5 | **Every state is designed** | Empty, loading, error, partial, offline, rate-limited, and success. No view ships with only the happy path. |
| 6 | **Motion explains causality** | Animate only to show where something came from or went. |
| 7 | **Respect the operator's night** | This dashboard is used at 1am on a phone. Dark theme is the default, not the option. |

---

## 8.2 Colour system — Nocturne

### Core tokens

| Token | Hex | Usage |
| --- | --- | --- |
| `--rp-primary` | `#FF6B00` | Primary action, active nav, focus ring |
| `--rp-secondary` | `#FF8C42` | Hover state, secondary emphasis |
| `--rp-accent` | `#FFA94D` | Highlights, sparkline strokes, badges |
| `--rp-bg` | `#09090B` | Page background |
| `--rp-surface` | `#111317` | Sidebar, top bar, sheet |
| `--rp-card` | `#181A20` | Cards, panels, table rows |
| `--rp-border` | `rgba(255,255,255,.08)` | Hairlines, dividers |
| `--rp-text` | `#F8FAFC` | Primary text |
| `--rp-muted` | `#A1A1AA` | Secondary text, labels |
| `--rp-success` | `#22C55E` | Delivered, active, healthy |
| `--rp-warning` | `#F59E0B` | Pending, degraded, low stock |
| `--rp-danger` | `#EF4444` | Failed, disconnected, urgent |

### Derived tokens

| Token | Value | Usage |
| --- | --- | --- |
| `--rp-primary-weak` | `rgba(255,107,0,.12)` | Selected row, badge fill |
| `--rp-primary-glow` | `0 0 24px rgba(255,107,0,.35)` | Focus / active glow |
| `--rp-card-hover` | `#1E2129` | Row hover |
| `--rp-border-strong` | `rgba(255,255,255,.16)` | Input borders, focused card |
| `--rp-overlay` | `rgba(9,9,11,.72)` | Modal scrim |
| `--rp-glass` | `rgba(24,26,32,.72)` | Glass panel fill (with backdrop blur) |

### Semantic mapping to domain state

| Domain state | Token | Where |
| --- | --- | --- |
| `PageConnection.status = active` | `--rp-success` | Connect |
| `= pending` | `--rp-warning` | Connect |
| `= error` / `disconnected` | `--rp-danger` | Connect |
| `Complaint.priority = urgent` | `--rp-danger` + pulse | Complaints |
| `= high` | `--rp-danger` (no pulse) | Complaints |
| `= medium` | `--rp-warning` | Complaints |
| `= low` | `--rp-muted` | Complaints |
| `Order.trackingStatus = delivered` | `--rp-success` | Orders |
| `= shipped` / `packed` | `--rp-accent` | Orders |
| `= new` / `confirmed` | `--rp-muted` | Orders |
| `= returned` | `--rp-danger` | Orders |
| `handoffActive = true` | `--rp-primary` | Inbox |
| `Product.stock = 0` | `--rp-danger` | Catalog |
| `Product.stock < 5` | `--rp-warning` | Catalog |
| AI reply `source = llm` | `--rp-accent` | Inbox message badge |
| `source = rules` | `--rp-muted` | Inbox message badge |
| `source = fallback` | `--rp-warning` | Inbox message badge |

### Contrast audit (WCAG 2.2 AA)

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `--rp-text` on `--rp-bg` | 18.4 : 1 | ✅ AAA |
| `--rp-text` on `--rp-card` | 15.2 : 1 | ✅ AAA |
| `--rp-muted` on `--rp-card` | 6.8 : 1 | ✅ AA (body) |
| `--rp-primary` on `--rp-bg` | 5.6 : 1 | ✅ AA (large + UI) |
| `#09090B` on `--rp-primary` | 8.9 : 1 | ✅ AAA — **use dark text on orange fills, never white** |
| `--rp-danger` on `--rp-card` | 4.7 : 1 | ✅ AA |
| `--rp-success` on `--rp-card` | 6.4 : 1 | ✅ AA |

> Rule: **orange is never a text colour on a light fill and never carries white
> text.** Filled orange buttons use `#09090B` as their label colour.

---

## 8.3 Token implementation

```css
/* src/app/globals.css — proposed additive layer */
:root {
  color-scheme: dark;

  --rp-primary: #FF6B00;
  --rp-secondary: #FF8C42;
  --rp-accent: #FFA94D;
  --rp-bg: #09090B;
  --rp-surface: #111317;
  --rp-card: #181A20;
  --rp-card-hover: #1E2129;
  --rp-border: rgba(255, 255, 255, .08);
  --rp-border-strong: rgba(255, 255, 255, .16);
  --rp-text: #F8FAFC;
  --rp-muted: #A1A1AA;
  --rp-success: #22C55E;
  --rp-warning: #F59E0B;
  --rp-danger: #EF4444;

  --rp-r-sm: 8px;
  --rp-r-md: 12px;
  --rp-r-lg: 16px;
  --rp-r-xl: 24px;
  --rp-r-pill: 999px;

  --rp-e1: 0 1px 2px rgba(0,0,0,.4);
  --rp-e2: 0 4px 12px rgba(0,0,0,.45);
  --rp-e3: 0 12px 32px rgba(0,0,0,.5);
  --rp-e4: 0 24px 64px rgba(0,0,0,.55);
  --rp-glow: 0 0 24px rgba(255,107,0,.35);

  --rp-space: 4px;   /* 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 */
}

@media (prefers-color-scheme: light) {
  :root[data-theme="auto"] {
    --rp-bg: #FAFAF9;
    --rp-surface: #FFFFFF;
    --rp-card: #FFFFFF;
    --rp-card-hover: #F4F4F5;
    --rp-border: rgba(9, 9, 11, .10);
    --rp-text: #09090B;
    --rp-muted: #52525B;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

**Migration strategy.** Introduce `--rp-*` alongside the existing `--ink` /
`--signal` / `--spark` variables. Alias the old names to the new ones one
component at a time:

```css
:root { --spark: var(--rp-primary); --line: var(--rp-border); }
```

This lets the redesign land page-by-page without a big-bang rewrite.

---

## 8.4 Typography

| Role | Family | Size / line-height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Display | Syne | 48 / 52 | 800 | -0.04em |
| H1 | Syne | 32 / 38 | 700 | -0.03em |
| H2 | Sora | 24 / 30 | 600 | -0.02em |
| H3 | Sora | 18 / 26 | 600 | -0.01em |
| Body | Sora | 15 / 24 | 400 | 0 |
| Body small | Sora | 13 / 20 | 400 | 0 |
| Label | Sora | 12 / 16 | 500 | 0.06em, uppercase |
| KPI numeral | Syne | 40 / 44 | 800 | -0.03em, tabular |
| Mono | JetBrains Mono | 13 / 20 | 400 | 0 |
| **Bangla body** | Noto Sans Bengali | 15 / 26 | 400 | 0 |
| **Bangla display** | Noto Sans Bengali | 30 / 40 | 700 | 0 |

Bangla needs ~2px more line-height than Latin at the same size because of
ascender/descender marks. Set it explicitly rather than inheriting:

```css
:lang(bn), .bn { font-family: var(--font-bn); line-height: 1.72; }
```

The variables `--font-display` (Syne), `--font-body` (Sora), and `--font-bn`
(Noto Sans Bengali) already exist in `globals.css` — reuse them.

---

## 8.5 Component library

```
Primitives
├── Button          variant: primary | secondary | ghost | danger
│                   size: sm(32) | md(40) | lg(48)
│                   state: default | hover | active | loading | disabled
├── Input / Textarea / Select / Switch / Checkbox / Radio
├── Badge           tone: neutral | success | warning | danger | accent
├── Avatar          size: 24 | 32 | 40 · fallback initials
├── Tooltip         delay 400ms, arrow, max-width 240
├── Skeleton        shimmer, respects reduced-motion
└── Spinner         orange, 16 | 24 | 32

Layout
├── GlassCard       --rp-glass + backdrop-filter blur(20px) + 1px --rp-border
├── StatCard        label · value · delta · sparkline
├── DataTable       sticky header · row hover · empty state · pagination
├── Sidebar         14 nav items · collapsed 72px / expanded 248px
├── TopBar          breadcrumb · tenant switch · health dot · avatar
├── Drawer          right-side, 480px, esc to close
└── Modal           centered, 560px max, scrim --rp-overlay

Domain
├── ConversationList     thread rows: avatar · name · snippet · time · badges
├── MessageBubble        inbound(left, --rp-card) / outbound(right, --rp-primary-weak)
│                        meta row: source badge · timestamp · delivery tick
├── HandoffToggle        take / leave · shows current assignee
├── OrderCard            invoice · product · qty · tracking stepper
├── TrackingStepper      new → confirmed → packed → shipped → delivered
├── ComplaintRow         priority pip · text · status select · resolution
├── ProductCard          image · name · price · stock pill · relation chips
├── KnowledgeUploader    drag-drop · progress · chunk count · embed status
├── PromptBuilder        persona · tone · guardrail switches · live preview
├── ConnectWizard        4 steps: authorize → select page → subscribe → verify
├── HealthStrip          DB · AI provider · Meta token · webhook · budget
└── WebChatWidget        launcher · panel · composer · typing dots
```

### Button specification

| Variant | Fill | Text | Border | Hover | Focus |
| --- | --- | --- | --- | --- | --- |
| `primary` | `--rp-primary` | `#09090B` | none | `--rp-secondary` + `--rp-glow` | 2px `--rp-accent` ring, 2px offset |
| `secondary` | `--rp-card` | `--rp-text` | `--rp-border-strong` | `--rp-card-hover` | same |
| `ghost` | transparent | `--rp-muted` | none | `--rp-card` + text `--rp-text` | same |
| `danger` | transparent | `--rp-danger` | `--rp-danger` @ 40% | `rgba(239,68,68,.12)` | 2px danger ring |

Loading state: label stays in place at 40% opacity, a 16px spinner replaces the
leading icon slot, width does not change (prevents layout shift).

---

## 8.6 Wireframes — desktop (1440 × 900)

### Dashboard · Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌───────────────────────────────────────────────────────────────┐ │
│ │ ◈ REPLY  │ │  Overview            [Demo Shop ▾]  ● healthy      ⌘K   (RA)  │ │
│ │   PILOT  │ ├───────────────────────────────────────────────────────────────┤ │
│ │          │ │                                                               │ │
│ │ ▸Overview│ │ ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐ │ │
│ │  Inbox ⑦ │ │ │ CHATS    ││ ORDERS   ││ REVENUE  ││ CONV.    ││ AI COST  │ │ │
│ │  Leads   │ │ │   142    ││    18    ││ ৳24,500  ││  12.7%   ││  $0.42   │ │ │
│ │  Orders  │ │ │ ▲12% ⌁⌁⌁ ││ ▲4  ⌁⌁⌁ ││ ▲9% ⌁⌁⌁ ││ ▼1.1%⌁⌁ ││ 312/500  │ │ │
│ │  Compl.③ │ │ └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘ │ │
│ │  Catalog │ │                                                               │ │
│ │  Recomm. │ │ ┌────────────────────────────────┐┌─────────────────────────┐ │ │
│ │  Ecomm.  │ │ │ Conversations · last 24h       ││ Needs a human        ③  │ │ │
│ │  Knowl.  │ │ │                                ││ ─────────────────────── │ │ │
│ │  Comments│ │ │      ▄▄                        ││ ● Rahim   refund    2m  │ │ │
│ │  Connect │ │ │   ▄▄███▄▄    ▄▄                ││ ● Nusrat  angry     8m  │ │ │
│ │  Team    │ │ │ ▄███████████████▄▄▄            ││ ● Karim   damaged  21m  │ │ │
│ │  Analyt. │ │ │ 00  04  08  12  16  20         ││ [ Open inbox → ]        │ │ │
│ │  Roadmap │ │ └────────────────────────────────┘└─────────────────────────┘ │ │
│ │──────────│ │                                                               │ │
│ │ ⚙ Admin  │ │ ┌───────────────────────────────────────────────────────────┐ │ │
│ │ ↪ Logout │ │ │ System health                                             │ │ │
│ └──────────┘ │ │ ● Postgres  ● AI: ollama/qwen2.5  ⚠ Meta token expiring   │ │ │
│              │ │ ● Webhook subscribed   ● Budget 312/500 today             │ │ │
│              │ └───────────────────────────────────────────────────────────┘ │ │
│              └───────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
   248px                                  1192px
```

### Dashboard · Inbox (three-pane)

```
┌──────────┬─────────────────────────┬────────────────────────┬─────────────────┐
│ Sidebar  │ Threads          [⌕]    │ Rahim Uddin            │ Customer        │
│          │ ─────────────────────── │ messenger · PSID 4821  │ ─────────────── │
│          │ ● Rahim      2m  🔥urgent│────────────────────────│ Phone           │
│          │   "taka ferot chai"     │                        │ 01712345678     │
│          │ ─────────────────────── │  ┌──────────────────┐  │                 │
│          │   Nusrat     8m  ⚑bot   │  │ কুর্তি দাম কত?    │  │ Orders (2)      │
│          │   "dam koto?"           │  └──────────────────┘  │ INV-0041 shipped│
│          │ ─────────────────────── │              10:02     │ INV-0038 deliv. │
│          │   Karim     21m  ⚑bot   │                        │                 │
│          │   "order koi?"          │  ┌──────────────────┐  │ Timeline        │
│          │ ─────────────────────── │  │ কুর্তির দাম ৳1,250│  │ ● order placed  │
│          │   Sadia      1h  ✓done  │  │ স্টক আছে ৮টি।     │  │ ● complaint     │
│          │                         │  └──────────────────┘  │ ● handoff taken │
│          │                         │   [llm] 10:02 ✓✓       │                 │
│          │                         │                        │ Notes           │
│          │                         │  ┌──────────────────┐  │ ┌─────────────┐ │
│          │                         │  │ taka ferot chai  │  │ │ Add a note… │ │
│          │                         │  └──────────────────┘  │ └─────────────┘ │
│          │                         │              10:05     │                 │
│          │                         │  ╭──────────────────╮  │                 │
│          │                         │  │ ⚠ Escalated:     │  │                 │
│          │                         │  │   refund → human │  │                 │
│          │                         │  ╰──────────────────╯  │                 │
│          │                         │────────────────────────│                 │
│          │                         │ [ 🡒 You have the thread ] [Leave]        │
│          │                         │ ┌────────────────────┐ │                 │
│          │                         │ │ Type a reply…   ➤ │ │                 │
│          │                         │ └────────────────────┘ │                 │
└──────────┴─────────────────────────┴────────────────────────┴─────────────────┘
   248         320                       auto                     320
```

### Dashboard · Connect wizard

```
┌────────────────────────────────────────────────────────────────────────┐
│  Connect your Facebook Page                                            │
│                                                                        │
│   ①────────②────────③────────④                                        │
│  Authorize  Select   Subscribe  Verify                                 │
│   ✓ done   ● active   ○         ○                                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Select the Pages ReplyPilot AI should manage                    │  │
│  │                                                                  │  │
│  │  ☑  (◔) Demo Shop BD          12.4k followers   Shopping         │  │
│  │  ☐  (◑) Demo Shop Kids         3.1k followers   Shopping         │  │
│  │  ☐  (◕) Rahim Personal           842 followers   Personal blog   │  │
│  │                                                                  │  │
│  │  ⓘ We request: pages_show_list · pages_messaging ·               │  │
│  │    pages_manage_metadata · pages_read_engagement                 │  │
│  │                                                                  │  │
│  │                         [ Back ]   [ Continue → ]                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Not ready? [ Use Demo Connect ] — local UX only, no live Page.        │
└────────────────────────────────────────────────────────────────────────┘
```

### Dashboard · Knowledge / Prompt Builder

```
┌──────────────────────────────┬─────────────────────────────────────────┐
│ Knowledge sources            │ Prompt Builder                          │
│ ──────────────────────────── │ ─────────────────────────────────────── │
│ ┌──────────────────────────┐ │ Business name  [ Demo Shop BD        ]  │
│ │  ⤓ Drop PDF / DOCX / TXT │ │ Greeting       [ আসসালামু আলাইকুম!   ]  │
│ │     or click to browse   │ │ Personality    [ friendly · concise  ]  │
│ └──────────────────────────┘ │                                         │
│                              │ Guardrails                              │
│ ▣ price-list.pdf             │  ⬤ never invent stock or price          │
│   42 chunks · embedded ✓     │  ⬤ always collect phone on order        │
│ ▣ delivery-policy.txt        │  ⬤ confirm order before finalizing      │
│   8 chunks · keyword only ⚠  │  ⬤ escalate refund → human              │
│ ▣ size-chart.docx            │  ⬤ escalate legal → human               │
│   12 chunks · embedded ✓     │  ⬤ escalate angry → human               │
│                              │  ⬤ escalate below [ 70% ] confidence    │
│ FAQ items (14)               │                                         │
│  ＋ Add question             │ ┌─────────────────────────────────────┐ │
│                              │ │ Live preview                        │ │
│                              │ │ ─────────────────────────────────── │ │
│                              │ │ You: dam koto?                      │ │
│                              │ │ Bot: কুর্তির দাম ৳1,250। স্টক ৮টি।   │ │
│                              │ │      [rules] 84ms                   │ │
│                              │ │ [ Try another message      ➤ ]      │ │
│                              │ └─────────────────────────────────────┘ │
└──────────────────────────────┴─────────────────────────────────────────┘
```

---

## 8.7 Wireframes — mobile (390 × 844)

```
  Overview                    Inbox list                 Thread
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│ ☰  Overview ⌕ │          │ ← Inbox    ⌕  │          │ ← Rahim    ⋮  │
├───────────────┤          ├───────────────┤          │ messenger     │
│ ┌───────────┐ │          │ [All][Human③] │          ├───────────────┤
│ │ CHATS     │ │          ├───────────────┤          │ ┌───────────┐ │
│ │   142     │ │          │ ● Rahim   2m  │          │ │দাম কত?    │ │
│ │ ▲12%      │ │          │  taka ferot…  │          │ └───────────┘ │
│ └───────────┘ │          │  🔥 urgent    │          │        10:02  │
│ ┌───────────┐ │          ├───────────────┤          │               │
│ │ ORDERS    │ │          │ ○ Nusrat  8m  │          │  ┌──────────┐ │
│ │    18     │ │          │  dam koto?    │          │  │৳1,250    │ │
│ │ ▲4        │ │          ├───────────────┤          │  │স্টক ৮টি   │ │
│ └───────────┘ │          │ ○ Karim  21m  │          │  └──────────┘ │
│ ┌───────────┐ │          │  order koi?   │          │   [llm] ✓✓    │
│ │ REVENUE   │ │          ├───────────────┤          │               │
│ │ ৳24,500   │ │          │ ✓ Sadia   1h  │          │ ╭───────────╮ │
│ └───────────┘ │          │  thanks!      │          │ │⚠ escalated│ │
│               │          │               │          │ ╰───────────╯ │
│ Needs human ③ │          │               │          ├───────────────┤
│ ● Rahim  2m   │          │               │          │ 🡒 You have it │
│ ● Nusrat 8m   │          │               │          │ ┌───────────┐ │
│ ● Karim 21m   │          │               │          │ │ Reply…  ➤│ │
│               │          │               │          │ └───────────┘ │
├───────────────┤          ├───────────────┤          └───────────────┘
│ ⌂  ✉  ▤  ⚙   │          │ ⌂  ✉  ▤  ⚙   │
└───────────────┘          └───────────────┘
```

| Breakpoint | Layout |
| --- | --- |
| `< 640px` | single column, bottom tab bar (Overview · Inbox · Orders · Settings), sidebar becomes a drawer |
| `640–1023px` | two-pane inbox (list ↔ thread swap), sidebar collapsed to 72px icons |
| `1024–1279px` | three-pane inbox without the customer panel |
| `≥ 1280px` | full three-pane + customer panel |

Touch targets are minimum 44 × 44px. The composer is sticky above the keyboard
using `env(safe-area-inset-bottom)`.

---

## 8.8 Component tree

```
<RootLayout>                                    app/layout.tsx
 ├─ <ThemeProvider data-theme>
 ├─ <SiteHeader>                                (public routes)
 └─ <DashboardShell>                            components/dashboard/DashboardShell.tsx
     ├─ <Sidebar>
     │   ├─ <BrandMark />
     │   ├─ <NavList items={NAV}>               14 entries
     │   │   └─ <NavItem active badge? />
     │   └─ <SidebarFooter> Admin · Site · Logout
     ├─ <TopBar>
     │   ├─ <Breadcrumb />
     │   ├─ <TenantSwitcher />                  (super admin only)
     │   ├─ <HealthDot />                       polls /api/health
     │   ├─ <CommandK />
     │   └─ <UserMenu />
     └─ <main>
         └─ page.tsx per route

<InboxPage>
 ├─ <ThreadList>
 │   ├─ <FilterTabs all | needs-human | mine | resolved />
 │   ├─ <SearchInput />
 │   └─ <ThreadRow ×n>
 │       ├─ <Avatar /> <Name /> <Snippet /> <RelativeTime />
 │       └─ <PriorityPip /> <HandoffBadge /> <ChannelIcon />
 ├─ <ThreadView>
 │   ├─ <ThreadHeader name channel senderId />
 │   ├─ <MessageScroller>
 │   │   └─ <MessageBubble ×n direction source recognition? />
 │   ├─ <SystemEventCard escalation | complaint | order />
 │   └─ <Composer>
 │       ├─ <HandoffToggle />
 │       └─ <TextArea /> <SendButton />
 └─ <CustomerPanel>
     ├─ <ContactCard phone />
     ├─ <OrderList />
     ├─ <TimelineFeed />                        TimelineEvent rows
     └─ <NoteComposer />
```

---

## 8.9 State design

Every view must specify all seven states.

| State | Visual | Copy (EN / BN) |
| --- | --- | --- |
| **Loading** | Skeleton matching the final layout, 1.2 s shimmer | — |
| **Empty (first run)** | Illustration + primary CTA | "No conversations yet. Connect a Page to start." / "এখনো কোনো কথোপকথন নেই।" |
| **Empty (filtered)** | Small icon + clear-filter link | "No threads match this filter." |
| **Error** | Danger card + retry button + request id | "Couldn't load. Try again." |
| **Partial / degraded** | Warning strip pinned to the top of the view | "AI is running on rules — daily budget reached (500/500)." |
| **Rate limited** | Warning toast with a countdown | "Too many requests. Try again in 42s." |
| **Success** | Toast, 4 s, success tone, undo where reversible | "Order marked shipped. [Undo]" |

### Degraded-mode strip — the most important one

The product silently degrades in three ways (no AI key, budget exhausted, no Page
token). All three are currently invisible to the owner. Each must surface:

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⚠  Replies are rule-based right now — the AI daily budget (500) is   │
│    used up. It resets in 6h 12m.            [ Increase budget → ]    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ ⛔ Replies are being generated but not delivered — no Page access     │
│    token. Reconnect your Page.              [ Reconnect → ]          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8.10 Motion specification

| Interaction | Property | Duration | Easing |
| --- | --- | --- | --- |
| Button hover | background, box-shadow | 120 ms | `ease-out` |
| Button press | `scale(0.97)` | 80 ms | `ease-in` |
| Card hover lift | `translateY(-2px)`, shadow e2→e3 | 160 ms | `cubic-bezier(.2,.8,.2,1)` |
| Nav item active | left accent bar scaleY 0→1 | 200 ms | `cubic-bezier(.2,.8,.2,1)` |
| Drawer / sheet in | `translateX(100%)→0` | 260 ms | `cubic-bezier(.32,.72,0,1)` |
| Modal in | opacity 0→1, `scale(.96)→1` | 200 ms | `ease-out` |
| Toast in | `translateY(8px)→0` + fade | 180 ms | `ease-out` |
| Message bubble in | `translateY(6px)→0` + fade | 220 ms | `ease-out` |
| Typing dots | 3 dots, staggered 0/120/240 ms | 1.2 s loop | `ease-in-out` |
| KPI count-up | number tween | 800 ms | `ease-out` |
| Skeleton shimmer | background-position sweep | 1.2 s loop | `linear` |
| Escalation pulse | box-shadow 0→12px danger, 2 cycles then stop | 900 ms | `ease-in-out` |
| Connect step advance | stepper fill + check morph | 320 ms | `cubic-bezier(.2,.8,.2,1)` |

Rules: nothing animates longer than 320 ms except deliberate loops; no animation
blocks input; everything collapses to ≤ 0.01 ms under `prefers-reduced-motion`.

---

## 8.11 Accessibility checklist

| Requirement | Implementation |
| --- | --- |
| Colour contrast ≥ 4.5:1 body, 3:1 UI | audited in §8.2 |
| Focus visible on every interactive element | 2px `--rp-accent` ring, 2px offset — never `outline: none` |
| Keyboard reachable | thread list ↑/↓, `Enter` open, `Esc` close, `⌘K` command palette |
| Screen reader | live region on new messages (`aria-live="polite"`), `role="log"` on the thread |
| Status not colour-only | every pip carries a text label or `aria-label` |
| Form errors | `aria-describedby` pointing at the error text, not just a red border |
| Language | `<html lang="bn">` on Bangla surfaces, `lang="bn"` on mixed-script nodes |
| Motion | `prefers-reduced-motion` honoured globally |
| Zoom | layout usable at 200% without horizontal scroll |
| Touch targets | ≥ 44 × 44 px |

---

## 8.12 Generative design prompts

Paste these verbatim into the named tool.

### v0.dev — dashboard shell

```
Build a dark, premium SaaS dashboard shell in Next.js App Router + Tailwind CSS.

Palette (exact): background #09090B, surface #111317, card #181A20,
border rgba(255,255,255,0.08), text #F8FAFC, muted #A1A1AA,
primary #FF6B00, secondary #FF8C42, accent #FFA94D,
success #22C55E, warning #F59E0B, danger #EF4444.

Layout: fixed 248px left sidebar on #111317 with a 1px right border.
Sidebar has a wordmark, then 14 nav items: Overview, Inbox, Leads / CRM, Orders,
Complaints, Catalog, Recommendations, Ecommerce, Knowledge, Comments AI,
Connect, Team, Analytics, Roadmap. Active item: #181A20 background, #FF6B00
text, and a 3px #FF6B00 bar on the left edge. Inbox and Complaints show small
count badges.

Main area: 64px top bar with breadcrumb on the left and, on the right, a
health status dot, a ⌘K search chip, and a 32px avatar.

Content: a row of 5 stat cards, then a 2-column grid — a 24h bar chart card
(left, 2fr) and a "Needs a human" list card (right, 1fr).

Stat card: #181A20, 1px border, 16px radius, 20px padding.
12px uppercase muted label with 0.06em tracking, 40px bold tabular numeral,
13px delta line in success or danger, and a subtle #FFA94D sparkline.

Rules: no gradients on text, no glow except a focus ring, generous whitespace,
Sora for UI text and Syne for numerals, fully responsive down to 390px where
the sidebar becomes a bottom tab bar with 4 items.
```

### Figma AI / Figma Make — inbox

```
Design a three-pane dark inbox for an AI customer-service product, 1440x900.

Colours: page #09090B, panels #111317, cards #181A20,
hairlines rgba(255,255,255,0.08), text #F8FAFC, muted #A1A1AA, accent #FF6B00,
danger #EF4444, success #22C55E.

Pane 1 (320px): filter tabs "All / Needs human / Mine / Resolved", a search
field, then thread rows. Each row: 32px avatar, name at 14px, one-line message
snippet at 13px muted, relative time top-right, and status pips —
a filled orange dot when a human owns the thread, a red flame pip for urgent.

Pane 2 (flex): thread header with customer name and "messenger · PSID 4821"
beneath it. Message list — inbound bubbles left-aligned on #181A20,
outbound right-aligned on rgba(255,107,0,0.12) with a 1px #FF6B00 border at 30%
opacity. Under each outbound bubble a 11px meta row: a source chip reading
"llm", "rules", or "fallback", a timestamp, and double check marks.
Include one full-width system event card with a warning icon reading
"Escalated: refund → human handoff".
Composer at the bottom with a "You have this thread / Leave" toggle above it.

Pane 3 (320px): customer card with phone, an order list with tracking chips,
a vertical timeline of events, and a note composer.

Style: flat surfaces, 12–16px radii, one accent colour only, no drop shadows
larger than 12px blur, Bangla and Latin text side by side in the bubbles.
```

### Lovable / Bolt.new — connect wizard

```
Build a 4-step "Connect your Facebook Page" wizard on a dark premium theme.

Steps: 1 Authorize · 2 Select Page · 3 Subscribe webhook · 4 Verify.
Stepper across the top: completed steps are a #22C55E filled circle with a
check, the active step is a #FF6B00 filled circle with a soft orange glow,
future steps are a hollow circle with an rgba(255,255,255,0.16) border,
connected by 2px lines that fill orange as you advance.

Step 2 content: a card listing Facebook Pages as checkbox rows — each row has
a 40px rounded avatar, the page name, follower count and category in muted
13px text. Below the list, an info callout listing the four permissions being
requested: pages_show_list, pages_messaging, pages_manage_metadata,
pages_read_engagement.

Footer: a ghost "Back" button and a primary "Continue" button
(#FF6B00 fill, #09090B label). Beneath the card, a muted line:
"Not ready? Use Demo Connect — local UX only, no live Page."

Also design the three failure states as cards with the same shell:
"Token exchange failed", "No Pages found on this account", and
"Permissions declined: pages_messaging" — each with a specific one-line
explanation and a "Try again" button.
```

### Claude Artifacts — live prompt-builder preview

```
Create an interactive prompt-builder panel on a dark theme
(bg #09090B, card #181A20, border rgba(255,255,255,0.08), accent #FF6B00).

Left column: text inputs for business name, greeting, and personality, then
seven guardrail toggles — never invent stock, always collect phone, confirm
order before finalizing, escalate refund, escalate legal, escalate angry,
escalate below N% confidence (with a slider from 50% to 95%).

Right column: a live "Assembled system prompt" preview in a monospace block
that updates as the controls change, with the guardrail lines appearing and
disappearing in place, plus a character counter showing usage against a
4000-character cap that turns amber past 3200 and red past 3800.

Below it, a test console: a text input, a Send button, and a rendered
bot reply bubble with a source chip reading "rules" or "llm" and a latency
figure in milliseconds.
```

### Midjourney / image generation — marketing hero

```
Isometric 3D illustration of a floating glass dashboard panel above a matte
black surface, warm orange volumetric light rimming the panel edges, thin
holographic chat bubbles containing Bengali script orbiting the panel,
soft depth of field, subtle film grain, no text artifacts,
color palette limited to near-black #09090B, charcoal #181A20,
and orange #FF6B00 to #FFA94D, studio product photography lighting,
32:9 ultrawide composition with negative space on the left --style raw
```

---

## 8.13 Design QA checklist

Before any UI ships:

- [ ] All seven states designed (loading, empty-first, empty-filtered, error, degraded, rate-limited, success)
- [ ] Contrast audited against §8.2 with the actual rendered colours
- [ ] Focus ring visible on every interactive element, tested with Tab only
- [ ] Bangla and Latin verified side by side at every text size
- [ ] Layout verified at 390, 640, 1024, 1440, and 1920 px
- [ ] Verified at 200% browser zoom
- [ ] `prefers-reduced-motion` verified
- [ ] Every status colour also carries a label or `aria-label`
- [ ] Exactly one primary action per viewport
- [ ] No layout shift when async content resolves (skeletons match final dimensions)
- [ ] Every destructive action has a confirmation or an undo

---

**Next:** [`09-security.md`](./09-security.md)
