import bcrypt from "bcryptjs";
import { prisma, ensurePgvector } from "./prisma";
import { defaultBotConfig, defaultCommentSettings } from "./defaults";
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from "./types";
import type { Channel } from "./types";

export { defaultBotConfig, defaultCommentSettings } from "./defaults";

async function hashPwd(password: string): Promise<string> {
  if (password.startsWith("$2")) return password;
  return bcrypt.hash(password, 10);
}

/** Ensure demo tenant + sample data exist in Postgres. */
export async function ensureSeeded(): Promise<void> {
  await ensurePgvector();

  await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    create: {
      id: DEFAULT_TENANT_ID,
      name: "FaceTai Demo",
      slug: DEFAULT_TENANT_SLUG,
      disabled: false,
    },
    update: {},
  });

  const adminPassword =
    process.env.ADMIN_PASSWORD?.trim() || "facetai-demo";
  const existingAdmin = await prisma.user.findUnique({
    where: { id: "user_demo_admin" },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        id: "user_demo_admin",
        tenantId: DEFAULT_TENANT_ID,
        email: "admin@demo.facetai.local",
        name: "Demo Admin",
        role: "admin",
        passwordHash: await hashPwd(adminPassword),
      },
    });
  }

  const bot = await prisma.botConfig.findUnique({
    where: { tenantId: DEFAULT_TENANT_ID },
  });
  if (!bot) {
    const d = defaultBotConfig(DEFAULT_TENANT_ID);
    await prisma.botConfig.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        pageId: d.pageId,
        businessName: d.businessName,
        greeting: d.greeting,
        systemPrompt: d.systemPrompt,
        productFaq: d.productFaq,
        productImageUrl: d.productImageUrl,
        handoffEnabled: d.handoffEnabled,
        abandonedLeadHours: d.abandonedLeadHours,
        personality: d.personality,
        guardrailRules: d.guardrailRules,
      },
    });
  }

  const comment = await prisma.commentSettings.findUnique({
    where: { tenantId: DEFAULT_TENANT_ID },
  });
  if (!comment) {
    const d = defaultCommentSettings(DEFAULT_TENANT_ID);
    await prisma.commentSettings.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        autoReplyEnabled: d.autoReplyEnabled,
        autoReplyText: d.autoReplyText,
        spamKeywords: d.spamKeywords,
        leadCaptureEnabled: d.leadCaptureEnabled,
      },
    });
  }

  const productCount = await prisma.product.count({
    where: { tenantId: DEFAULT_TENANT_ID },
  });
  if (productCount === 0) {
    await seedProducts();
  } else if (productCount < 5) {
    await seedExtraProducts();
  }

  const faqCount = await prisma.faqItem.count({
    where: { tenantId: DEFAULT_TENANT_ID },
  });
  if (faqCount === 0) {
    const now = new Date();
    await prisma.faqItem.createMany({
      data: [
        {
          id: "faq_demo_1",
          tenantId: DEFAULT_TENANT_ID,
          question: "ডেলিভারি কতদিনে?",
          answer: "সাধারণত ২–৩ কর্মদিবস (ডেমো FAQ)।",
          updatedAt: now,
        },
        {
          id: "faq_demo_2",
          tenantId: DEFAULT_TENANT_ID,
          question: "COD আছে?",
          answer: "হ্যাঁ, ডেমো স্টোরে Cash on Delivery আছে।",
          updatedAt: now,
        },
      ],
    });
  }

  const ecomCount = await prisma.ecommerceConnection.count({
    where: { tenantId: DEFAULT_TENANT_ID },
  });
  if (ecomCount === 0) {
    await seedEcommerce();
  }

  const convoCount = await prisma.conversation.count({
    where: { tenantId: DEFAULT_TENANT_ID },
  });
  const webConvo = await prisma.conversation.findFirst({
    where: { tenantId: DEFAULT_TENANT_ID, channel: "web" },
  });
  if (convoCount === 0 || !webConvo) {
    await seedOmnichannelDemo();
  }

  const cmpCount = await prisma.complaint.count({
    where: { tenantId: DEFAULT_TENANT_ID },
  });
  if (cmpCount === 0) {
    await seedComplaints();
  }

  const invoiceOrder = await prisma.order.findFirst({
    where: { tenantId: DEFAULT_TENANT_ID, invoiceNumber: { not: null } },
  });
  if (!invoiceOrder) {
    await seedSampleOrder();
  }
}

async function seedProducts() {
  const now = new Date();
  await prisma.product.createMany({
    data: [
      {
        id: "prod_demo_1",
        tenantId: DEFAULT_TENANT_ID,
        name: "Cotton Kurti — Navy",
        price: 890,
        imageUrl: "https://placehold.co/400x500/1e3a5f/ffffff?text=Kurti+Navy",
        stock: 24,
        active: true,
        size: "M",
        color: "Navy",
        category: "apparel",
        sku: "KURTI-NVY-M",
        upsellOf: [],
        crossSellOf: [],
        bundleWith: ["prod_demo_2"],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "prod_demo_2",
        tenantId: DEFAULT_TENANT_ID,
        name: "Premium Hijab — Soft Crepe",
        price: 450,
        imageUrl: "https://placehold.co/400x400/6b4f3a/ffffff?text=Hijab",
        stock: 60,
        active: true,
        size: "Free",
        color: "Beige",
        category: "apparel",
        sku: "HIJAB-BGE",
        upsellOf: ["prod_demo_1"],
        crossSellOf: ["prod_demo_1"],
        bundleWith: ["prod_demo_1"],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "prod_demo_3",
        tenantId: DEFAULT_TENANT_ID,
        name: "Leather Wallet — Brown",
        price: 1200,
        imageUrl: "https://placehold.co/400x400/5c3d2e/ffffff?text=Wallet",
        stock: 15,
        active: true,
        size: "One",
        color: "Brown",
        category: "accessories",
        sku: "WLT-BRN",
        upsellOf: [],
        crossSellOf: ["prod_demo_4"],
        bundleWith: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "prod_demo_4",
        tenantId: DEFAULT_TENANT_ID,
        name: "Minimal Watch — Silver",
        price: 2490,
        imageUrl: "https://placehold.co/400x400/8a8a8a/ffffff?text=Watch",
        stock: 8,
        active: true,
        size: "One",
        color: "Silver",
        category: "accessories",
        sku: "WATCH-SLV",
        upsellOf: ["prod_demo_3"],
        crossSellOf: ["prod_demo_3"],
        bundleWith: ["prod_demo_3"],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "prod_demo_5",
        tenantId: DEFAULT_TENANT_ID,
        name: "FaceTai Growth Plan (monthly)",
        price: 4990,
        imageUrl: "https://placehold.co/400x400/0f766e/ffffff?text=Growth",
        stock: 99,
        active: true,
        category: "saas",
        sku: "FT-GROWTH",
        upsellOf: [],
        crossSellOf: [],
        bundleWith: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
}

async function seedExtraProducts() {
  const now = new Date();
  const extras = [
    {
      id: "prod_demo_3",
      name: "Leather Wallet — Brown",
      price: 1200,
      imageUrl: "https://placehold.co/400x400/5c3d2e/ffffff?text=Wallet",
      stock: 15,
      size: "One",
      color: "Brown",
      category: "accessories",
      sku: "WLT-BRN",
      crossSellOf: ["prod_demo_4"],
    },
    {
      id: "prod_demo_4",
      name: "Minimal Watch — Silver",
      price: 2490,
      imageUrl: "https://placehold.co/400x400/8a8a8a/ffffff?text=Watch",
      stock: 8,
      size: "One",
      color: "Silver",
      category: "accessories",
      sku: "WATCH-SLV",
      upsellOf: ["prod_demo_3"],
      bundleWith: ["prod_demo_3"],
    },
    {
      id: "prod_demo_5",
      name: "FaceTai Growth Plan (monthly)",
      price: 4990,
      imageUrl: "https://placehold.co/400x400/0f766e/ffffff?text=Growth",
      stock: 99,
      category: "saas",
      sku: "FT-GROWTH",
    },
  ];
  for (const p of extras) {
    const exists = await prisma.product.findUnique({ where: { id: p.id } });
    if (!exists) {
      await prisma.product.create({
        data: {
          id: p.id,
          tenantId: DEFAULT_TENANT_ID,
          name: p.name,
          price: p.price,
          imageUrl: p.imageUrl,
          stock: p.stock,
          active: true,
          size: "size" in p ? p.size : undefined,
          color: "color" in p ? p.color : undefined,
          category: p.category,
          sku: p.sku,
          upsellOf: "upsellOf" in p ? p.upsellOf : [],
          crossSellOf: "crossSellOf" in p ? p.crossSellOf : [],
          bundleWith: "bundleWith" in p ? p.bundleWith : [],
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  }
}

async function seedEcommerce() {
  const now = new Date();
  const platforms = ["woocommerce", "shopify", "wordpress", "opencart"] as const;
  for (let i = 0; i < platforms.length; i++) {
    await prisma.ecommerceConnection.create({
      data: {
        id: `ecom_demo_${i + 1}`,
        tenantId: DEFAULT_TENANT_ID,
        platform: platforms[i],
        storeUrl: "",
        status: "disconnected",
        note: "Save store URL + API key, then Sync now (stub pulls demo JSON or accepts import).",
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}

async function seedOmnichannelDemo() {
  const now = Date.now();
  const channels: {
    channel: Channel;
    sender: string;
    name: string;
    texts: string[];
  }[] = [
    {
      channel: "messenger",
      sender: "fb_user_demo_1",
      name: "Nusrat",
      texts: ["আসসালামু আলাইকুম", "Kurti এর দাম কত?"],
    },
    {
      channel: "whatsapp",
      sender: "wa_8801711000001",
      name: "Rafi",
      texts: ["Hi", "Watch stock ase?"],
    },
    {
      channel: "instagram",
      sender: "ig_user_demo",
      name: "Farhana",
      texts: ["Love this hijab ❤️", "Color options?"],
    },
    {
      channel: "web",
      sender: "web_guest_demo",
      name: "Website visitor",
      texts: ["Delivery time?", "COD available?"],
    },
    {
      channel: "telegram",
      sender: "tg_user_demo",
      name: "Telegram guest",
      texts: ["Price list pls"],
    },
  ];

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const id = `conv_demo_${ch.channel}`;
    const exists = await prisma.conversation.findUnique({ where: { id } });
    if (exists) continue;
    const created = new Date(now - (channels.length - i) * 3600_000);
    await prisma.conversation.create({
      data: {
        id,
        tenantId: DEFAULT_TENANT_ID,
        pageId: "page_demo",
        senderId: ch.sender,
        senderName: ch.name,
        channel: ch.channel,
        handoffActive: false,
        lastMessageAt: created,
        createdAt: created,
      },
    });
    for (let ti = 0; ti < ch.texts.length; ti++) {
      await prisma.message.create({
        data: {
          id: `msg_demo_${ch.channel}_${ti}`,
          tenantId: DEFAULT_TENANT_ID,
          conversationId: id,
          direction: ti % 2 === 0 ? "inbound" : "outbound",
          text: ch.texts[ti],
          createdAt: new Date(
            now - (channels.length - i) * 3600_000 + ti * 60_000,
          ),
        },
      });
    }
  }
}

async function seedComplaints() {
  const now = new Date();
  await prisma.complaint.createMany({
    data: [
      {
        id: "cmp_demo_1",
        tenantId: DEFAULT_TENANT_ID,
        conversationId: "conv_demo_messenger",
        senderId: "fb_user_demo_1",
        channel: "messenger",
        text: "প্রোডাক্ট নষ্ট এসেছে, ফেরত চাই",
        priority: "high",
        status: "open",
        resolution: "none",
        notes: "Seed complaint — refund workflow demo",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "cmp_demo_2",
        tenantId: DEFAULT_TENANT_ID,
        senderId: "wa_8801711000001",
        channel: "whatsapp",
        text: "Wrong size delivered — need exchange",
        priority: "medium",
        status: "exchange_pending",
        resolution: "exchange",
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
  await prisma.conversation.updateMany({
    where: { id: "conv_demo_messenger" },
    data: { complaintTagged: true, priority: "high" },
  });
}

async function seedSampleOrder() {
  const exists = await prisma.order.findUnique({
    where: { id: "ord_demo_invoice" },
  });
  if (exists) return;
  const now = new Date();
  await prisma.order.create({
    data: {
      id: "ord_demo_invoice",
      tenantId: DEFAULT_TENANT_ID,
      pageId: "page_demo",
      senderId: "fb_user_demo_1",
      name: "Nusrat Rahman",
      phone: "01711000001",
      product: "Cotton Kurti — Navy",
      qty: "1",
      status: "confirmed",
      trackingStatus: "shipped",
      courierName: "Steadfast",
      trackingNumber: "SF-DEMO-9988",
      courierNote: "Out for delivery (demo)",
      address: "Dhanmondi, Dhaka",
      unitPrice: 890,
      invoiceNumber: "INV-DEMO-1001",
      createdAt: now,
      updatedAt: now,
    },
  });
}
