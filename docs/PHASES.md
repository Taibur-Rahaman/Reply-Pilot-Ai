# FaceTai — Phases & Build Order

> **Status:** Current (Phase 0 documentation) — 2026-07-26  
> **Related:** [`PRD.md`](./PRD.md) · [`BUSINESS_DECISIONS.md`](./BUSINESS_DECISIONS.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> **Conflict rule:** BUSINESS_DECISIONS + PRD win.

Status: **Done** · **In progress** · **Planned**

---

## Executive snapshot

| Phase | Focus | Status |
| --- | --- | --- |
| **0** | Documentation tree | **Done** (2026-07-26) |
| **1** | Sales Agent MVP (Postgres, auth, RAG, handover, CRM, analytics) | **Planned** |
| **2** | Sales Intelligence | **Planned** |
| **3** | Omnichannel + Connect | **Planned** |
| **4** | Automation | **Planned** |
| **5** | Enterprise + marketplace | **Planned** |

**Agent sequencing:** Sales Agent (Phase 1–2) → channel expansion (Phase 3) → automation (Phase 4) → Support/Booking/Property packs + marketplace (Phase 5).

---

## Phase 0 — Documentation

### Objectives

- Authoritative PRD v3.0 (AI Employee Platform).
- Freeze BUSINESS_DECISIONS.
- Publish PHASES, ARCHITECTURE, API, SECURITY, AI_GUARDRAILS.
- Align README status table; keep PHASE2-AI-BOT as historical sketch.

### Done when

- [x] `docs/PRD.md` v3.0 with personas, MoSCoW FRs, agent model, Phase 0–5, AC
- [x] `docs/BUSINESS_DECISIONS.md` locks (monolith, Postgres, Sales first, ethics, escalate, Bangla-first)
- [x] `docs/PHASES.md` (this file)
- [x] `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/AI_GUARDRAILS.md`
- [x] README status table matches Current/Partial/Planned
- [x] PHASE2-AI-BOT notes PRD + BUSINESS_DECISIONS win on conflicts
- [x] No application feature code in Phase 0 (docs only)

---

## Phase 1 — Sales Agent MVP

### Objectives

- JSON → PostgreSQL (+ pgvector) behind store adapter; migrate `facetai-db.json`.
- Hashed auth, signed sessions, RBAC on dashboard APIs, audit log.
- Real RAG (chunk/embed/retrieve); Prompt Builder with guardrail rules.
- Escalation rules + inbox take/leave/notes; CRM timeline; analytics home KPIs.
- Wire AI_GUARDRAILS into runtime (catalog tools, escalate keywords).

### Explicitly out of Phase 1 code

Live IG/WA/Telegram · workflows · billing portal · white-label · agent marketplace · Nest/FastAPI · Redis/BullMQ.

### Done when

- [ ] Fresh deploy with empty disk still has durable chat/CRM (Postgres)
- [ ] Replies use retrieved KB chunks, not full dump
- [ ] Human take/leave on webchat + Messenger; AI silent until release
- [ ] Role `agent` cannot edit billing/team; `admin` can
- [ ] Audit trail for config / handoff / team / KB changes
- [ ] Seed demo works against Postgres
- [ ] Docker Compose / `DATABASE_URL` documented in README

### Suggested implementation order (PRs)

1. Postgres + repository cutover + migrate script  
2. Auth/RBAC + audit logs  
3. RAG + Prompt Builder  
4. Handover + CRM timeline + analytics home  
5. Hardening / seed / README  

---

## Phase 2 — Sales Intelligence

### Objectives

- Lead score, richer customer memory fields.
- Follow-up scheduler (capacity trigger for **Redis/queue** if volume needs it).
- Intent / sentiment / objection handling; playbooks; personalities.

### Done when

- [ ] Lead score visible on CRM + used in prioritization
- [ ] Memory fields persist across sessions and influence replies
- [ ] Follow-ups run on schedule without double-send; Meta policy respected
- [ ] At least one playbook + personality selectable per tenant
- [ ] Redis introduced **only if** job volume justifies (document trigger in deploy notes)

---

## Phase 3 — Omnichannel

### Objectives

- Live Instagram / WhatsApp / Telegram adapters (send + receive).
- Unified inbox polish.
- FaceTai Connect (F39) Done: Login → Select Page → Connect; no webhook paste.

### Done when

- [ ] At least WhatsApp Cloud live on shared bot core
- [ ] IG and/or Telegram meet Must/Should from PRD or deferred with date
- [ ] Connect happy-path median ≤ ~2 minutes on test Page
- [ ] Tokens encrypted per tenant; env-token dual-mode for demo still works
- [ ] Marketing may claim “Connect in ~2 minutes” only after this checklist

---

## Phase 4 — Automation

### Objectives

- Workflow builder (IF/THEN), campaigns, email/SMS.
- Richer agent tool actions (catalog update, order status, tags).

### Done when

- [ ] Tenant can create a workflow without code deploy
- [ ] Campaign send respects opt-out + channel policy
- [ ] Tool actions audited and tenant-scoped

---

## Phase 5 — Enterprise

### Objectives

- Hard multi-tenant isolation review, usage billing, white-label.
- Public API / webhooks, SSO, compliance hardening.
- Agent marketplace: Support, Booking, **Property (RentBee)** — shared core, domain tools only.

### Done when

- [ ] Usage metering + Super Admin billing slice
- [ ] WL branding for agency tenants (or deferred with date)
- [ ] Public API auth + webhook signed deliveries
- [ ] At least one non-Sales agent pack (e.g. Support or Property) installable on shared core

---

## Capacity trigger — when to add Redis

| Trigger | Action |
| --- | --- |
| Follow-up / campaign jobs &gt; what request-path can safely do | Add Redis + worker (BullMQ or equivalent) |
| Webhook fan-out timeouts under load | Queue inbound normalize → process |
| Phase 1 | **Do not** add Redis |

---

## Version history

| Date | Notes |
| --- | --- |
| 2026-07-26 | Phase 0 authored; Phases 1–5 documented from plan |
