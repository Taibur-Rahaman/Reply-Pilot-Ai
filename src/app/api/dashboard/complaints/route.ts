import { NextResponse } from "next/server";
import {
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  createComplaint,
  escalateComplaint,
  getSessionFromRequest,
  listComplaints,
  updateComplaint,
  type ComplaintPriority,
  type ComplaintResolution,
  type ComplaintStatus,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const complaints = await listComplaints(session.tenantId);
  return NextResponse.json({
    ok: true,
    complaints,
    priorities: COMPLAINT_PRIORITIES,
    statuses: COMPLAINT_STATUSES,
  });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      text?: string;
      priority?: ComplaintPriority;
      senderId?: string;
    };
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "text required." }, { status: 400 });
    }
    const complaint = await createComplaint({
      tenantId: session.tenantId,
      text: body.text.trim(),
      priority: body.priority || "medium",
      senderId: body.senderId,
    });
    return NextResponse.json({ ok: true, complaint });
  } catch (error) {
    console.error("[api/dashboard/complaints]", error);
    return NextResponse.json({ error: "Create failed." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      id?: string;
      action?: "escalate" | "update";
      status?: ComplaintStatus;
      priority?: ComplaintPriority;
      resolution?: ComplaintResolution;
      notes?: string;
    };
    if (!body.id) {
      return NextResponse.json({ error: "id required." }, { status: 400 });
    }
    if (body.action === "escalate") {
      const complaint = await escalateComplaint(session.tenantId, body.id);
      if (!complaint) {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, complaint });
    }
    const complaint = await updateComplaint(session.tenantId, body.id, {
      status: body.status,
      priority: body.priority,
      resolution: body.resolution,
      notes: body.notes,
    });
    if (!complaint) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, complaint });
  } catch (error) {
    console.error("[api/dashboard/complaints]", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
