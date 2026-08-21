# ReplyPilot AI — Product Handbook

> The official engineering, product, and design handbook for **ReplyPilot AI**
> (repository codename `FaceTai`) — an AI Employee platform for Bangladeshi SMBs.
>
> **Version:** `0.1.0` · **Build:** Next.js 16.2.10 / React 19.2.4 / Prisma 6.19 / PostgreSQL + pgvector
> **Doc status:** Living document · Rebased to the 2026-08-21 real implementation approach
> **Canonical execution:** [`../REAL-APPROACH.md`](../REAL-APPROACH.md)
> **Documentation map:** [`../DOCUMENTATION-STATUS.md`](../DOCUMENTATION-STATUS.md)

---

## How to read this handbook

This handbook is written for seven audiences at once. Every chapter is tagged so
you can skip to what you own.

| Tag | Audience | Read these chapters |
| --- | --- | --- |
| 🏢 **BIZ** | Business owners, investors | 01, 11 |
| 🧑‍💻 **ENG** | Backend / full-stack engineers | 02, 03, 04, 05, 06, 09, 10 |
| 🎨 **DES** | UI / product / motion designers | 01, 08 |
| 📦 **PM** | Product managers | 01, 05, 07, 11 |
| 🔬 **QA** | QA engineers | 04, 05, 06, 10 |
| 🔐 **SEC** | Security reviewers | 03, 05, 09 |
| ✍️ **TW** | Technical writers | all |

---

## Chapter map

```
docs/handbook/
│
├── 00  README.md ................... you are here — information architecture
│
├── ── FOUNDATION ────────────────────────────────────────────────
├── 01  product-overview.md ......... what it is, who it's for, why it wins
├── 02  architecture.md ............. system context → HLD → LLD → runtime
├── 03  data-model.md ............... ER diagram, tables, indexes, tenancy
│
├── ── INTERFACES ────────────────────────────────────────────────
├── 04  api-reference.md ............ every endpoint, request → response → error
├── 05  messenger-connect.md ........ OAuth, tokens, webhooks, reconnect, gaps
├── 06  ai-runtime.md ............... pipeline, RAG, guardrails, escalation
├── 07  whatsapp-cloud-api.md ....... target spec (NOT YET IMPLEMENTED)
│
├── ── EXPERIENCE ────────────────────────────────────────────────
├── 08  design-system.md ............ tokens, wireframes, motion, AI prompts
│
├── ── OPERATIONS ────────────────────────────────────────────────
├── 09  security.md ................. threat model, authn/authz, secrets
├── 10  operations-runbook.md ....... errors, retries, limits, troubleshooting
│
└── ── DIRECTION ─────────────────────────────────────────────────
    11  scorecard-and-roadmap.md .... scores, improvements, roadmap
```

---

## Truth policy

The handbook must distinguish implementation from intent. **A file, model, route,
or UI alone does not make a feature shipped.** Use the following vocabulary:

| Badge | Meaning | Example |
| --- | --- | --- |
| 🟢 **IMPLEMENTED** | Behavior exists in code and has appropriate verification | Postgres persistence, signed session, RAG path |
| 🟡 **PARTIAL** | Behavior exists but a required acceptance or production control is missing | Messenger production hardening |
| 🟠 **SCAFFOLD** | Shape exists primarily for future integration | Meta Connect / OAuth scaffold |
| 🔵 **PILOT-READY** | End-to-end controlled deployment criteria pass | Sales Agent pilot |
| 🔴 **PLANNED** | Intentionally not implemented | WhatsApp Cloud API |
| ⚫ **HISTORICAL** | Reference only; cannot override current decisions | Old Phase 0 sketches |

Where a chapter documents a gap, keep a stable `GAP-nn` identifier so it can be
tracked in [`11-scorecard-and-roadmap.md`](./11-scorecard-and-roadmap.md).

---

## The one-paragraph version

ReplyPilot AI is a multi-tenant Next.js monolith backed by PostgreSQL/Prisma and
pgvector. A Facebook Page or website chat path sends a customer message to a
Route Handler. The application resolves tenant context, deduplicates Messenger
events, checks human handoff and guardrails, retrieves tenant-scoped knowledge,
uses catalog/order data, generates an LLM or rules-based response, and persists
conversation/CRM records. Business owners manage the system through the
Postgres-backed dashboard with four RBAC roles. The current milestone is to
verify, harden and pilot this core — not to rewrite the architecture or add all
future channels at once.

---

## Quick links

| Thing | Where |
| --- | --- |
| Current implementation strategy | [`../REAL-APPROACH.md`](../REAL-APPROACH.md) |
| Documentation source-of-truth | [`../DOCUMENTATION-STATUS.md`](../DOCUMENTATION-STATUS.md) |
| Run it locally | [`../../INSTALLATION.md`](../../INSTALLATION.md) |
| Endpoint cheat-sheet | [`04-api-reference.md`](./04-api-reference.md) |
| Why my bot isn't replying | [`10-operations-runbook.md#troubleshooting-decision-tree`](./10-operations-runbook.md#troubleshooting-decision-tree) |
| Design tokens / Figma prompts | [`08-design-system.md`](./08-design-system.md) |
| Launch readiness scores | [`11-scorecard-and-roadmap.md`](./11-scorecard-and-roadmap.md) |
| Product authority | [`../PRD.md`](../PRD.md) |
| Business locks | [`../BUSINESS_DECISIONS.md`](../BUSINESS_DECISIONS.md) |
