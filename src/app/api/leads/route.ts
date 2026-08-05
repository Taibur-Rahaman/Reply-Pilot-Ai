import { NextResponse } from "next/server";
import { storeLead, validateLead } from "@/lib/leads";
import { whatsappUrlWithText } from "@/lib/config";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rl = checkRateLimit(`leads:${getClientIp(request)}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec!);

  try {
    const body = await request.json();
    const validated = validateLead(body);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const lead = await storeLead(validated.data);

    const message = [
      "Hi ReplyPilot AI — I just submitted a lead on the website.",
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
