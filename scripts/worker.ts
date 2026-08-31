/**
 * Placeholder process so docker-compose.prod.yml `worker` service can start.
 *
 * Sales MVP replies run in-process via Next.js `after()` after the Messenger
 * webhook ACKs. A Postgres Job drain (schema `Job` table) is P2 — not Redis.
 */
console.info(
  "[worker] Sales MVP does not drain a job queue yet. Webhook replies use in-process after(). This process stays alive so compose does not restart-loop.",
);

setInterval(() => {
  // keep process alive
}, 60_000);
