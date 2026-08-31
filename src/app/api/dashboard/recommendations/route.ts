import { NextResponse } from "next/server";
import { getRecommendations } from "@/lib/bot/intelligence";
import {
  getSessionFromRequest,
  listProducts,
  updateProduct,
} from "@/lib/db";
import { denyUnless, MIN_ROLE } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId") || undefined;
  const query = url.searchParams.get("q") || undefined;
  const products = await listProducts(session.tenantId, false);
  const recommendations = getRecommendations(products, {
    productId,
    query,
    limit: 8,
  });
  return NextResponse.json({ ok: true, products, recommendations });
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const denied = denyUnless(session, MIN_ROLE.catalogWrite);
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      id?: string;
      upsellOf?: string[];
      crossSellOf?: string[];
      bundleWith?: string[];
    };
    if (!body.id) {
      return NextResponse.json({ error: "id required." }, { status: 400 });
    }
    const product = await updateProduct(session.tenantId, body.id, {
      upsellOf: body.upsellOf,
      crossSellOf: body.crossSellOf,
      bundleWith: body.bundleWith,
    });
    if (!product) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    console.error("[api/dashboard/recommendations]", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
