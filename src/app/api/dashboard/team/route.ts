import { NextResponse } from "next/server";
import {
  createUser,
  getSessionFromRequest,
  listUsers,
  TEAM_ROLES,
  type TeamRole,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const users = await listUsers(session.tenantId);
  return NextResponse.json({
    ok: true,
    users,
    roles: TEAM_ROLES,
    note: "F44 RBAC stub — roles stored; fine-grained permission checks polish in Wave C.",
  });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json(
      { error: "Only Admin/Manager can add team members." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      role?: TeamRole;
      password?: string;
    };
    if (!body.email || !body.name || !body.password || !body.role) {
      return NextResponse.json(
        { error: "email, name, role, password required." },
        { status: 400 },
      );
    }
    if (!TEAM_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    const user = await createUser({
      tenantId: session.tenantId,
      email: body.email,
      name: body.name,
      role: body.role,
      password: body.password,
      actor: session,
    });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("[api/dashboard/team]", error);
    return NextResponse.json({ error: "Create failed." }, { status: 500 });
  }
}
