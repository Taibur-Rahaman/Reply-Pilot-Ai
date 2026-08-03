import { newId, toIso } from "./ids";
import { prisma } from "./prisma";
import type {
  EcommerceConnection,
  EcommercePlatform,
  Product,
} from "./types";

function mapEcom(e: {
  id: string;
  tenantId: string;
  platform: string;
  storeUrl: string;
  apiKey: string | null;
  status: string;
  lastSyncAt: Date | null;
  lastError: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): EcommerceConnection {
  return {
    id: e.id,
    tenantId: e.tenantId,
    platform: e.platform as EcommercePlatform,
    storeUrl: e.storeUrl,
    apiKey: e.apiKey || undefined,
    status: e.status as EcommerceConnection["status"],
    lastSyncAt: e.lastSyncAt ? toIso(e.lastSyncAt) : undefined,
    lastError: e.lastError || undefined,
    note: e.note || undefined,
    createdAt: toIso(e.createdAt),
    updatedAt: toIso(e.updatedAt),
  };
}

function mapProduct(p: {
  id: string;
  tenantId: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  active: boolean;
  size: string | null;
  color: string | null;
  category: string | null;
  upsellOf: unknown;
  crossSellOf: unknown;
  bundleWith: unknown;
  sku: string | null;
  externalId: string | null;
  sourcePlatform: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Product {
  const arr = (v: unknown) =>
    Array.isArray(v) ? v.map(String) : undefined;
  return {
    id: p.id,
    tenantId: p.tenantId,
    name: p.name,
    price: p.price,
    imageUrl: p.imageUrl,
    stock: p.stock,
    active: p.active,
    size: p.size || undefined,
    color: p.color || undefined,
    category: p.category || undefined,
    upsellOf: arr(p.upsellOf),
    crossSellOf: arr(p.crossSellOf),
    bundleWith: arr(p.bundleWith),
    sku: p.sku || undefined,
    externalId: p.externalId || undefined,
    sourcePlatform: (p.sourcePlatform as Product["sourcePlatform"]) || undefined,
    createdAt: toIso(p.createdAt),
    updatedAt: toIso(p.updatedAt),
  };
}

export async function listEcommerceConnections(
  tenantId: string,
): Promise<EcommerceConnection[]> {
  const rows = await prisma.ecommerceConnection.findMany({
    where: { tenantId },
    orderBy: { platform: "asc" },
  });
  return rows.map(mapEcom);
}

export async function upsertEcommerceConnection(
  tenantId: string,
  input: {
    platform: EcommercePlatform;
    storeUrl?: string;
    apiKey?: string;
    status?: EcommerceConnection["status"];
    note?: string;
  },
): Promise<EcommerceConnection> {
  const now = new Date();
  const row = await prisma.ecommerceConnection.upsert({
    where: {
      tenantId_platform: { tenantId, platform: input.platform },
    },
    create: {
      id: newId("ecom"),
      tenantId,
      platform: input.platform,
      storeUrl: (input.storeUrl || "").trim(),
      apiKey: input.apiKey?.trim() || undefined,
      status: input.status || "disconnected",
      note: input.note,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      ...(typeof input.storeUrl === "string"
        ? { storeUrl: input.storeUrl.trim() }
        : {}),
      ...(typeof input.apiKey === "string"
        ? { apiKey: input.apiKey.trim() || null }
        : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(typeof input.note === "string" ? { note: input.note } : {}),
      updatedAt: now,
    },
  });
  return mapEcom(row);
}

export type ImportProductRow = {
  name: string;
  price: number;
  stock?: number;
  imageUrl?: string;
  size?: string;
  color?: string;
  category?: string;
  sku?: string;
  externalId?: string;
};

export async function upsertProductsFromImport(
  tenantId: string,
  rows: ImportProductRow[],
  platform: EcommercePlatform = "manual",
): Promise<{ upserted: number; products: Product[] }> {
  const now = new Date();
  const products: Product[] = [];

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) continue;
    const externalId = row.externalId || row.sku;
    let existing = externalId
      ? await prisma.product.findFirst({
          where: {
            tenantId,
            OR: [{ externalId }, { sku: externalId }],
          },
        })
      : await prisma.product.findFirst({
          where: {
            tenantId,
            name: { equals: name, mode: "insensitive" },
          },
        });

    if (existing) {
      existing = await prisma.product.update({
        where: { id: existing.id },
        data: {
          name,
          price: Number(row.price) || existing.price,
          ...(row.stock !== undefined
            ? { stock: Number(row.stock) || 0 }
            : {}),
          ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
          ...(row.size ? { size: row.size } : {}),
          ...(row.color ? { color: row.color } : {}),
          ...(row.category ? { category: row.category } : {}),
          ...(row.sku ? { sku: row.sku } : {}),
          sourcePlatform: platform,
          updatedAt: now,
        },
      });
      products.push(mapProduct(existing));
    } else {
      const product = await prisma.product.create({
        data: {
          id: newId("prod"),
          tenantId,
          name,
          price: Number(row.price) || 0,
          imageUrl: row.imageUrl || "",
          stock: row.stock !== undefined ? Number(row.stock) || 0 : 0,
          active: true,
          size: row.size,
          color: row.color,
          category: row.category,
          sku: row.sku,
          externalId,
          sourcePlatform: platform,
          createdAt: now,
          updatedAt: now,
        },
      });
      products.push(mapProduct(product));
    }
  }

  return { upserted: products.length, products };
}

export async function stubSyncPlatform(
  tenantId: string,
  platform: EcommercePlatform,
): Promise<{ upserted: number; note: string }> {
  const demoRows: ImportProductRow[] = [
    {
      name: `${platform} Sync Tee — Black`,
      price: 650,
      stock: 40,
      color: "Black",
      size: "L",
      category: "apparel",
      sku: `${platform.toUpperCase()}-TEE-BLK`,
      externalId: `${platform}_tee_1`,
      imageUrl: `https://placehold.co/400x400/222/fff?text=${platform}+Tee`,
    },
    {
      name: `${platform} Sync Cap`,
      price: 350,
      stock: 25,
      color: "Navy",
      size: "Free",
      category: "accessories",
      sku: `${platform.toUpperCase()}-CAP`,
      externalId: `${platform}_cap_1`,
      imageUrl: `https://placehold.co/400x400/1e3a5f/fff?text=${platform}+Cap`,
    },
  ];

  const { upserted } = await upsertProductsFromImport(
    tenantId,
    demoRows,
    platform,
  );

  const conn = await prisma.ecommerceConnection.findUnique({
    where: { tenantId_platform: { tenantId, platform } },
  });
  if (conn) {
    await prisma.ecommerceConnection.update({
      where: { id: conn.id },
      data: {
        status: conn.apiKey && conn.storeUrl ? "connected" : "stub",
        lastSyncAt: new Date(),
        note:
          conn.apiKey && conn.storeUrl
            ? "Credentials saved. Live API sync is next-step when platform keys are validated; demo products upserted."
            : "Stub sync completed (demo products). Add store URL + API key for real sync later.",
        lastError: null,
      },
    });
  }

  return {
    upserted,
    note: "Stub/demo product sync — live WooCommerce/Shopify Graph/REST sync when keys present (documented next step).",
  };
}

export function parseProductImportPayload(raw: unknown): ImportProductRow[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) {
      const lines = trimmed.split(/\r?\n/).filter(Boolean);
      const start = lines[0]?.toLowerCase().includes("name") ? 1 : 0;
      return lines.slice(start).map((line) => {
        const [name, price, stock, color, size, category, sku] = line
          .split(",")
          .map((c) => c.trim());
        return {
          name: name || "",
          price: Number(price) || 0,
          stock: stock !== undefined ? Number(stock) : 0,
          color,
          size,
          category,
          sku,
        };
      });
    }
    try {
      return parseProductImportPayload(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    return raw.map((r) => {
      const o = r as Record<string, unknown>;
      return {
        name: String(o.name || o.title || ""),
        price: Number(o.price || o.regular_price || 0),
        stock: Number(o.stock ?? o.stock_quantity ?? 0),
        imageUrl: String(o.imageUrl || o.image || o.src || ""),
        size: o.size ? String(o.size) : undefined,
        color: o.color ? String(o.color) : undefined,
        category: o.category ? String(o.category) : undefined,
        sku: o.sku ? String(o.sku) : undefined,
        externalId: o.externalId
          ? String(o.externalId)
          : o.id
            ? String(o.id)
            : undefined,
      };
    });
  }
  if (typeof raw === "object" && raw !== null && "products" in raw) {
    return parseProductImportPayload(
      (raw as { products: unknown }).products,
    );
  }
  return [];
}
