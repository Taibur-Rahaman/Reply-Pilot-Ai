# Deployment

ReplyPilot AI runs at **https://app.replypilotai.shop** on a Hostinger VPS under
Docker. The apex `replypilotai.shop` serves a separate WordPress marketing site
and is not touched by anything here.

```
Internet
   │  :443 / :80
   ▼
[caddy]   automatic Let's Encrypt TLS, reverse_proxy → app:3000
   ▼
[app]     next start --hostname 0.0.0.0     volume replypilot_data → /app/data
[worker]  node --import tsx scripts/worker.ts   (same image, different command)
   ▼
Supabase Postgres (ap-southeast-1) + pgvector
```

One image, two entrypoints. Everything lives in `/srv/replypilot` on the VPS.

## Why a VPS and not a serverless host

Three properties of this app fight serverless, and a single box makes all three
free:

- `scripts/worker.ts` is a long-running second process. The webhook already
  drains inline via `after()`, so the worker only covers retries and jobs
  orphaned by a dying instance — but without it those never happen.
- KB uploads write to `<cwd>/data/uploads/<tenantId>/` (`src/lib/db/knowledge.ts`).
- `src/lib/rate-limit.ts` is an in-process limiter. It is correct on exactly one
  instance and silently stops being correct on two.

## Files

| File | Role |
| --- | --- |
| `Dockerfile` | Multi-stage build: `deps` → `builder` → `runner` |
| `docker-compose.prod.yml` | `app`, `worker`, `caddy`, plus a `migrate` one-shot behind `profiles: ["setup"]` |
| `Caddyfile` | TLS and reverse proxy |
| `.env` (untracked, on the VPS) | Build-time `NEXT_PUBLIC_*`, read by Compose for `${...}` interpolation |
| `.env.production` (untracked, on the VPS) | Runtime secrets, injected via `env_file` |

Both env files are `chmod 600` and never committed — `.gitignore` covers
`.env*` except `.env.example`.

## First deploy

### 1. VPS

Hostinger KVM 2 (2 vCPU / 8 GB), Ubuntu 24.04, Singapore — near both the
Supabase `ap-southeast-1` region and Bangladesh users.

```bash
# Swap. `next build` peaks above 1 GB and an OOM-killed build exits 137, which
# reads as a generic failure rather than "out of memory".
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

curl -fsSL https://get.docker.com | sh

ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
```

Ports 80 and 443 must also be open in Hostinger's **panel** firewall — ufw alone
is not enough, and the symptom is an ACME challenge that never completes.

Check IPv6 before writing `DATABASE_URL`:

```bash
ping6 -c1 google.com
```

### 2. Database

A Supabase project with pgvector. Enable the extension before the first push —
`src/lib/db/rag.ts` catches vector failures and falls back to keyword search, so
a missing extension degrades retrieval **silently** rather than erroring:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Use the **Supavisor session-mode pooler** (`*.pooler.supabase.com`, port `5432`)
for `DATABASE_URL`. Two reasons, both of which cost an afternoon if missed:

- Free-tier **direct** connections (`db.<ref>.supabase.co`) are IPv6-only, and
  Hostinger VPSs frequently have no IPv6.
- The **transaction** pooler (port `6543`) cannot run DDL, so `prisma db push`
  fails against it. `prisma/schema.prisma` has no `directUrl`, so one string has
  to serve both the app and migrations.

### 3. Checkout and secrets

```bash
git clone git@github.com:Taibur-Rahaman/Reply-Pilot-Ai.git /srv/replypilot
cd /srv/replypilot
```

Use a **read-only deploy key** generated on the VPS rather than a personal
access token — a token on the box is a credential that can write to the repo.

`.env` — build-time only:

```
NEXT_PUBLIC_APP_URL=https://app.replypilotai.shop
NEXT_PUBLIC_SITE_NAME=ReplyPilot AI
NEXT_PUBLIC_WHATSAPP_NUMBER=8801601677122
NEXT_PUBLIC_MESSENGER_URL=
```

`.env.production` — runtime secrets. `src/instrumentation.ts` refuses to boot in
production without `DATABASE_URL`, `SESSION_SECRET`, and `ADMIN_PASSWORD`:

```
DATABASE_URL=postgresql://...pooler.supabase.com:5432/postgres
SESSION_SECRET=<openssl rand -base64 48>     # under 32 chars throws at boot
TOKEN_ENCRYPTION_KEY=<openssl rand -base64 48>
ADMIN_PASSWORD=<openssl rand -base64 24>
SUPER_ADMIN_EMAIL=<your real operator email>
META_VERIFY_TOKEN=<openssl rand -hex 32>
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://app.replypilotai.shop/api/connect/callback
AI_PROVIDER=groq
GROQ_API_KEY=
AI_MODEL=llama-3.3-70b-versatile
AI_EMBED_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
AI_EMBED_API_KEY=<Google AI Studio key>
AI_EMBED_MODEL=text-embedding-004
LEADS_WEBHOOK_URL=
ORDERS_WEBHOOK_URL=
```

**`TOKEN_ENCRYPTION_KEY` cannot be rotated casually.** It decrypts every stored
Meta Page token and Telegram bot token; changing it means every customer
reconnects their channel by hand.

**On embeddings:** Groq serves no `/embeddings` route. Without a separate
embedding endpoint, knowledge retrieval quietly drops to keyword-only. Gemini's
OpenAI-compatible endpoint above is the zero-cost fix; the alternative is an
Ollama container running `nomic-embed-text` (~275 MB).

### 4. DNS

An `A` record `app` → the VPS IP, TTL 300, in the `replypilotai.shop` zone. The
apex `A` records stay pointed at Hostinger's WordPress hosting.

### 5. Schema, boot, first login

```bash
docker compose -f docker-compose.prod.yml --profile setup run --rm migrate
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f caddy   # watch ACME succeed
```

There is no signup page, and `/api/admin/tenants` exposes only `GET` and
`PATCH` — **seeding is the only way to create the first tenant**. With
`SEED_DEMO_CONTENT` unset it creates exactly one tenant, one admin user, and the
default bot config; no fake products, orders, or KPIs:

```bash
docker compose -f docker-compose.prod.yml --profile setup run --rm \
  -e SEED_CONFIRM=yes migrate npm run seed
```

Then log in as `admin@demo.replypilot.local` with `ADMIN_PASSWORD` and
immediately create a real admin user under your own email via **Settings →
Team**. That email must equal `SUPER_ADMIN_EMAIL`, which is the only thing that
grants cross-tenant `/admin/tenants` access — a tenant `admin` role does not.

### 6. Meta and Telegram

In the Meta App Dashboard:

- Webhook callback `https://app.replypilotai.shop/api/messenger/webhook`, verify
  token = `META_VERIFY_TOKEN`
- OAuth redirect `https://app.replypilotai.shop/api/connect/callback`, matching
  `META_REDIRECT_URI` exactly
- Subscribe the Page to `messages`, `messaging_postbacks`, `feed`

Telegram needs no env vars: each tenant pastes a BotFather token into Settings →
Telegram and the webhook self-registers, provided `NEXT_PUBLIC_APP_URL` is a
public `https://` address.

## Updates

```bash
cd /srv/replypilot
git pull
docker compose -f docker-compose.prod.yml build       # old containers keep serving
# only when prisma/schema.prisma changed in the diff:
docker compose -f docker-compose.prod.yml --profile setup run --rm migrate
docker compose -f docker-compose.prod.yml up -d       # a few seconds of downtime
docker image prune -f
```

Building on the VPS avoids the `darwin/arm64` → `linux/amd64` mismatch that
would otherwise force every local build through QEMU emulation.

`build` is deliberately separate from `up -d`, so the two-to-four minute Next
build happens while the old containers still serve traffic.

**A `NEXT_PUBLIC_*` change needs `build`, not just `up`** — those values are
compiled into the emitted JavaScript, and restarting a container does nothing.

`prisma db push` stays behind the `setup` profile so `up -d` can never trigger
it. The repo has no `prisma/migrations`, so `db push` is the only mechanism, and
on drift it is destructive-capable. Prefer additive schema changes; for a
genuinely breaking one, `docker compose stop app worker` first and accept the
downtime.

## Rollback

```bash
git log --oneline -5
git checkout <previous-sha>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Schema changes do not roll back — `db push` has no down-migration. A rollback
across a schema change needs a restore from backup.

## Backups

Three layers, none of which is sufficient alone:

- Supabase free-tier automatic backups (database only)
- Hostinger's free weekly VPS snapshots (whole box, coarse)
- A nightly `pg_dump` cron pushed off-box — the only one that gives a
  point-in-time file you control

The `replypilot_data` volume holds KB uploads. Note that nothing currently reads
those files back (`storagePath` is stored but never served), so the database is
the system of record today.

## Operational notes

- **Logs**: capped at 10 MB × 3 per container. Unbounded json-file logs are the
  classic way a small VPS fills its disk.
- **Health**: `GET /api/health` returns 503 when Postgres is unreachable, so the
  app healthcheck is a genuine readiness signal. The worker has no healthcheck
  on purpose — `drain()` blocking on a slow LLM call is normal, and a liveness
  probe would restart a working process.
- **Caddy depends on `service_started`, not `service_healthy`**, so a database
  outage cannot also block certificate renewal.
- **Certificates** live in the `caddy_data` volume. Deleting it forces
  re-issuance and can hit Let's Encrypt's limit of 5 duplicate certificates per
  domain per week.
- **Security headers** are owned by `next.config.ts` alone. Adding them in Caddy
  too produces comma-joined duplicates, and browsers drop a malformed HSTS
  header entirely — so "defence in depth" there would remove HSTS.
- **Scaling past one container** requires replacing the in-process rate limiter
  with a shared store first (`src/lib/rate-limit.ts` says so in its own header).
