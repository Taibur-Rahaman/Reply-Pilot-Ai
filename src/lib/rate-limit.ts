/**
 * Minimal in-memory rate limiter for public API routes.
 *
 * This is a best-effort, single-process limiter — it resets on deploy and
 * does not share state across multiple instances/regions. It stops naive
 * scripted abuse (lead/order/AI-reply spam, login brute force) cheaply
 * without adding an infra dependency. For multi-instance production
 * deployments, replace with a shared store (Upstash/Redis) behind the same
 * `checkRateLimit` signature.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the map doesn't grow unbounded.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window rate limit. Returns whether the request is allowed and, if
 * not, how many seconds until the window resets.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  cleanup(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true };
}

export function rateLimitResponse(retryAfterSec: number) {
  return Response.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}
