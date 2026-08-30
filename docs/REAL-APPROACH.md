# ReplyPilot AI — Real approach

Execution model (do not invert):

```
Verify → Harden → Complete Sales MVP → Pilot → Measure → Expand
```

This file exists so agents do **not** treat Phase-0/Phase-1 planning docs as proof that code is missing, and do **not** start Phase 2 channels.

## Source of truth

1. Running code, Prisma schema, tests  
2. [`PILOT-READINESS-REPORT.md`](./PILOT-READINESS-REPORT.md) — **current operational gate matrix (A–O)**  
3. [`IMPLEMENTATION-AUDIT.md`](./IMPLEMENTATION-AUDIT.md)  
4. [`PRD-IMPLEMENTATION-STATUS.md`](./PRD-IMPLEMENTATION-STATUS.md)  
5. [`BUSINESS_DECISIONS.md`](./BUSINESS_DECISIONS.md) (ethics, stack locks)

`PHASES.md` and older “Phase 1 Planned” language describe history. Sales MVP pieces already exist in the monolith.

## Architecture lock

Next.js App Router + Prisma + PostgreSQL + pgvector. No NestJS, FastAPI, Redis, or split apps until a measured capacity trigger.

## Sales MVP channels

Website chat + Messenger. WhatsApp / Instagram / Telegram wait until this MVP passes pilot acceptance.

## Status vocabulary

| Word | Meaning |
| --- | --- |
| IMPLEMENTED | Code path exists |
| TESTED | Automated test covers it |
| PRODUCTION-READY | Verified with real Postgres, Meta, and LLM credentials |
| NOT VERIFIED | Not exercised in this environment |

These are not the same.
