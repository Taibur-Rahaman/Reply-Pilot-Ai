import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { newId, nowIso, toIso } from "./ids";
import { prisma } from "./prisma";
import { writeAuditLog } from "./audit";
import type { PageConnection, PageConnectMode, TeamRole, User } from "./types";
import { DEFAULT_TENANT_ID } from "./types";

const SESSION_COOKIE = "facetai_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 14;

export type SessionPayload = {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: TeamRole;
};

function sessionSecret(): Uint8Array {
  const raw =
    process.env.SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    "facetai-dev-session-secret-change-me";
  return new TextEncoder().encode(raw.padEnd(32, "0").slice(0, 64));
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!hash) return false;
  // Legacy plaintext (pre-migrate) — accept once then rehash on next write path
  if (!hash.startsWith("$2")) {
    return password === hash;
  }
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

    // Upgrade legacy plaintext to bcrypt
    if (!user.passwordHash.startsWith("$2")) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      });
    }

    return {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role as TeamRole,
    };
  }

  // Fallback: ADMIN_PASSWORD unlocks demo admin
  const adminPwd =
    process.env.ADMIN_PASSWORD?.trim() ||
    (process.env.NODE_ENV !== "production" ? "facetai-demo" : undefined);
  if (
    adminPwd &&
    password === adminPwd &&
    (normalized === "admin" || normalized === "admin@demo.facetai.local")
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
    if (!userId || !tenantId || !role) return null;
    return {
      userId,
      tenantId,
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      role,
    };
  } catch {
    // Legacy base64 JSON sessions (pre Phase 1) — accept once
    try {
      const raw = Buffer.from(token, "base64url").toString("utf8");
      const parsed = JSON.parse(raw) as SessionPayload;
      if (!parsed.userId || !parsed.tenantId || !parsed.role) return null;
      return parsed;
    } catch {
      return null;
    }
  }
}

export async function getSessionFromRequest(
  request: Request,
): Promise<SessionPayload | null> {
  const header = request.headers.get("x-facetai-session") || "";
  if (header) return decodeSession(header);

  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)facetai_session=([^;]+)/);
  if (match?.[1]) return decodeSession(decodeURIComponent(match[1]));

  // Legacy admin password header for /api/admin/config compatibility
  const pwd = request.headers.get("x-admin-password") || "";
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (expected && pwd === expected) {
    return {
      userId: "user_demo_admin",
      tenantId: DEFAULT_TENANT_ID,
      email: "admin@demo.facetai.local",
      name: "Demo Admin",
      role: "admin",
    };
  }
  if (!expected && process.env.NODE_ENV !== "production") {
    return {
      userId: "user_demo_admin",
      tenantId: DEFAULT_TENANT_ID,
      email: "admin@demo.facetai.local",
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
