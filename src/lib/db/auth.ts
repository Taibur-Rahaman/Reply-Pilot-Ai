import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { newId, nowIso, toIso } from "./ids";
import { prisma } from "./prisma";
import { writeAuditLog } from "./audit";
import type { PageConnection, PageConnectMode, TeamRole, User } from "./types";
import { DEFAULT_TENANT_ID } from "./types";

const SESSION_COOKIE = "facetai_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 14;
export const DEMO_ADMIN_EMAIL = "admin@demo.replypilot.local";

export type SessionPayload = {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: TeamRole;
};

const isProduction = process.env.NODE_ENV === "production";
let warnedDevSecret = false;

/** Minimum entropy we accept for the HS256 signing key. */
const MIN_SESSION_SECRET_LEN = 32;

function sessionSecret(): Uint8Array {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) {
    // Padding a short secret to length does not add entropy — a 4-char secret
    // padded with zeros is still a 4-char secret. Refuse it in production
    // rather than pretending it is a 32-byte key.
    if (isProduction && configured.length < MIN_SESSION_SECRET_LEN) {
      throw new Error(
        `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LEN} characters in production (got ${configured.length}).`,
      );
    }
    return new TextEncoder().encode(
      configured.padEnd(MIN_SESSION_SECRET_LEN, "0").slice(0, 64),
    );
  }
  if (isProduction) {
    throw new Error(
      "SESSION_SECRET is required in production — set a long random value.",
    );
  }
  if (!warnedDevSecret) {
    warnedDevSecret = true;
    console.warn(
      "[auth] SESSION_SECRET not set — using an insecure dev-only default. Set SESSION_SECRET before deploying.",
    );
  }
  return new TextEncoder().encode(
    "facetai-dev-session-secret-change-me".padEnd(32, "0").slice(0, 64),
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  // Only bcrypt hashes are ever accepted. Both the seed script and the JSON
  // migration write bcrypt, so a non-`$2` value means a corrupt/tampered row —
  // never fall back to comparing the stored value as plaintext.
  if (!hash || !hash.startsWith("$2")) return false;
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionPayload | null> {
  const normalized = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email: normalized },
  });

  if (user) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    if (tenant?.disabled) return null;

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return null;

    return {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role as TeamRole,
    };
  }

  // Fallback: ADMIN_PASSWORD unlocks the seeded demo admin account.
  // Only defaults to a known password outside production; production
  // deployments must set ADMIN_PASSWORD explicitly or this path is disabled.
  const adminPwd =
    process.env.ADMIN_PASSWORD?.trim() ||
    (!isProduction ? "facetai-demo" : undefined);
  if (
    adminPwd &&
    password === adminPwd &&
    (normalized === "admin" || normalized === DEMO_ADMIN_EMAIL)
  ) {
    const demo = await prisma.user.findUnique({
      where: { id: "user_demo_admin" },
    });
    if (demo) {
      return {
        userId: demo.id,
        tenantId: demo.tenantId,
        email: demo.email,
        name: demo.name,
        role: demo.role as TeamRole,
      };
    }
  }
  return null;
}

export async function encodeSession(session: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: session.userId,
    tenantId: session.tenantId,
    email: session.email,
    name: session.name,
    role: session.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(sessionSecret());
}

export async function decodeSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    const userId = String(payload.userId || "");
    const tenantId = String(payload.tenantId || "");
    const role = String(payload.role || "") as TeamRole;
    // Reject tokens carrying a role outside the known set — a signed token
    // with a junk role would otherwise rank 0 but still count as "logged in".
    if (!userId || !tenantId || !(role in ROLE_RANK)) return null;
    return {
      userId,
      tenantId,
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      role,
    };
  } catch {
    // NOTE: there is deliberately no fallback here.
    //
    // This previously decoded unverified base64 JSON as a "legacy session".
    // Because that path ran whenever signature verification failed, anyone
    // could set facetai_session to base64url({role:"admin",tenantId:"<any>"})
    // and get full admin on an arbitrary tenant without credentials.
    // An unsigned token is not a session — fail closed.
    return null;
  }
}

export async function getSessionFromRequest(
  request: Request,
): Promise<SessionPayload | null> {
  // Sessions are read from the httpOnly cookie only. An `x-facetai-session`
  // header was previously honoured but no client ever set it — it only widened
  // the attack surface (token accepted from a place XSS/JS can write).
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)facetai_session=([^;]+)/);
  if (match?.[1]) return decodeSession(decodeURIComponent(match[1]));

  // Legacy admin password header for /api/admin/config compatibility.
  // Requires an explicitly configured ADMIN_PASSWORD — no unauthenticated
  // fallback, even outside production, to avoid a silent open-admin backdoor.
  const pwd = request.headers.get("x-admin-password") || "";
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (expected && pwd === expected) {
    return {
      userId: "user_demo_admin",
      tenantId: DEFAULT_TENANT_ID,
      email: DEMO_ADMIN_EMAIL,
      name: "Demo Admin",
      role: "admin",
    };
  }
  return null;
}

export async function requireSession(
  request: Request,
): Promise<SessionPayload | Response> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  return session;
}

/** Role gates — admin > manager > moderator > agent */
const ROLE_RANK: Record<TeamRole, number> = {
  admin: 40,
  manager: 30,
  moderator: 20,
  agent: 10,
};

export function hasMinRole(
  session: SessionPayload,
  min: TeamRole,
): boolean {
  return (ROLE_RANK[session.role] || 0) >= (ROLE_RANK[min] || 0);
}

export function requireRole(
  session: SessionPayload,
  allowed: TeamRole[],
): Response | null {
  if (!allowed.includes(session.role)) {
    return Response.json(
      { error: `Forbidden. Requires one of: ${allowed.join(", ")}.` },
      { status: 403 },
    );
  }
  return null;
}

export function requireMinRole(
  session: SessionPayload,
  min: TeamRole,
): Response | null {
  if (!hasMinRole(session, min)) {
    return Response.json(
      { error: `Forbidden. Requires role ${min} or higher.` },
      { status: 403 },
    );
  }
  return null;
}

export async function listUsers(
  tenantId: string,
): Promise<Omit<User, "passwordHash">[]> {
  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });
  return users.map(({ passwordHash: _p, ...rest }) => ({
    ...rest,
    role: rest.role as TeamRole,
    createdAt: toIso(rest.createdAt),
  }));
}

export async function createUser(input: {
  tenantId: string;
  email: string;
  name: string;
  role: TeamRole;
  password: string;
  actor?: SessionPayload;
}): Promise<Omit<User, "passwordHash">> {
  const user = await prisma.user.create({
    data: {
      id: newId("user"),
      tenantId: input.tenantId,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      passwordHash: await hashPassword(input.password),
      createdAt: new Date(),
    },
  });
  await writeAuditLog({
    tenantId: input.tenantId,
    actorId: input.actor?.userId,
    actorEmail: input.actor?.email,
    action: "team.user_create",
    entityType: "user",
    entityId: user.id,
    meta: { email: user.email, role: user.role },
  });
  const { passwordHash: _p, ...rest } = user;
  return {
    ...rest,
    role: rest.role as TeamRole,
    createdAt: toIso(rest.createdAt),
  };
}

function mapPage(p: {
  id: string;
  tenantId: string;
  pageId: string;
  pageName: string;
  accessToken: string | null;
  status: string;
  mode: string;
  permissionsOk: boolean;
  webhookSubscribed: boolean;
  lastError: string | null;
  connectedAt: Date;
  updatedAt: Date;
}): PageConnection {
  return {
    id: p.id,
    tenantId: p.tenantId,
    pageId: p.pageId,
    pageName: p.pageName,
    accessToken: p.accessToken ? "[redacted]" : undefined,
    status: p.status as PageConnection["status"],
    mode: p.mode as PageConnectMode,
    permissionsOk: p.permissionsOk,
    webhookSubscribed: p.webhookSubscribed,
    lastError: p.lastError || undefined,
    connectedAt: toIso(p.connectedAt),
    updatedAt: toIso(p.updatedAt),
  };
}

export async function listPages(tenantId: string): Promise<PageConnection[]> {
  const pages = await prisma.pageConnection.findMany({
    where: { tenantId },
    orderBy: { connectedAt: "desc" },
  });
  return pages.map(mapPage);
}

export async function connectDemoPage(
  tenantId: string,
  pageName: string,
): Promise<PageConnection> {
  const now = new Date();
  await prisma.pageConnection.updateMany({
    where: { tenantId, mode: "demo" },
    data: { status: "disconnected", updatedAt: now },
  });
  const page = await prisma.pageConnection.create({
    data: {
      id: newId("page"),
      tenantId,
      pageId: `demo_page_${Date.now()}`,
      pageName: pageName || "Demo Facebook Page",
      accessToken: "demo_token_not_for_graph",
      status: "active",
      mode: "demo",
      permissionsOk: true,
      webhookSubscribed: false,
      connectedAt: now,
      updatedAt: now,
    },
  });
  return mapPage(page);
}

export async function saveOAuthPageStub(input: {
  tenantId: string;
  pageId: string;
  pageName: string;
  accessToken?: string;
  mode?: PageConnectMode;
  status?: PageConnection["status"];
  lastError?: string;
}): Promise<PageConnection> {
  const now = new Date();
  const page = await prisma.pageConnection.create({
    data: {
      id: newId("page"),
      tenantId: input.tenantId,
      pageId: input.pageId,
      pageName: input.pageName,
      accessToken: input.accessToken,
      status: input.status || "pending",
      mode: input.mode || "oauth",
      permissionsOk: false,
      webhookSubscribed: false,
      lastError: input.lastError,
      connectedAt: now,
      updatedAt: now,
    },
  });
  return mapPage(page);
}

export async function resolveTenantIdForPage(
  pageId?: string,
): Promise<string> {
  if (!pageId) return DEFAULT_TENANT_ID;
  const page = await prisma.pageConnection.findFirst({
    where: { pageId, status: "active" },
  });
  return page?.tenantId || DEFAULT_TENANT_ID;
}

export async function listTenants(): Promise<
  { id: string; name: string; slug: string; disabled: boolean; createdAt: string }[]
> {
  const rows = await prisma.tenant.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    disabled: t.disabled,
    createdAt: toIso(t.createdAt),
  }));
}

export async function setTenantDisabled(
  tenantId: string,
  disabled: boolean,
  actor?: SessionPayload,
): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { disabled },
  });
  await writeAuditLog({
    tenantId,
    actorId: actor?.userId,
    actorEmail: actor?.email,
    action: disabled ? "tenant.disable" : "tenant.enable",
    entityType: "tenant",
    entityId: tenantId,
  });
}

export function metaConnectConfigured(): {
  appId: boolean;
  appSecret: boolean;
  redirectUri: boolean;
} {
  return {
    appId: Boolean(process.env.META_APP_ID?.trim()),
    appSecret: Boolean(process.env.META_APP_SECRET?.trim()),
    redirectUri: Boolean(process.env.META_REDIRECT_URI?.trim()),
  };
}

export function buildFacebookLoginUrl(state: string): string | null {
  const appId = process.env.META_APP_ID?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim();
  if (!appId || !redirectUri) return null;

  const scopes = [
    "pages_show_list",
    "pages_messaging",
    "pages_manage_metadata",
    "pages_read_engagement",
  ].join(",");

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export { SESSION_COOKIE, SESSION_TTL_SEC, nowIso };
