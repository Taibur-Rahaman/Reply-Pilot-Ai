# Reply Pilot AI — UX Audit & Redesign Plan for Non-Technical Users

**Audience assumption:** restaurant owners, grocery/clothing sellers, FB Live sellers, housewives, clinic receptionists, salon owners. Little computer knowledge. Never used AI. Mobile-first. Slow internet. Many aged 45+.

**Method:** every route under `src/app` was read line-by-line. 21 user-reachable screens reviewed. Findings cite real file paths and line numbers.

**Usability score for the target audience: 23 / 100.**

The product is feature-rich and the data model is solid. The interface, however, is an internal engineering console that was never translated for its buyers. A 60-year-old shop owner cannot complete the core job (connect Facebook → AI answers customers) on any current screen.

---

## 1. Screen-by-screen verdict

The three questions asked of every screen:
- **Q1** Can a 60-year-old shop owner use this?
- **Q2** Can a first-time computer user understand this?
- **Q3** Can someone finish the task in under 3 minutes?

| # | Screen | Route | Q1 | Q2 | Q3 | Verdict |
|---|---|---|----|----|----|---|
| 1 | Sign in | `/login` | ✗ | ✗ | ✓ | Redesign |
| 2 | Overview | `/dashboard` | ✗ | ✗ | ✗ | Rebuild |
| 3 | Connect | `/dashboard/connect` | ✗ | ✗ | ✗ | Rebuild (most critical) |
| 4 | Inbox | `/dashboard/chats` | ✗ | ✗ | ✗ | Rebuild |
| 5 | Knowledge | `/dashboard/knowledge` | ✗ | ✗ | ✗ | Split into wizard + settings |
| 6 | Leads / CRM | `/dashboard/leads` | ✗ | ✗ | ✓ | Redesign + merge |
| 7 | Orders | `/dashboard/orders` | ✗ | ✗ | ✗ | Redesign |
| 8 | Complaints | `/dashboard/complaints` | ✗ | ✗ | ✓ | Merge into Customers |
| 9 | Catalog | `/dashboard/catalog` | ✗ | ✗ | ✗ | Redesign + merge |
| 10 | Recommendations | `/dashboard/recommendations` | ✗ | ✗ | ✗ | Hide (auto) |
| 11 | Ecommerce | `/dashboard/ecommerce` | ✗ | ✗ | ✗ | Move to Advanced |
| 12 | Comments AI | `/dashboard/comments` | ✗ | ✗ | ✗ | Merge into Messages |
| 13 | Team | `/dashboard/team` | ✗ | ✗ | ✓ | Move to Settings |
| 14 | Analytics | `/dashboard/analytics` | ✗ | ✗ | ✓ | Merge into Home |
| 15 | Roadmap | `/dashboard/planned` | ✗ | ✗ | — | **Delete** |
| 16 | Admin lite | `/admin` | ✗ | ✗ | ✗ | **Remove from user nav** |
| 17 | Admin tenants | `/admin/tenants` | — | — | — | Staff-only, gate properly |
| 18 | Landing | `/` | ~ | ~ | — | Minor copy work |
| 19 | Privacy | `/privacy` | ✓ | ~ | — | Acceptable |
| 20 | Terms | `/terms` | ✓ | ~ | — | Acceptable |
| 21 | Web chat widget | component | ✓ | ✓ | ✓ | Acceptable |

**0 of 17 in-product screens pass all three questions.**

---

## 2. Critical problems (ship-blockers)

### C1. Sign-in screen leaks the admin password in plain text
`src/components/auth/DashboardLoginForm.tsx:7,11-13,42-51,68`

The email field is **pre-filled** with `admin@demo.replypilot.local`, the help text prints the password `facetai-demo`, and the password placeholder repeats it. Gated only on `process.env.NODE_ENV !== "production"` — any staging, preview, or self-hosted deployment that misses that flag ships credentials on the front door. A non-technical user also cannot tell whether this is *their* account.

### C2. Admin API is fully open when `ADMIN_PASSWORD` is unset
`src/app/api/admin/config/route.ts:17-26`

`checkAuth` returns `true` for *any* request when no password is configured and `NODE_ENV !== "production"`. The client at `src/app/admin/page.tsx:52-55` deliberately probes with an empty password on mount. Combined with C1, a preview deployment exposes the whole bot configuration.

### C3. The Overview page shows environment variable names as the user's checklist
`src/app/dashboard/page.tsx:106-115`

The first screen after login lists `META_VERIFY_TOKEN`, `META_PAGE_ACCESS_TOKEN (env)`, `META_APP_SECRET`, `META_APP_ID (Connect)`, `META_REDIRECT_URI` with pass/fail dots. A grocery shop owner has no possible action here. Line 90-92 also prints `Tenant <code>{tenantId}</code> · Role <code>{role}</code>` and the phrase "Sales Agent home KPIs (Postgres)".

### C4. The Connect screen — the single most important screen — is a developer console
`src/app/dashboard/connect/page.tsx`

- Line 63-69: title lead reads `"F39 — Login with Facebook → Select Page → Connect. Auto webhook + permissions when Meta credentials are set. Not marketed as live without App Review."` — an internal ticket ID and legal hedging.
- Line 73: `Mode: {mode === "oauth_ready" ? "OAuth ready" : "Demo only"}`
- Line 80-82: instructs the user to set `META_APP_ID` + `META_REDIRECT_URI`.
- Line 86-93: "Demo Connect (local UX)" with a "Mock page name" field.
- Line 107-111: `pageId {p.pageId} · webhook yes/no · perms ok/pending`
- Line 125: heading "Real Meta Embedded Signup steps".
- Line 45: raw OAuth failures are rendered straight through as `` `Error: ${err}` ``.

There is no large "Connect My Facebook Page" button, no page-picker cards, no success state.

### C5. No onboarding exists at all
There is no wizard, no first-run experience, no business-type question, no progress indicator. Login lands directly on the env-var checklist (C3). The user is expected to discover Connect → Knowledge → Catalog on their own across a 14-item menu.

### C6. Fake data is seeded into the account the user logs into
`src/lib/db/seed.ts`

Seeds fake conversations from `fb_user_demo_1`, `ig_user_demo`, `web_guest_demo`, `tg_user_demo` (line 341-393), five demo products `prod_demo_1..5` (line 156-232), a sample order (line 147), and demo FAQs (line 102-109). A new shop owner opens their Inbox and sees conversations with customers who do not exist. This destroys trust in every number on every screen.

*(Note: seeding runs from `scripts/seed.ts`, not at runtime — but the demo tenant is what ships.)*

### C7. Developer pages are linked from the customer menu
`src/components/dashboard/DashboardShell.tsx:97-99`

"Admin lite" sits in the customer sidebar. It opens `src/app/admin/page.tsx`, which exposes the raw **System prompt** textarea, **Page ID**, a `.env.local` instruction (line 108), the webhook path `/api/messenger/webhook`, and an internal docs path `docs/PHASE2-AI-BOT.md` (line 236-241).

### C8. Every error is a developer string
37 occurrences of `error: "Unauthorized."` plus `"Update failed."`, `"Create failed."`, `"Save failed."`, `"Invalid signature."`, `"Unknown action."`, `"text required."`, `"id required."`, `"No products parsed. Send JSON array or CSV."`, `"META_VERIFY_TOKEN is not set"`. These render directly into the UI via `data.error || "Fail"` — the literal fallback string is **"Fail"** (`chats/page.tsx:77,93,121`, `ecommerce/page.tsx:73,87`, `knowledge/page.tsx:93`).

---

## 3. High-priority problems

### H1. Navigation has 17 destinations, not 5
`DashboardShell.tsx:8-23` — 14 nav items, plus Admin lite, Landing, Log out. All are undifferentiated text links with no icons. On mobile they collapse behind a "Menu" / "Close" text toggle (line 63-71).

### H2. Internal ticket IDs and release waves shipped in product copy
| Screen | String | Location |
|---|---|---|
| Connect | `F39 —` | `connect/page.tsx:64` |
| Catalog | `F40 — name, price, image URL, stock.` | `catalog/page.tsx:70` |
| Leads | `(F43)` | `leads/page.tsx:70` |
| Team | `Team & RBAC` / `F44 stub` / `Wave C` | `team/page.tsx:51-55` |
| Analytics | `F47 thin slice` / `Wave B` | `analytics/page.tsx:36-40` |
| Roadmap | `F41`, `F45`, `F49`, `F50`, `Wave B+`, `Wave C` | `planned/page.tsx:1-45` |

### H3. The Roadmap page advertises what the product cannot do
`src/app/dashboard/planned/page.tsx` — a paying customer sees "Planned", "Roadmap stub", "Partial → next", and the admission "Native mobile remains future". Internal backlog, customer-facing.

### H4. Competitor named inside the product
`knowledge/page.tsx:122-123` — *"Connect stubs for Website, Facebook FAQ, Google Drive, Sheets, Notion — unique vs LazyChat."*

### H5. Knowledge page is one 15-field form of AI jargon
`knowledge/page.tsx:120-282` — a single screen containing: "Bot config", "Personality (Prompt Builder)", "**Hard guardrails**" fieldset with 7 checkboxes, "**Confidence threshold (0–1)**" numeric input, "**System prompt (Bangla-first)**" 6-row textarea, "Product FAQ text", "Default product image URL", "Abandoned lead hours", "Human handoff on operator echo". Then "Upload knowledge" ("stub extract", "DOCX accepted as stub (binary extract next-step)"), then "Connect sources (**stubs**)" — five buttons that only record an intent (`stub_crawl`, `stub_facebook_faq`, `stub_google_drive`, `stub_google_sheets`, `stub_notion`, line 98-116) and do nothing.

Asking a salon owner to tune a confidence threshold between 0 and 1 is the clearest single failure in the product.

### H6. Inbox opens with a "Demo ingest (channel stubs)" form
`chats/page.tsx:129-178` — the *first* panel on the Inbox is a fake-message generator. The page lead cites `/api/webchat` in a `<code>` tag. Channel filters render raw lowercase enum values (`all`, `messenger`, `whatsapp`…, line 137-148). Message direction is printed raw as `in`/`out` (line 291). Product recognition prints `Recognized: X (87% · method)` including the internal method name.

Three of the six channel filters (WhatsApp, Instagram, Telegram) are stubs, implying integrations that do not exist.

### H7. Recommendations asks the user to type database IDs
`recommendations/page.tsx:97-99` — *"Enter product IDs comma-separated (see Catalog). Example: prod_demo_2"*, across three fields labelled "Upsell of (this is upsell for…)", "Cross-sell of", "Bundle with". Results render as `[{kind}] {name} · score 4.2 · {reason}`.

### H8. Ecommerce screen asks for API keys
`ecommerce/page.tsx:122-135` — field labelled "API key / token" with placeholder `ck_… / shpat_… / …`. Below it, a "Manual CSV / JSON import" textarea labelled **"Payload"**, pre-filled with `Demo Polo,750,20,White,L,apparel,POLO-WHT`. Sync reports `Synced N products (stub/demo)`.

### H9. Team screen collects plaintext passwords for staff
`team/page.tsx:83-91` — the owner types a password *on behalf of* each employee. No invite email, no reset flow. Roles render as `<code>admin</code>`.

### H10. Silent blur-to-save with no confirmation
`catalog/page.tsx:132,148-151,167-170,185-188` and `orders/page.tsx:218-232` — table cells save when focus leaves the field. No save button, no toast, no undo. Users who tab away or scroll on mobile will not know whether anything happened.

---

## 4. Medium problems

- **M1 — Type is too small.** `globals.css` dashboard scope uses `0.72rem` (≈11.5px, line 1031), `0.75rem` (1042, 1094), `0.78rem` (755, 924, 964), `0.82rem` (496), `0.85rem` (807, 837, 1280), `0.88rem` (778, 1108), `0.9rem` (523, 768, 1222, 1333), `0.92rem` (272, 846, 885, 1053). The majority of dashboard text renders below the 16px accessibility floor.
- **M2 — Touch targets.** `.btn` has `min-height: 2.85rem` (≈45.6px) — acceptable. But inline table `<select>` and `<input>` elements (Orders, Catalog, Complaints, Leads) inherit no minimum height and fall below 44px.
- **M3 — Tables overflow on phones.** Orders is a 6-column table with two inline text inputs and a select inside one row (`orders/page.tsx:176-247`). `.dash-table-wrap` scrolls horizontally — the primary usage mode is mobile.
- **M4 — "AI cost (est.)" is a headline KPI.** `dashboard/page.tsx:79-83`. Token spend shown to a shop owner as one of six top metrics.
- **M5 — Analytics dumps raw enum keys.** `analytics/page.tsx:69-85` renders `Object.entries(byCrmStage)` and `byTrackingStatus` as `new: 3`, `refund_pending: 1`, `packed: 2`.
- **M6 — Loading states are bare text.** "Loading dashboard…", "Loading overview…", "Loading analytics…", "Loading Connect…". No skeletons. On slow connections this reads as a broken page.
- **M7 — Status messages are not announced.** `setStatus("Saved")` renders into a `<p className="dash__muted">` with no `role="status"` / `aria-live`. Screen-reader and low-vision users get no feedback.
- **M8 — No success screens anywhere.** No confirmation moment after connecting a page, saving business info, or creating an order.
- **M9 — Mixed Bengali/English with no language switch.** Placeholders like `"Stock ase? / দাম কত?"`, `"প্রোডাক্ট নষ্ট এসেছে / Wrong size — need exchange"`, `"প্রাইস কত?"` are hardcoded.
- **M10 — Sidebar labels use slashes and jargon:** "Leads / CRM", "Comments AI", "Ecommerce", "Knowledge", "Roadmap".

---

## 5. Low-priority problems

- **L1** — `Delete` in Catalog (`catalog/page.tsx:192-198`) has no confirmation dialog.
- **L2** — Empty states are inconsistent: Orders and Leads have helpful ones; Complaints shows "No complaints yet.", Inbox shows "Select a thread."
- **L3** — Complaints "Log complaint" field is labelled just **"Text"**, button just **"Add"**.
- **L4** — Currency label reads `Today revenue ৳` with the symbol trailing the label.
- **L5** — "Conversion %" is shown with no explanation of what converted.
- **L6** — Mobile nav toggle is the word "Menu"/"Close" rather than a hamburger icon.
- **L7** — `/dashboard/login` is a dead legacy redirect route.
- **L8** — Timeline entries render the raw `type` field in bold (`chats/page.tsx:273`).

---

## 6. Vocabulary replacement table

Applies to UI copy, error text, empty states, and tooltips.

| Current term | Replace with |
|---|---|
| OAuth / Login with Facebook / oauth_ready | **Secure Facebook Login** |
| Webhook / webhook subscribed | **Automatic Message Connection** |
| Access token / Page token / META_PAGE_ACCESS_TOKEN | **Secure Connection** |
| Prompt / System prompt / Personality (Prompt Builder) | **AI Instructions** |
| Knowledge / Knowledge Hub / Knowledge Base | **Business Information** |
| Human handoff / handoff / Take over / Release to AI | **Talk to My Team** / **I'll reply myself** / **Let AI continue** |
| Automation rule / guardrail | **Auto Reply Rule** |
| AI confidence / confidence threshold | **Reply Accuracy** |
| Tenant / Tenant ID | *(remove entirely)* |
| CRM / Leads / CRM stage / pipeline | **Customers** / **Customer status** |
| Ingest / Demo ingest | *(remove entirely)* |
| Stub / thin slice / Wave B / F39 | *(remove entirely)* |
| Payload / raw / JSON / CSV import | **Upload my product list** |
| API key / token / ck_… / shpat_… | **Connect my online shop** (OAuth, no key entry) |
| Upsell of / Cross-sell of / Bundle with | **Often bought together** |
| RBAC / role: admin | **Who can do what** / **Owner, Manager, Helper** |
| Escalate | **Ask my team to help** |
| Abandoned lead hours | **Remind me if a customer goes quiet for…** |
| Conversion % | **Customers who bought** |
| AI cost (est.) | *(remove from user view)* |
| Omnichannel Inbox | **Messages** |
| Direction: in / out | **Customer** / **AI** |
| Recognized: X (87% · method) | **AI thinks this is: X** |

---

## 7. Friendly error messages

| Trigger | Current | Replace with |
|---|---|---|
| 401 / `"Unauthorized."` | Unauthorized. | *You've been signed out. Please sign in again.* |
| 403 / `"Forbidden."` | Forbidden. | *You don't have permission for this. Ask your shop owner to help.* |
| 500 / `"Update failed."` etc. | Update failed. | *Something went wrong on our side. Please try again.* |
| `data.error \|\| "Fail"` | **Fail** | *That didn't work. Please try again.* |
| OAuth callback error | `Error: {raw}` | *We couldn't connect your Facebook page. Please try again.* |
| Expired page token | Access Token Invalid | *Your Facebook permission has expired. Tap Reconnect.* |
| Meta unreachable | Webhook Failed | *We're having trouble reaching Facebook. Please try again in a few minutes.* |
| `"Invalid credentials."` | Invalid credentials. | *That email or password doesn't match. Please check and try again.* |
| `"No products parsed. Send JSON array or CSV."` | as-is | *We couldn't read that file. Try uploading an Excel or CSV file.* |
| `"file required."` | file required. | *Please choose a file first.* |
| `"text required."` | text required. | *Please write a message first.* |
| Offline / slow | *(none)* | *You seem to be offline. We'll save this when you reconnect.* |

Every error should carry: plain sentence → one obvious recovery button → optional "Get help on WhatsApp" link.

---

## 8. New information architecture

**From 17 destinations to 5 + Settings.**

```
🏠  Home          (was: Overview + Analytics)
💬  Messages      (was: Inbox + Comments AI)
👥  Customers     (was: Leads/CRM + Complaints)
📦  Orders        (was: Orders)
🏷️  My Products   (was: Catalog + Recommendations + Ecommerce)

⚙️  Settings
     ├─ My Business Info   (was: Knowledge — simplified)
     ├─ My Facebook Page   (was: Connect)
     ├─ My Team            (was: Team & RBAC)
     └─ Advanced ▸         (hidden by default)
```

**Deleted:** Roadmap (`/dashboard/planned`).
**Removed from user nav:** Admin lite, Landing link.
**Moved to Advanced:** AI Instructions, Reply Accuracy, auto-reply rules, online-shop sync, abandoned-customer timing, CSV import.
**Made automatic (no UI):** product recommendations, spam keywords, guardrails.

Every screen: large icons, one primary action, max 5 actions.

---

## 9. Recommended onboarding flow

Six steps, progress bar throughout, every step skippable except 2. Target: **under 3 minutes**.

**Step 0 — Welcome**
> "Hello! I'm your AI assistant. I'll answer your customers on Facebook, day and night. Let's set this up together — it takes 3 minutes."
[ Let's Start ] — one button, full width.

**Step 1 — What type of business do you have?**
Six large tappable cards with illustrations: 🍽️ Restaurant · 🛒 Shop · 🏥 Clinic · 📚 Education · 🏠 Real Estate · ✨ Other.
*Selection silently seeds the AI Instructions, tone, and starter questions. The user never sees a prompt.*

**Step 2 — Connect your Facebook Page**
One large button: **[ Connect My Facebook Page ]**
Below, in small grey text: "We only read and reply to your messages. We never post anything."
On failure: *"We couldn't connect your Facebook page. Please try again."* + [ Try Again ] + [ Get help on WhatsApp ].

**Step 3 — Choose your page**
Large cards, page photo + name, one tap to select. If one page: auto-select and confirm.

**Step 4 — Tell the AI about your business**
One question per screen, big input, [ Skip for now ] always available:
1. What is your business name?
2. What is your phone number?
3. Where are you located?
4. When are you open?
5. Do you deliver? (Yes / No / Sometimes)
6. What do you sell? (free text or photo upload)
7. Any rules customers should know? (returns, advance payment)
8. What do customers ask most? (add up to 3 — pre-filled by business type)

**Step 5 — Your AI is ready** 🎉
> "Your AI assistant is now answering your customers."
Big [ Go To Messages ]. Secondary: [ Send myself a test message ].

**After onboarding:** a persistent, dismissible "Getting started" card on Home with 3 remaining tasks (add products, invite a helper, try a test chat).

---

## 10. Consolidated action list

**Screens to redesign:** Sign in, Home, Connect, Messages, Business Info, Customers, Orders, My Products, Settings — 9 screens replace 17.

**Buttons to rename:**
`Login with Facebook` → **Connect My Facebook Page** · `Take over` → **I'll reply myself** · `Release to AI` → **Let AI continue** · `Save config` → **Save** · `Upload & extract` → **Add this file** · `Process` → **Test it** · `Add` → **Add complaint** · `Escalate` → **Ask my team to help** · `Sync now` → **Update my products** · `Import into catalog` → **Upload my product list** · `Unlock / reload` → **Sign in** · `Queue follow-up` → **Send a reminder**

**Menus to simplify:** sidebar 14 → 5 + Settings; channel filter 6 → connected channels only; order status 7 → 5 (drop `unknown`); complaint status 6 → 3 (Open / Being fixed / Done); roles 4 → 3 (Owner / Manager / Helper).

**Forms to shorten:** Knowledge 15 fields → 8 one-per-screen questions · Orders create 8 fields → 4 (name, phone, what they bought, price) · Team 4 fields → 2 (name, phone — send an invite) · Product add 4 → 3 (name, price, photo upload not URL).

**Features to hide (Advanced):** AI Instructions, Reply Accuracy threshold, guardrail checkboxes, abandoned-customer timing, online shop sync, CSV/JSON import, spam keywords, product relations.

**Features to merge:** Analytics → Home · Complaints → Customers · Comments AI → Messages · Recommendations + Ecommerce → My Products.

**Features to remove:** Roadmap page · Demo ingest form · Demo Connect / mock page · the five non-functional "Connect sources" stub buttons · Admin lite from user nav · env-var status checklist · Tenant/Role display · AI cost KPI · all seeded demo data.

---

## 11. Accessibility & performance requirements

- Base font 16px minimum; body 17–18px; headings 24–32px. Remove every size below `1rem` from dashboard scope.
- Minimum touch target 48×48px including inline table controls.
- Contrast ≥ 7:1 for body text (AAA) given the older audience.
- Replace all data tables with stacked cards below 860px.
- `role="status"` + `aria-live="polite"` on every save/status message.
- Skeleton loaders, not "Loading…" text; optimistic UI on save.
- All actions reachable one-handed on a 360px viewport.
- Bengali/English toggle in Settings, persisted per user.
- Every destructive action gets a confirm dialog naming the item.

---

## 12. Scoring detail

| Dimension | Score | Note |
|---|---|---|
| Onboarding | 0 / 15 | Does not exist |
| Language & terminology | 2 / 15 | Ticket IDs, env vars, "stub", "Payload" |
| Information architecture | 3 / 15 | 17 destinations, no hierarchy |
| Error handling | 2 / 10 | "Fail", "Unauthorized.", raw OAuth errors |
| Visual design & readability | 4 / 10 | Type below 16px throughout |
| Mobile experience | 3 / 10 | Horizontal-scroll tables |
| Trust & honesty | 1 / 10 | Fake seeded data, exposed roadmap |
| Accessibility | 3 / 10 | No live regions, small targets |
| Task completion speed | 5 / 5 | Fast *if* you know the system |
| **Total** | **23 / 100** | |

**Target after redesign: 80+.** The largest single gains are the onboarding wizard (+15), the vocabulary sweep (+13), and the navigation collapse (+12).
