import { NextResponse } from "next/server";
import { storeLead, validateLead } from "@/lib/leads";
import { whatsappUrlWithText } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = validateLead(body);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const lead = await storeLead(validated.data);

    const message = [
      "Hi FaceTai — I just submitted a lead on the website.",
      `Name: ${lead.name}`,
      `Phone: ${lead.phone}`,
      `Business: ${lead.businessType}`,
      `Interest: ${lead.interest}`,
    ].join("\n");

    return NextResponse.json({
      ok: true,
      id: lead.id,
      whatsappUrl: whatsappUrlWithText(message),
    });
  } catch (error) {
    console.error("[api/leads]", error);
    return NextResponse.json(
      { error: "Could not save your request. Please try WhatsApp instead." },
      { status: 500 },
    );
  }
}
