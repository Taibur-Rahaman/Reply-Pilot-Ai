# syntax=docker/dockerfile:1.7

# Debian slim, not Alpine: prisma/schema.prisma declares no `binaryTargets`, so
# `prisma generate` emits the glibc engine (debian-openssl-3.0.x). An Alpine
# runner needs the musl engine and would fail on the first query with a missing
# engine error. Same base on every stage keeps the generated engine valid.
#
# Node 24 matches the development machine and clears Next 16's minimum of
# 20.9.0. Drop to node:22-bookworm-slim if Prisma ever disagrees with 24.
ARG NODE_IMAGE=node:24-bookworm-slim

# ---------------------------------------------------------------------------
# deps — dependency layer, cached on the lockfile alone
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app

# prisma/ is copied before the install, not after: package.json has a
# `postinstall` of `prisma generate`, which reads prisma/schema.prisma. Without
# the schema present, `npm ci` fails outright rather than merely skipping
# generation.
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Full install including devDependencies. `tsx` is a devDependency and the
# worker (`node --import tsx scripts/worker.ts`) executes TypeScript from
# scripts/ and src/ at runtime, so an --omit=dev tree cannot run this app.
#
# npm 11+ blocks dependency lifecycle scripts by default and only warns, so the
# `postinstall` of `prisma generate` is skipped here. That is fine and left
# alone deliberately: the builder stage runs `npm run build`, which invokes
# `prisma generate` explicitly, and the only other skipped script is sharp's
# binary download — unused, because nothing in src/ imports next/image.
# Do not "fix" this with --dangerously-allow-all-scripts; it would let every
# transitive dependency run arbitrary code at build time for no benefit.
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------------------------------------------------------------------------
# builder — prisma generate && next build
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

# Same openssl/ca-certificates as the runner. `prisma generate` inspects the
# local OpenSSL to pick an engine, so building without it produced a client for
# debian-openssl-1.1.x that the runner could not load. schema.prisma also pins
# binaryTargets, which is the actual guarantee — this keeps the two stages
# honest about matching each other.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* are substituted into the client and server bundles by the
# compiler, so they must exist now. Changing one later requires a rebuild —
# restarting the container has no effect on already-emitted JavaScript.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_MESSENGER_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME} \
    NEXT_PUBLIC_WHATSAPP_NUMBER=${NEXT_PUBLIC_WHATSAPP_NUMBER} \
    NEXT_PUBLIC_MESSENGER_URL=${NEXT_PUBLIC_MESSENGER_URL}

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# A syntactically valid placeholder, never connected to. No page or layout
# under src/app imports @/lib/db, so nothing queries during prerender — but
# Prisma validates the datasource env when the schema loads, and a missing
# variable there is a confusing thing to debug from build logs.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"

# The package script, not `next build` directly, so this stays honest if the
# script ever gains a step.
RUN npm run build

# ---------------------------------------------------------------------------
# runner — one image, two entrypoints (app / worker), chosen by compose
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# tini: PID 1 gets no default signal handlers, so without an init the worker's
#   SIGTERM handler — which finishes the current batch before exiting — never
#   fires and `docker compose stop` becomes a hard kill.
# openssl: the slim image ships none, and Prisma's Rust engine then warns
#   "failed to detect the libssl/openssl version" and falls back to
#   openssl-1.1.x, which is the wrong ABI for bookworm.
# ca-certificates: the query engine verifies Supabase's TLS certificate against
#   the system trust store, not Node's bundled one.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copied root-owned, without --chown, on purpose. The node user only ever reads
# these, and default 644/755 permissions already allow that. Rewriting
# ownership across a ~1 GB node_modules costs minutes of build time and a
# duplicated layer for no gain.
#
# node_modules comes from the builder, not deps: `prisma generate` writes the
# client into node_modules/.prisma/client, and every query depends on it.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# next.config.ts is read at `next start`, not only at build — the headers() and
# redirects() rules live there.
COPY --from=builder /app/next.config.ts ./next.config.ts

# The worker executes TypeScript directly, so its sources ship as sources.
# tsconfig.json is not optional: tsx resolves the `@/*` path alias from it, and
# src/lib/jobs/handlers.ts imports `@/lib/bot/pipeline`.
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

# prisma/ ships so `prisma db push` can run against the live database from the
# exact schema this image was built from.
COPY --from=builder /app/prisma ./prisma

# .next IS chowned, unlike the rest: `next start` writes its incremental cache
# into .next/cache at runtime, and a root-owned tree makes that fail as the
# node user. Small enough that the ownership rewrite costs little.
COPY --from=builder --chown=node:node /app/.next ./.next

# Created here and owned by node so the named volume mounted over it inherits
# that ownership — Docker seeds an empty named volume from the image path,
# permissions included. KB uploads land in <cwd>/data/uploads/<tenantId>/
# (src/lib/db/knowledge.ts) and would fail with EACCES on a root-owned dir.
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

USER node
EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]

# Default command is the web app. `start:lan` (0.0.0.0), not `start`, which
# binds 127.0.0.1 and is unreachable from Caddy across the bridge network.
CMD ["npm", "run", "start:lan"]
