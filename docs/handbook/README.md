# ReplyPilot AI — Product Handbook

> The official engineering, product, and design handbook for **ReplyPilot AI**
> (repository codename `FaceTai`) — an AI Employee platform for Bangladeshi SMBs.
>
> **Version:** `0.1.0` · **Build:** Next.js 16.2.10 / React 19.2.4 / Prisma 6.19 / PostgreSQL + pgvector
> **Doc status:** Living document · Last verified against `main` @ `b46798c` + working tree

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
    11  scorecard-and-roadmap.md .... scores, 100 improvements, roadmap
```

---

## Truth policy

This handbook distinguishes three states. **Nothing is described as shipped
unless it is verifiably in the codebase.**

| Badge | Meaning | Example |
| --- | --- | --- |
| 🟢 **SHIPPED** | Code exists, runs, verified by reading source | Messenger webhook signature verification |
| 🟡 **PARTIAL** | Code exists but is a scaffold or has a known gap | Facebook OAuth Connect (no webhook subscribe) |
| 🔴 **SPEC** | Designed here, no code yet | WhatsApp Cloud API embedded signup |

Where a chapter documents a **gap**, it carries a `GAP-nn` identifier so it can
be tracked in [`11-scorecard-and-roadmap.md`](./11-scorecard-and-roadmap.md).

---

## The one-paragraph version

ReplyPilot AI is a multi-tenant Next.js monolith. A Facebook Page (or a website
chat widget) sends a customer message to a Route Handler. The handler verifies
the sender, resolves which tenant owns the Page, deduplicates the event, then
runs a deterministic pipeline: human-handoff check → escalation guardrails →
complaint detection → image product match → order tracking → order capture →
RAG retrieval → LLM (or rule-based fallback) → send reply → persist to Postgres.
Business owners watch and steer all of this from a dashboard with 14 sections
and four RBAC roles.

---

## Quick links

| Thing | Where |
| --- | --- |
| Run it locally | [`../../INSTALLATION.md`](../../INSTALLATION.md) |
| Endpoint cheat-sheet | [`04-api-reference.md`](./04-api-reference.md) |
| Why my bot isn't replying | [`10-operations-runbook.md#troubleshooting-decision-tree`](./10-operations-runbook.md#troubleshooting-decision-tree) |
| Design tokens / Figma prompts | [`08-design-system.md`](./08-design-system.md) |
| Launch readiness scores | [`11-scorecard-and-roadmap.md`](./11-scorecard-and-roadmap.md) |
| Legacy phase docs | [`../PRD.md`](../PRD.md), [`../PHASES.md`](../PHASES.md) |
