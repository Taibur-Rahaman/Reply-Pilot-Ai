import { NextResponse } from "next/server";
import {
  CRM_STAGES,
  getSessionFromRequest,
  listAbandonedLeads,
  listLeads,
  markLeadFollowUpSent,
  queueLeadFollowUp,
  type CrmStage,
  updateLeadStage,
} from "@/lib/db";
import { getBotConfig } from "@/lib/db/knowledge";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const leads = await listLeads(session.tenantId);
  const config = await getBotConfig(session.tenantId);
  const abandoned = await listAbandonedLeads(
    session.tenantId,
    config.abandonedLeadHours || 24,
  );
  return NextResponse.json({
    ok: true,
    leads,
    abandoned,
    stages: CRM_STAGES,
  });
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      crmStage?: CrmStage;
      action?: "queue_followup" | "mark_followup_sent";
    };

    if (!body.id) {
      return NextResponse.json({ error: "id required." }, { status: 400 });
    }

    if (body.action === "queue_followup") {
      const lead = await queueLeadFollowUp(session.tenantId, body.id);
      if (!lead) {
        return NextResponse.json({ error: "Lead not found." }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        lead,
        note: "Follow-up queued. Meta 24h window / policy may block send until Connect + messaging tags are live. Operator can copy nudge manually.",
        suggestedMessage:
          `হাই ${lead.name}! আপনার আগ্রহের জন্য ধন্যবাদ। এখনো অর্ডার বাকি থাকলে সাহায্য করতে পারি — ক্যাটালগ বা অফার জানতে রিপ্লাই করুন।`,
      });
    }

    if (body.action === "mark_followup_sent") {
      const lead = await markLeadFollowUpSent(session.tenantId, body.id);
      if (!lead) {
        return NextResponse.json({ error: "Lead not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, lead });
    }

    if (body.crmStage && CRM_STAGES.includes(body.crmStage)) {
      const lead = await updateLeadStage(
        session.tenantId,
        body.id,
        body.crmStage,
      );
      if (!lead) {
        return NextResponse.json({ error: "Lead not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, lead });
    }

    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  } catch (error) {
    console.error("[api/dashboard/leads]", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
