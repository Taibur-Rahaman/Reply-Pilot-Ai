import { NextResponse } from "next/server";
import {
  createKbStub,
  deleteFaq,
  deleteKbDocument,
  getBotConfig,
  getSessionFromRequest,
  listFaq,
  listKbDocuments,
  saveBotConfig,
  storeKbUpload,
  upsertFaq,
} from "@/lib/db";
import { denyUnless, MIN_ROLE } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const [faq, kb, config] = await Promise.all([
    listFaq(session.tenantId),
    listKbDocuments(session.tenantId),
    getBotConfig(session.tenantId),
  ]);
  return NextResponse.json({ ok: true, faq, kb, config });
}

export async function PUT(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const denied = denyUnless(session, MIN_ROLE.knowledgeWrite);
  if (denied) return denied;
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "upsert_faq") {
      const item = await upsertFaq(session.tenantId, {
        id: typeof body.id === "string" ? body.id : undefined,
        question: String(body.question || ""),
        answer: String(body.answer || ""),
      });
      return NextResponse.json({ ok: true, faq: item });
    }

    if (body.action === "delete_faq") {
      const ok = await deleteFaq(session.tenantId, String(body.id || ""));
      return NextResponse.json({ ok });
    }

    if (body.action === "stub_crawl") {
      const doc = await createKbStub({
        tenantId: session.tenantId,
        filename: String(body.url || "website-crawl"),
        source: "crawl",
        note: "Website crawl coming in Wave B (F48 / F29). Stub recorded.",
      });
      return NextResponse.json({ ok: true, kb: doc });
    }

    if (body.action === "stub_facebook_faq") {
      const doc = await createKbStub({
        tenantId: session.tenantId,
        filename: "facebook-page-faq",
        source: "facebook_faq",
        note: "Facebook Page FAQ import coming in Wave B (F30 / F48). Stub recorded.",
      });
      return NextResponse.json({ ok: true, kb: doc });
    }

    if (body.action === "stub_google_drive") {
      const doc = await createKbStub({
        tenantId: session.tenantId,
        filename: String(body.url || "google-drive"),
        source: "google_drive",
        note: "Google Drive OAuth connect — stub. Share a Drive folder URL; live sync is next-step (F48 / F55).",
      });
      return NextResponse.json({ ok: true, kb: doc });
    }

    if (body.action === "stub_google_sheets") {
      const doc = await createKbStub({
        tenantId: session.tenantId,
        filename: String(body.url || "google-sheet"),
        source: "google_sheets",
        note: "Google Sheets connect — stub. Paste sheet URL; live row sync is next-step (F48 / F55).",
      });
      return NextResponse.json({ ok: true, kb: doc });
    }

    if (body.action === "stub_notion") {
      const doc = await createKbStub({
        tenantId: session.tenantId,
        filename: String(body.url || "notion-page"),
        source: "notion",
        note: "Notion integration token — stub. Connect workspace later (F48 / F55).",
      });
      return NextResponse.json({ ok: true, kb: doc });
    }

    if (body.action === "delete_kb") {
      const ok = await deleteKbDocument(session.tenantId, String(body.id || ""));
      return NextResponse.json({ ok });
    }

    if (body.action === "save_config") {
      if (session.role === "agent") {
        return NextResponse.json(
          { error: "Agents cannot edit bot config." },
          { status: 403 },
        );
      }
      const config = await saveBotConfig(
        session.tenantId,
        {
          businessName:
            typeof body.businessName === "string"
              ? body.businessName
              : undefined,
          greeting:
            typeof body.greeting === "string" ? body.greeting : undefined,
          systemPrompt:
            typeof body.systemPrompt === "string"
              ? body.systemPrompt
              : undefined,
          productFaq:
            typeof body.productFaq === "string" ? body.productFaq : undefined,
          productImageUrl:
            typeof body.productImageUrl === "string"
              ? body.productImageUrl
              : undefined,
          pageId: typeof body.pageId === "string" ? body.pageId : undefined,
          handoffEnabled:
            typeof body.handoffEnabled === "boolean"
              ? body.handoffEnabled
              : undefined,
          botEnabled:
            typeof body.botEnabled === "boolean" ? body.botEnabled : undefined,
          abandonedLeadHours:
            typeof body.abandonedLeadHours === "number"
              ? body.abandonedLeadHours
              : undefined,
          personality:
            typeof body.personality === "string"
              ? body.personality
              : undefined,
          guardrailRules:
            body.guardrailRules && typeof body.guardrailRules === "object"
              ? (body.guardrailRules as Parameters<
                  typeof saveBotConfig
                >[1]["guardrailRules"])
              : undefined,
        },
        { userId: session.userId, email: session.email },
      );
      return NextResponse.json({ ok: true, config });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("[api/dashboard/knowledge]", error);
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const denied = denyUnless(session, MIN_ROLE.knowledgeWrite);
  if (denied) return denied;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await storeKbUpload({
      tenantId: session.tenantId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      actor: { userId: session.userId, email: session.email },
    });
    return NextResponse.json({ ok: true, kb: doc });
  } catch (error) {
    console.error("[api/dashboard/knowledge upload]", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
