/**
 * Runs once when the server starts (Next.js instrumentation hook).
 * Fails fast on missing production config instead of surfacing confusing
 * errors on the first request that touches the DB or signs a session.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const isProduction = process.env.NODE_ENV === "production";
  const missing: string[] = [];

  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (isProduction && !process.env.SESSION_SECRET) missing.push("SESSION_SECRET");
  if (isProduction && !process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");

  if (missing.length) {
    const message = `[startup] Missing required environment variable(s): ${missing.join(", ")}`;
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(message);
  }

  if (isProduction && !process.env.SUPER_ADMIN_EMAIL) {
    console.warn(
      "[startup] SUPER_ADMIN_EMAIL is not set — /api/admin/tenants (cross-tenant console) is unreachable until it is.",
    );
  }
}
