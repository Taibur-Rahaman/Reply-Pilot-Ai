import { NextResponse } from "next/server";
import {
  ECOMMERCE_PLATFORMS,
  getSessionFromRequest,
  listEcommerceConnections,
  parseProductImportPayload,
  stubSyncPlatform,
  upsertEcommerceConnection,
  upsertProductsFromImport,
  type EcommercePlatform,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const connections = await listEcommerceConnections(session.tenantId);
  return NextResponse.json({
    ok: true,
    connections,
    platforms: ECOMMERCE_PLATFORMS.filter((p) => p !== "manual"),
    note: "Live REST/Graph sync is next-step when store API keys are validated. Sync now uses stub/demo upsert or CSV/JSON import.",
  });
}

export async function PUT(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      platform?: EcommercePlatform;
      storeUrl?: string;
      apiKey?: string;
    };
    if (!body.platform || !ECOMMERCE_PLATFORMS.includes(body.platform)) {
      return NextResponse.json({ error: "platform required." }, { status: 400 });
    }
    const connection = await upsertEcommerceConnection(session.tenantId, {
      platform: body.platform,
      storeUrl: body.storeUrl,
      apiKey: body.apiKey,
      status:
        body.storeUrl && body.apiKey ? "connected" : "disconnected",
      note: body.storeUrl && body.apiKey
        ? "Credentials saved. Use Sync now (stub until live API adapter)."
        : undefined,
    });
    return NextResponse.json({ ok: true, connection });
  } catch (error) {
    console.error("[api/dashboard/ecommerce]", error);
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      action?: "sync" | "import";
      platform?: EcommercePlatform;
      products?: unknown;
      raw?: string;
    };

    if (body.action === "import") {
      const rows = parseProductImportPayload(body.products ?? body.raw);
      if (!rows.length) {
        return NextResponse.json(
          { error: "No products parsed. Send JSON array or CSV." },
          { status: 400 },
        );
      }
      const result = await upsertProductsFromImport(
        session.tenantId,
        rows,
        body.platform || "manual",
      );
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "sync") {
      if (!body.platform || body.platform === "manual") {
        return NextResponse.json(
          { error: "platform required for sync." },
          { status: 400 },
        );
      }
      const result = await stubSyncPlatform(session.tenantId, body.platform);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("[api/dashboard/ecommerce]", error);
    return NextResponse.json({ error: "Sync/import failed." }, { status: 500 });
  }
}
