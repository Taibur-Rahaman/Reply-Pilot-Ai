import { NextResponse } from "next/server";
import {
  createProduct,
  deleteProduct,
  getSessionFromRequest,
  listProducts,
  updateProduct,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const products = await listProducts(session.tenantId);
  return NextResponse.json({ ok: true, products });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      name?: string;
      price?: number;
      imageUrl?: string;
      stock?: number;
      size?: string;
      color?: string;
      category?: string;
      sku?: string;
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name required." }, { status: 400 });
    }
    const product = await createProduct(session.tenantId, {
      name: body.name,
      price: Number(body.price) || 0,
      imageUrl: body.imageUrl,
      stock: Number(body.stock) || 0,
      size: body.size,
      color: body.color,
      category: body.category,
      sku: body.sku,
    });
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    console.error("[api/dashboard/products]", error);
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
      name?: string;
      price?: number;
      imageUrl?: string;
      stock?: number;
      active?: boolean;
      size?: string;
      color?: string;
      category?: string;
      sku?: string;
      upsellOf?: string[];
      crossSellOf?: string[];
      bundleWith?: string[];
    };
    if (!body.id) {
      return NextResponse.json({ error: "id required." }, { status: 400 });
    }
    const product = await updateProduct(session.tenantId, body.id, body);
    if (!product) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    console.error("[api/dashboard/products]", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required." }, { status: 400 });
  }
  const ok = await deleteProduct(session.tenantId, id);
  if (!ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
