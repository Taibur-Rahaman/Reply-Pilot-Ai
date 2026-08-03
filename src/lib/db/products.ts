import { newId, toIso } from "./ids";
import { prisma } from "./prisma";
import type { Product } from "./types";
import type { Prisma } from "@prisma/client";

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.map(String);
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
    upsellOf: asStringArray(p.upsellOf),
    crossSellOf: asStringArray(p.crossSellOf),
    bundleWith: asStringArray(p.bundleWith),
    sku: p.sku || undefined,
    externalId: p.externalId || undefined,
    sourcePlatform: (p.sourcePlatform as Product["sourcePlatform"]) || undefined,
    createdAt: toIso(p.createdAt),
    updatedAt: toIso(p.updatedAt),
  };
}

export async function listProducts(
  tenantId: string,
  activeOnly = false,
): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { tenantId, ...(activeOnly ? { active: true } : {}) },
    orderBy: { name: "asc" },
  });
  return rows.map(mapProduct);
}

export async function createProduct(
  tenantId: string,
  input: {
    name: string;
    price: number;
    imageUrl?: string;
    stock?: number;
    size?: string;
    color?: string;
    category?: string;
    sku?: string;
    upsellOf?: string[];
    crossSellOf?: string[];
    bundleWith?: string[];
  },
): Promise<Product> {
  const now = new Date();
  const product = await prisma.product.create({
    data: {
      id: newId("prod"),
      tenantId,
      name: input.name.trim(),
      price: Number(input.price) || 0,
      imageUrl: (input.imageUrl || "").trim(),
      stock: Number.isFinite(input.stock) ? Number(input.stock) : 0,
      active: true,
      size: input.size?.trim() || undefined,
      color: input.color?.trim() || undefined,
      category: input.category?.trim() || undefined,
      sku: input.sku?.trim() || undefined,
      upsellOf: input.upsellOf ?? undefined,
      crossSellOf: input.crossSellOf ?? undefined,
      bundleWith: input.bundleWith ?? undefined,
      createdAt: now,
      updatedAt: now,
    },
  });
  return mapProduct(product);
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  patch: Partial<
    Pick<
      Product,
      | "name"
      | "price"
      | "imageUrl"
      | "stock"
      | "active"
      | "size"
      | "color"
      | "category"
      | "sku"
      | "upsellOf"
      | "crossSellOf"
      | "bundleWith"
    >
  >,
): Promise<Product | null> {
  const existing = await prisma.product.findFirst({
    where: { id: productId, tenantId },
  });
  if (!existing) return null;
  const data: Prisma.ProductUpdateInput = {};
  if (typeof patch.name === "string") data.name = patch.name.trim();
  if (typeof patch.price === "number") data.price = patch.price;
  if (typeof patch.imageUrl === "string") data.imageUrl = patch.imageUrl;
  if (typeof patch.stock === "number") data.stock = patch.stock;
  if (typeof patch.active === "boolean") data.active = patch.active;
  if (typeof patch.size === "string") data.size = patch.size.trim();
  if (typeof patch.color === "string") data.color = patch.color.trim();
  if (typeof patch.category === "string") data.category = patch.category.trim();
  if (typeof patch.sku === "string") data.sku = patch.sku.trim();
  if (Array.isArray(patch.upsellOf)) data.upsellOf = patch.upsellOf;
  if (Array.isArray(patch.crossSellOf)) data.crossSellOf = patch.crossSellOf;
  if (Array.isArray(patch.bundleWith)) data.bundleWith = patch.bundleWith;
  const product = await prisma.product.update({
    where: { id: productId },
    data,
  });
  return mapProduct(product);
}

export async function deleteProduct(
  tenantId: string,
  productId: string,
): Promise<boolean> {
  const existing = await prisma.product.findFirst({
    where: { id: productId, tenantId },
  });
  if (!existing) return false;
  await prisma.product.delete({ where: { id: productId } });
  return true;
}

export function formatCatalogForPrompt(products: Product[]): string {
  if (!products.length) {
    return "(No catalog products yet — do not invent prices or stock.)";
  }
  return products
    .map((p) => {
      const attrs = [
        `৳${p.price}`,
        `stock ${p.stock}`,
        p.size ? `size ${p.size}` : null,
        p.color ? `color ${p.color}` : null,
        p.category ? `cat ${p.category}` : null,
        p.imageUrl ? `image: ${p.imageUrl}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      return `- [${p.id}] ${p.name}: ${attrs}`;
    })
    .join("\n");
}
