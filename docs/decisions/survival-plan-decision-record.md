# ReplyPilot AI — Survival Plan Decision Record

> **Status:** ARCHITECTURE FROZEN — 2026-08-05
> **Scope:** The full planning session that produced the Alpha/Beta survival plan, and the Alpha code that shipped from it.
> **Authority:** On Stage 0–2 architecture and build order, this file and the plan file win over [`PHASES.md`](./PHASES.md) and [`PRD.md`](./PRD.md), both of which describe a better-funded product than the one currently being built. It does **not** override [`BUSINESS_DECISIONS.md`](./BUSINESS_DECISIONS.md) on product principle, ethics, or guardrails.
> **Plan file:** `~/.claude/plans/want-more-better-plan-replicated-canyon.md`
> **Related:** [`BUSINESS_DECISIONS.md`](./BUSINESS_DECISIONS.md) · [`PHASES.md`](./PHASES.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`LAUNCH_CHECKLIST.md`](../LAUNCH_CHECKLIST.md)

---

## Why this document exists

The planning session behind it ran through seven revisions and reversed direction twice. Most of the value is in **what was rejected and why** — and a plan file only records the surviving answer. Without the discarded branches, the next person (including a future you) re-proposes the local-first CPU router, the three-tier AI gateway, and the channel abstraction, because each one is individually reasonable and only looks wrong against constraints written down here.

Read this before reopening the architecture. Read [`BUSINESS_DECISIONS.md`](./BUSINESS_DECISIONS.md) first for anything about product principle.

---

## 1. The situation that constrains everything

| Constraint | Value |
| --- | --- |
| Cash | $0 |
| Team | One developer |
| Hardware | MacBook Pro 2017 (Intel, no GPU) |
| Hosting | Existing Hostinger plan; no VPS |
| Paying customers | 0 |
| Goal | 10 paying customers, without foreclosing 10,000 |

**The founding observation of this plan:** the repo already contains ~60 source files, 14 passing tests, security headers, rate limiting, a design system, privacy and terms pages, and an SEO-complete landing page — and zero customers. The project is **over-built and under-sold**. Every earlier plan in the session, including the first three produced during it, answered the wrong question.

---

## 2. How the plan changed, and what forced each change

Seven revisions. Recorded because the reversals are the useful part.

| # | Framing | What forced the next revision |
| --- | --- | --- |
| 1 | Enterprise: fix 6 blockers, revise Phase 1–4 roadmap | Advice was cutting *features*; the real blockers were *defects*, invisible from the PRD |
| 2 | Three-tier AI router, Cost Saver / Balanced / Fast presets | Requested by the founder; then invalidated by the actual hardware |
| 3 | Survival plan: $0, ruthless don't-build list | Founder proposed the AI Bridge (Hostinger gateway → tunnel → laptop) |
| 4 | Bridge as primary architecture, hedged cloud fallback | Free-tier concurrency limits make hedging the wrong trade |
| 5 | Serial timeout fallback; provider chain as data | Review: split into Alpha/Beta with a real customer between |
| 6 | Alpha (~4 days) → one paying customer → Beta (~2 days) | Review: trim `/health`, drop p95, close the telemetry row |
| 7 | **Frozen.** Day 0 becomes a Gate 0 go/no-go | — |

---

## 3. Decisions that stuck

| ID | Decision | Rejected alternative |
| --- | --- | --- |
| **SP-1** | Free **cloud tiers** are the $0 path, not self-hosting | "Local model = free." On a 2017 Intel it costs weeks of the only resource available |
| **SP-2** | **Gemini-first reliability · Mac-first cost savings** | "Mac-first reliability." The laptop reduces a bill; Gemini is what keeps the service up |
| **SP-3** | **Serial timeout** fallback, not hedging | Parallel hedge. Same Gemini call count, but the near-miss window spends free-tier *concurrency* on discarded replies |
| **SP-4** | **Reject, don't queue** — 503 in ~25ms at saturation | A 1–2 slot queue. Request #3 waits behind two 20s inferences, times out anyway, and burns CPU on a reply nobody reads |
| **SP-5** | **The bridge stays dumb** — auth, concurrency, call Ollama, return | Prompt building / RAG / routing in the bridge. That makes it a distributed monolith and kills the `AI_BASE_URL` swap |
| **SP-6** | **Providers are a function + config**, differing only by URL, model, timeout, key | Provider classes with custom behaviour — which is the AI router this plan deleted, rebuilt by accident |
| **SP-7** | **Timeout by formula**: `min(p75_local + 500ms, 8000ms)`, tunnel overhead subtracted | A chosen number (advisor proposed 15s). A Dhaka buyer will not wait 15s |
| **SP-8** | **Circuit breaker trips on failure, never on saturation** | Tripping on any non-200. A 503 is admission control working; tripping on it disables local inference every time two customers message at once |
| **SP-9** | **In-memory breaker only**; on serverless, disable it | Postgres-backed breaker state. Not needed before Stage 4 |
| **SP-10** | **Gemini % of replies** is the GPU migration trigger | 503 rate. Misses timeouts and breaker trips, which are also local losing a request |
| **SP-11** | **Hallucination graded separately from wrong** | One "incorrect" bucket. A ৳50 price error self-corrects; an invented warranty becomes a refund. It is the DOC-7 violation rate |
| **SP-12** | **Gate 0 go/no-go** before any bridge code | A Day 0 checklist. A checklist you have started becomes a thing you finish |
| **SP-13** | **Alpha → one paying customer → Beta** | Build everything, then sell. A real customer reorders priorities faster than any review |
| **SP-14** | **Encryption ships in Alpha**, not Beta | Deferring it. From customer #1 you hold *their* Facebook credential; that is a third party's exposure, not your technical debt |
| **SP-15** | Raise price for the first ten: **৳9,990 all-in**, or **৳3,990–4,990 + ৳7,500 setup** | ৳1,990. Ten of them is ~$165/mo — not survival money for hands-on onboarding |

---

## 4. Rejected, with the reasoning that killed each

Kept in full. Every one of these will be proposed again.

### 4.1 Local Llama/Qwen serving 60–80% of customer traffic

The original cost-saving centrepiece. Killed by arithmetic, not preference:

| Hardware | Model | ~tok/s | 150-token Bangla reply |
| --- | --- | --- | --- |
| 8-core CPU VPS | qwen2.5:7b | 3–6 | **25–50s** |
| 2017 Intel MacBook | qwen2.5:7b | 2–4 | **40–75s** |
| 2017 Intel MacBook | qwen2.5:3b | 6–12 | 13–25s |
| RTX 3060 / L4 / M4 | qwen2.5:7b | 40–70 | 2–4s |

A 7B model loses **100%** of races at both 6s and 20s: full cloud price *plus* wasted CPU. Not abandoned — **resized**. Small models can win, and the gate decides.

### 4.2 The three-tier AI Router (Cost Saver / Balanced / Fast)

Designed on request, then retracted. It saves **$0** at ten customers because Gemini's free tier is already $0, costs ~2 weeks, and its central Ollama pool had no hardware to run on. Superseded by `AI_BASE_URL` + one timeout — swapping the endpoint *is* the routing.

### 4.3 Hedged requests

Correct for tail latency, wrong here. Both designs call Gemini on the same set of requests. The difference is the near-miss window: a local reply arriving at T+0.5s has already spent a Gemini request that gets thrown away. On a free tier with **concurrency** limits that is the wrong currency to spend, and serial keeps exactly one in-flight request per message — which keeps 2am debugging tractable.

### 4.4 Prompt budget · vector index · message router · channel engine

All real, all deferred with a stated trigger:

| Deferred | Why not now | Reopen at |
| --- | --- | --- |
| Catalog trimming / prompt budget | Saves money you are not spending | Stage 2 |
| HNSW vector index | Optimises ~2,000 rows | ~50k chunks |
| Message router extraction | The pipeline already short-circuits greetings, orders, tracking, complaints before the LLM | Real traffic data |
| Channel Engine interface | Speculative at two channels | Channel #3 |

### 4.5 Adaptive `MAX_CONCURRENT`

Offered as a "nice refinement." Declined: it is a feedback loop, and feedback loops oscillate — p95 rises, limit drops, queue clears, p95 falls, limit rises. Debugging that on a laptop with no observability costs more than it saves, and the manual version is one env var and a restart.

### 4.6 `/models` endpoint, `mode` enum, p50/p95, `rejectedLastMinute`

All proposed, all cut. You never switch models dynamically — you SSH in, `ollama pull`, restart. `inFlight`/`maxConcurrent` already say "busy," so a mode enum restates its own inputs. Percentile latency at ten customers is noise, and the number that sets the timeout comes from the benchmark, not live traffic. `rejectedLastMinute` duplicates a signal already logged app-side (SP-10).

Final: `{ok, inFlight, maxConcurrent, model, uptime, version}`.

---

## 5. Defects found by reading the code

The PRD and `PHASES.md` describe Phase 1 as "Planned." It is largely built. What was actually broken was invisible from the documentation.

| ID | Defect | Consequence |
| --- | --- | --- |
| **D1** | `sendTextMessage`/`sendImageMessage` accept a page token, but **every call site omitted it** — all tenants fell back to one global `META_PAGE_ACCESS_TOKEN`. `PageConnection.accessToken` was written by the Connect callback and never read | **No customer #2.** Silence, or replies from another business's Page |
| **D2** | Webhook awaited the full pipeline — RAG, LLM, Graph send — before returning 200 | Meta retries slow webhooks and eventually **disables the subscription for every tenant at once** |
| **D3** | LLM never received conversation history (admitted at [`LAUNCH_CHECKLIST.md:41`](../LAUNCH_CHECKLIST.md) as an open *product question*) | **It is not a product question.** `eta koto?` → `৳৫০০` → `ok nibo` → the agent has no idea what "it" is. It cannot close a COD order — the only thing being sold |
| **D4** | Page access tokens stored plaintext, while `PHASES.md` claimed "tokens encrypted per tenant" | One dump exposes every customer's Facebook Page |
| **D5** | Daily AI budget cap used the **in-memory** limiter — reset on every cold start | Cap was decorative; one viral tenant could exhaust a shared free-tier quota |
| **D6** | Full product catalog stuffed into every prompt, unbounded (~6,000 tokens at 200 SKUs) | Contradicts AC-2. Deferred — it costs money not currently being spent |
| **D7** | No vector index; `KbChunk.embedding` is dimensionless so pgvector *cannot* index it. `EMBED_DIM = 1536` is declared, exported, never used, and disagrees with the documented `nomic-embed-text` (768) | Deferred to ~50k chunks |

**D6 and D7 are open.** They are on the backlog with a trigger, not forgotten.

---

## 6. Risks, ranked

The ranking matters more than any individual item.

| # | Risk | Type |
| --- | --- | --- |
| 1 | Nobody buys | Commercial |
| 2 | Meta App Review | Operational |
| 3 | Onboarding — a real Page live and trusted | Operational |
| 4 | Local inference quality on 2017 hardware | Empirical |
| 5 | **The bridge** | Architectural |

**The bridge is last** — the most-designed and least-risky item produced by the entire session. That inversion is the honest summary of the planning process, and it is why Gate 0 is measurements and paperwork rather than code.

### Meta App Review

Advanced Access to `pages_messaging` needs App Review: typically 1–4 weeks, and rejectable. A development-mode app can serve users holding a **role on the app**, so adding early customers as **Testers** works with no review — *verify against current Meta docs*. Treat it as a pilot mechanism with an expiry date: a business whose onboarding depends on a development-mode allowance is one policy update from having no product. **Submit review at Gate 0.**

---

## 7. Gate 0 — the go/no-go

```
GATE 0 — must pass before ANY bridge code exists

PASS  ─ all three true:
        · local wrong+hallucinated rate ≈ Gemini's on the same 100 questions
        · p75 ≤ 8s, after subtracting measured tunnel overhead
        · p50 at minute 60 within ~20% of minute 1 (no throttling cliff)
      → build the Bridge. M4 is ~1 day.

FAIL  ─ any one false:
        · AI_PROVIDER=gemini, add Groq as secondary   ← M4 becomes ~1 hour
        · no Bridge. no Tunnel. no breaker. no admission control.
        · delete those seven verification steps
        · ship anyway — nothing in Alpha depends on this
      → revisit at Stage 3, on rented hardware, with revenue.
```

A FAIL **saves six days** and costs a free-tier API key. Record the verdict and date in the plan file before writing code — so that "we already started the bridge" cannot outvote a measured number.

**The benchmark is permanent.** 100 *real* Bangla questions (typos, Banglish, half-sentences — invented ones are too clean and hide exactly the failures small models have), one row each:

```
question | gemini_answer | qwen_answer | correct | wrong | hallucinated | needs_escalation | latency_ms
```

The Gemini column is the point: "acceptable Bangla" is meaningless without a baseline you are already willing to ship. Rerun on every model change forever.

---

## 8. What shipped (Alpha, 2026-08-05)

Built in the order M3 → M1 → M2 → M5. M3 went first because it **relocates the code M1 and M4 both modify** — doing it first means writing those call sites once, in their final home.

| ID | Change | Key files |
| --- | --- | --- |
| **M3** | Webhook verifies signature, writes one `Job` row, returns. Pipeline runs in `after()`; `scripts/worker.ts` is the durable path. Claims use `FOR UPDATE SKIP LOCKED` so both drains can run without double-processing. Typing indicator fires during generation | `src/lib/jobs/queue.ts`, `src/lib/jobs/handlers.ts`, `scripts/worker.ts`, `src/app/api/messenger/webhook/route.ts` |
| **M1** | Token resolved once and threaded through all 14 send calls. `getPageTokenForTenant` is deliberately separate from `listPages` (which redacts), so the real token cannot leak into a dashboard response. **No env fallback in production** — no stored token means no reply and a logged error | `src/lib/db/auth.ts`, `src/lib/bot/pipeline.ts`, `src/lib/bot/messenger.ts` |
| **M2** | Six turns, read *before* the inbound message is persisted so the current turn is not replayed as its own context. Wired into both Messenger and webchat so the channels stop drifting | `src/lib/bot/ai.ts`, `src/lib/bot/pipeline.ts`, `src/app/api/webchat/route.ts` |
| **M5** | AES-256-GCM via Node's built-in `crypto` — no dependency. Throws rather than storing plaintext in production; decryption passes legacy plaintext through so enabling it breaks nothing. Budget counter moved to Postgres | `src/lib/crypto.ts`, `src/lib/db/ai-usage.ts`, `scripts/encrypt-tokens.ts` |

**Schema added:** `Job`, `AiUsageDaily`.
**Scripts added:** `npm run worker`, `npm run db:encrypt-tokens`.
**Env added:** `TOKEN_ENCRYPTION_KEY` (required in production).

### Verification

`tsc` clean · 22/22 tests · 0 lint errors · build succeeds · 10 end-to-end checks against real Postgres:

- Two tenants each answered with their **own** token; no cross-tenant leak
- Tokens are `v1.` ciphertext at rest and decrypt per tenant
- Jobs enqueue, drain to `done`, and a redelivered `mid` produces **zero** second replies
- Prior turns reach the model **exactly once each**; `dam koto?` → `ok nibo` resolves
- Budget counter persists across tenant-days

`tests/multitenant.send.test.mts` is a permanent regression test. **D1 must never come back.**

### Also fixed: a pre-existing flaky test

`tests/auth.security.test.mts` tampered with the **last** base64url character of the JWT signature. A 32-byte HMAC encodes to 43 characters, so that character carries only 4 significant bits plus padding — the flip often decoded to the identical byte and left the signature valid. It failed **~25% of runs** (3/12 measured). Now flips the first character; 15/15 stable. The ship gate depends on `npm test`, so a quarter-failure rate made that gate meaningless.

---

## 9. Open items

**Before a live Page:**
1. Set `TOKEN_ENCRYPTION_KEY` in `.env.local`
2. `npm run db:push` against the real database (adds `Job`, `AiUsageDaily`)
3. `npm run db:encrypt-tokens` if any Page connections predate encryption

**Local environment defect.** Host port 5432 is owned by another project's `neobit-postgres`. `facetai-postgres` runs but never published its port — `docker compose up -d` restarted the pre-existing container instead of recreating it, so Docker never reported a conflict. Every connection to `127.0.0.1:5432` silently reached the wrong database, presenting as a password error.

```bash
sed -i '' 's/"5432:5432"/"5433:5432"/' docker-compose.yml && docker compose up -d --force-recreate
```

then change the port in `.env.local` to 5433.

**Backlog with triggers:** D6 prompt budget (Stage 2) · D7 vector index (~50k chunks) · message router (real traffic) · channel engine (channel #3) · Beta M4/M6/M6b (after customer #1, M4 gated on Gate 0).

---

## 10. The freeze

> **Architecture frozen 2026-08-05. Only customer-blocking bugs until the first 10 paying customers.**

Every other idea goes to the backlog unbuilt. Reopen only if one of the four empirical unknowns produces evidence that invalidates an assumption here.

The failure mode this guards against is not technical:

```
Day 1:  "I'll just improve the bridge…"
Day 2:  "I'll just add WhatsApp…"
Day 3:  "I'll just tune the prompts…"
Week 3: still zero customers
```

**Next, in order — none of it is code:**

1. Submit Meta App Review
2. Run Gate 0; record the verdict and date
3. ~~Build Alpha~~ ✅ done 2026-08-05
4. Onboard one real business by hand
5. Watch them use it, and stay quiet while they do
6. Repeat to ten

The four remaining unknowns — Bangla quality on 2017 hardware, Hostinger behaviour, Meta approval, and whether anyone buys — are empirical. No document answers them.

---

## Version history

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-05 | Session record: 7 revisions, 15 decisions, 6 rejected branches, 7 defects, Alpha shipped and verified, architecture frozen |
