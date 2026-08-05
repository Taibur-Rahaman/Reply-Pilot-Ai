/**
 * Migrate data/facetai-db.json → PostgreSQL.
 * Usage: npm run db:migrate-json
 */
import { readFileSync, existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import type { FaceTaiDb } from "../src/lib/db/types";

function loadEnvFile(file: string) {
  const p = path.join(process.cwd(), file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const prisma = new PrismaClient();
const DB_FILE = path.join(process.cwd(), "data", "facetai-db.json");

async function hashPwd(password: string): Promise<string> {
  if (!password) return bcrypt.hash("facetai-demo", 10);
  if (password.startsWith("$2")) return password;
  return bcrypt.hash(password, 10);
}

function asDate(v: string | undefined): Date {
  return v ? new Date(v) : new Date();
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_CONFIRM !== "yes") {
    console.error(
      "Refusing to run the legacy JSON import against a production database.\n" +
        "Re-run with SEED_CONFIRM=yes if this is intentional.",
    );
    process.exit(1);
  }
  let raw: string;
  try {
    raw = await readFile(DB_FILE, "utf8");
  } catch {
    console.log("No data/facetai-db.json found — nothing to migrate.");
    console.log("Run: npm run seed  (after DATABASE_URL + prisma migrate)");
    return;
  }

  const db = JSON.parse(raw) as FaceTaiDb;
  console.log("Migrating facetai-db.json → Postgres…");

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);


  for (const t of db.tenants || []) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        name: t.name,
        slug: t.slug,
        disabled: Boolean(t.disabled),
        createdAt: asDate(t.createdAt),
      },
      update: {
        name: t.name,
        slug: t.slug,
        disabled: Boolean(t.disabled),
      },
    });
  }

  for (const u of db.users || []) {
    const passwordHash = await hashPwd(
      u.passwordHash || u.password || "facetai-demo",
    );
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        tenantId: u.tenantId,
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        createdAt: asDate(u.createdAt),
      },
      update: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
      },
    });
  }

  for (const p of db.pages || []) {
    await prisma.pageConnection.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        tenantId: p.tenantId,
        pageId: p.pageId,
        pageName: p.pageName,
        accessToken: p.accessToken,
        status: p.status,
        mode: p.mode,
        permissionsOk: p.permissionsOk,
        webhookSubscribed: p.webhookSubscribed,
        lastError: p.lastError,
        connectedAt: asDate(p.connectedAt),
        updatedAt: asDate(p.updatedAt),
      },
      update: {
        pageName: p.pageName,
        status: p.status,
        accessToken: p.accessToken,
      },
    });
  }

  for (const c of db.conversations || []) {
    await prisma.conversation.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        tenantId: c.tenantId,
        pageId: c.pageId,
        senderId: c.senderId,
        senderName: c.senderName,
        channel: c.channel || "messenger",
        handoffActive: c.handoffActive,
        priority: c.priority,
        complaintTagged: Boolean(c.complaintTagged),
        lastMessageAt: asDate(c.lastMessageAt),
        createdAt: asDate(c.createdAt),
      },
      update: {
        handoffActive: c.handoffActive,
        lastMessageAt: asDate(c.lastMessageAt),
      },
    });
  }

  for (const m of db.messages || []) {
    await prisma.message.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        tenantId: m.tenantId,
        conversationId: m.conversationId,
        direction: m.direction,
        text: m.text,
        mid: m.mid,
        imageUrl: m.imageUrl,
        recognition: m.recognition ?? undefined,
        createdAt: asDate(m.createdAt),
      },
      update: { text: m.text },
    });
  }

  for (const l of db.leads || []) {
    await prisma.lead.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        tenantId: l.tenantId,
        name: l.name,
        phone: l.phone,
        businessType: l.businessType,
        interest: l.interest,
        source: l.source,
        crmStage: l.crmStage,
        notes: l.notes,
        senderId: l.senderId,
        followUpQueuedAt: l.followUpQueuedAt
          ? asDate(l.followUpQueuedAt)
          : null,
        followUpSentAt: l.followUpSentAt ? asDate(l.followUpSentAt) : null,
        priority: l.priority,
        createdAt: asDate(l.createdAt),
        updatedAt: asDate(l.updatedAt),
      },
      update: { crmStage: l.crmStage, notes: l.notes },
    });
  }

  for (const o of db.orders || []) {
    await prisma.order.upsert({
      where: { id: o.id },
      create: {
        id: o.id,
        tenantId: o.tenantId,
        pageId: o.pageId,
        senderId: o.senderId,
        name: o.name,
        phone: o.phone,
        product: o.product,
        qty: o.qty,
        notes: o.notes,
        status: o.status,
        trackingStatus: o.trackingStatus,
        courierNote: o.courierNote,
        courierName: o.courierName,
        trackingNumber: o.trackingNumber,
        address: o.address,
        unitPrice: o.unitPrice,
        invoiceNumber: o.invoiceNumber,
        createdAt: asDate(o.createdAt),
        updatedAt: asDate(o.updatedAt),
      },
      update: {
        trackingStatus: o.trackingStatus,
        invoiceNumber: o.invoiceNumber,
      },
    });
  }

  for (const p of db.products || []) {
    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        tenantId: p.tenantId,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl || "",
        stock: p.stock,
        active: p.active,
        size: p.size,
        color: p.color,
        category: p.category,
        upsellOf: p.upsellOf ?? undefined,
        crossSellOf: p.crossSellOf ?? undefined,
        bundleWith: p.bundleWith ?? undefined,
        sku: p.sku,
        externalId: p.externalId,
        sourcePlatform: p.sourcePlatform,
        createdAt: asDate(p.createdAt),
        updatedAt: asDate(p.updatedAt),
      },
      update: {
        name: p.name,
        price: p.price,
        stock: p.stock,
        active: p.active,
      },
    });
  }

  for (const d of db.kbDocuments || []) {
    await prisma.kbDocument.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        tenantId: d.tenantId,
        filename: d.filename,
        mimeType: d.mimeType,
        source: d.source,
        extractedText: d.extractedText || "",
        storagePath: d.storagePath,
        status: d.status,
        note: d.note,
        createdAt: asDate(d.createdAt),
      },
      update: { extractedText: d.extractedText, status: d.status },
    });
  }

  for (const f of db.faqItems || []) {
    await prisma.faqItem.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        tenantId: f.tenantId,
        question: f.question,
        answer: f.answer,
        updatedAt: asDate(f.updatedAt),
      },
      update: { question: f.question, answer: f.answer },
    });
  }

  for (const c of db.botConfigs || []) {
    await prisma.botConfig.upsert({
      where: { tenantId: c.tenantId },
      create: {
        tenantId: c.tenantId,
        pageId: c.pageId || "",
        businessName: c.businessName,
        greeting: c.greeting,
        systemPrompt: c.systemPrompt,
        productFaq: c.productFaq,
        productImageUrl: c.productImageUrl || "",
        handoffEnabled: c.handoffEnabled,
        abandonedLeadHours: c.abandonedLeadHours ?? 24,
        personality: c.personality || "",
        guardrailRules: c.guardrailRules ?? undefined,
      },
      update: {
        businessName: c.businessName,
        greeting: c.greeting,
        systemPrompt: c.systemPrompt,
        productFaq: c.productFaq,
      },
    });
  }

  for (const c of db.complaints || []) {
    await prisma.complaint.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        tenantId: c.tenantId,
        conversationId: c.conversationId,
        leadId: c.leadId,
        senderId: c.senderId,
        channel: c.channel,
        text: c.text,
        priority: c.priority,
        status: c.status,
        resolution: c.resolution || "none",
        notes: c.notes,
        createdAt: asDate(c.createdAt),
        updatedAt: asDate(c.updatedAt),
      },
      update: { status: c.status, notes: c.notes },
    });
  }

  for (const e of db.ecommerceConnections || []) {
    await prisma.ecommerceConnection.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        tenantId: e.tenantId,
        platform: e.platform,
        storeUrl: e.storeUrl || "",
        apiKey: e.apiKey,
        status: e.status,
        lastSyncAt: e.lastSyncAt ? asDate(e.lastSyncAt) : null,
        lastError: e.lastError,
        note: e.note,
        createdAt: asDate(e.createdAt),
        updatedAt: asDate(e.updatedAt),
      },
      update: { status: e.status, storeUrl: e.storeUrl },
    });
  }

  for (const s of db.commentSettings || []) {
    await prisma.commentSettings.upsert({
      where: { tenantId: s.tenantId },
      create: {
        tenantId: s.tenantId,
        autoReplyEnabled: s.autoReplyEnabled,
        autoReplyText: s.autoReplyText,
        spamKeywords: s.spamKeywords,
        leadCaptureEnabled: s.leadCaptureEnabled,
      },
      update: {
        autoReplyText: s.autoReplyText,
        spamKeywords: s.spamKeywords,
      },
    });
  }

  for (const e of db.commentEvents || []) {
    await prisma.commentEvent.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        tenantId: e.tenantId,
        commentId: e.commentId,
        postId: e.postId,
        authorName: e.authorName,
        text: e.text,
        isSpam: e.isSpam,
        spamAction: e.spamAction,
        autoReplied: e.autoReplied,
        replyText: e.replyText,
        leadId: e.leadId,
        createdAt: asDate(e.createdAt),
      },
      update: { text: e.text },
    });
  }

  console.log("Migration complete.");
  console.log("  tenants:", db.tenants?.length || 0);
  console.log("  users:", db.users?.length || 0);
  console.log("  products:", db.products?.length || 0);
  console.log("  conversations:", db.conversations?.length || 0);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
