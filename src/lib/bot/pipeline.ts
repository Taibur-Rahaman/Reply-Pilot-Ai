import { WHATSAPP_DISPLAY } from "@/lib/config";
import {
  acknowledgeImageStub,
  generateAiReply,
  wantsProductPhoto,
} from "./ai";
import {
  aiProviderSummary,
  getAiApiKey,
  getPageAccessToken,
  isAiLlmEnabled,
  loadBusinessConfig,
} from "./config";
import {
  escalationAck,
  evaluateEscalation,
  isHandoffActive,
  logOperatorEvent,
  setHandoff,
} from "./handoff";
import {
  complaintAckReply,
  detectComplaint,
  formatProductMatchReply,
  formatRecommendationsForReply,
  getRecommendations,
  matchProductFromImageHint,
} from "./intelligence";
import {
  sendImageMessage,
  sendTextMessage,
  type InboundMessage,
} from "./messenger";
import {
  appendMessage,
  buildKnowledgeBlob,
  createComplaint,
  DEFAULT_TENANT_ID,
  findLatestOrderForSender,
  findOrdersByPhone,
  formatCatalogForPrompt,
  formatTrackingReply,
  listMessages,
  listProducts,
  resolveTenantIdForPage,
  storeOrder,
  tryParseOrderFromText,
  upsertConversation,
  wantsOrderTracking,
} from "@/lib/db";
import { Prisma } from "@prisma/client";
import { resolvePageSendToken } from "./page-token";
import {
  ungroundedFactualAsk,
  validateGroundedReply,
} from "./grounding";

export type HandleResult = {
  handled: boolean;
  reason?: string;
  replyPreview?: string;
  orderId?: string;
  conversationId?: string;
};

function isUniqueMidConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function deliverText(
  inbound: InboundMessage,
  text: string,
  token: string | undefined,
) {
  if (inbound.channel === "web") return { ok: true, skipped: false as const };
  return sendTextMessage(inbound.senderId, text, token);
}

async function deliverImage(
  inbound: InboundMessage,
  imageUrl: string,
  token: string | undefined,
) {
  if (inbound.channel === "web") return { ok: true, skipped: false as const };
  return sendImageMessage(inbound.senderId, imageUrl, token);
}

export async function handleInboundMessage(
  inbound: InboundMessage,
): Promise<HandleResult> {
  const channel = inbound.channel || "messenger";
  const tenantId =
    inbound.tenantId || (await resolveTenantIdForPage(inbound.pageId));
  if (!tenantId) {
    console.warn(
      "[pipeline] refusing unmapped page",
      inbound.pageId || "(none)",
    );
    return { handled: false, reason: "unknown_page_unmapped" };
  }

  const pageToken = await resolvePageSendToken(tenantId, inbound.pageId);

  const convo = await upsertConversation({
    tenantId,
    pageId: inbound.pageId || (channel === "web" ? "web_widget" : "unknown"),
    senderId: inbound.senderId,
    channel,
  });

  if (inbound.text || inbound.imageUrl) {
    try {
      await appendMessage({
        tenantId,
        conversationId: convo.id,
        direction: inbound.isEcho ? "outbound" : "inbound",
        text: inbound.text || (inbound.imageUrl ? "[image]" : ""),
        mid: inbound.mid,
        imageUrl: inbound.imageUrl,
      });
    } catch (error) {
      if (inbound.mid && isUniqueMidConflict(error)) {
        return {
          handled: true,
          reason: "duplicate_mid_skipped",
          conversationId: convo.id,
        };
      }
      throw error;
    }
  }

  if (inbound.isEcho) {
    await setHandoff(inbound.senderId, true, tenantId);
    await logOperatorEvent({
      type: "echo_handoff",
      senderId: inbound.senderId,
      pageId: inbound.pageId,
      mid: inbound.mid,
      tenantId,
    });
    return { handled: true, reason: "operator_echo_handoff" };
  }

  const config = await loadBusinessConfig(tenantId);
  if (config.botEnabled === false) {
    return {
      handled: true,
      reason: "bot_disabled",
      conversationId: convo.id,
    };
  }
  const products = await listProducts(tenantId, true);
  const catalog = formatCatalogForPrompt(products);
  const knowledge = await buildKnowledgeBlob(
    tenantId,
    inbound.text || undefined,
  );
  const recBlock = formatRecommendationsForReply(
    getRecommendations(products, { query: inbound.text || "", limit: 4 }),
  );

  if (
    config.handoffEnabled &&
    (await isHandoffActive(inbound.senderId, tenantId))
  ) {
    const handoffText = (inbound.text || "").trim().toLowerCase();
    if (/^\/?(bot on|resume|এআই চালু|ai on)$/i.test(handoffText)) {
      await setHandoff(inbound.senderId, false, tenantId);
      const resume = "AI আবার চালু হয়েছে। কীভাবে সাহায্য করতে পারি?";
      await deliverText(inbound, resume, pageToken);
      await appendMessage({
        tenantId,
        conversationId: convo.id,
        direction: "outbound",
        text: resume,
      });
      return { handled: true, reason: "handoff_cleared" };
    }
    return { handled: true, reason: "handoff_active_skip" };
  }

  const text = (inbound.text || "").trim();

  if (/^\/?(bot on|resume|এআই চালু|ai on)$/i.test(text)) {
    await setHandoff(inbound.senderId, false, tenantId);
  }

  if (text) {
    const esc = evaluateEscalation(text, { rules: config.guardrailRules });
    if (esc.escalate && esc.reason !== "none" && esc.reason !== "complaint") {
      await setHandoff(inbound.senderId, true, tenantId);
      const ack = escalationAck(esc.reason);
      await deliverText(inbound, ack, pageToken);
      await appendMessage({
        tenantId,
        conversationId: convo.id,
        direction: "outbound",
        text: ack,
      });
      return {
        handled: true,
        reason: `escalate_${esc.reason}`,
        replyPreview: ack,
      };
    }
  }

  if (text) {
    const complaint = detectComplaint(text);
    if (complaint.isComplaint) {
      await createComplaint({
        tenantId,
        conversationId: convo.id,
        senderId: inbound.senderId,
        channel,
        text,
        priority: complaint.priority,
        notes: complaint.matched
          ? `Matched: ${complaint.matched}`
          : undefined,
      });
      if (complaint.priority === "urgent" || complaint.priority === "high") {
        await setHandoff(inbound.senderId, true, tenantId);
      }
      const ack = complaintAckReply(complaint.priority);
      await deliverText(inbound, ack, pageToken);
      await appendMessage({
        tenantId,
        conversationId: convo.id,
        direction: "outbound",
        text: ack,
      });
      return {
        handled: true,
        reason: "complaint_detected",
        replyPreview: ack,
      };
    }
  }

  if (inbound.imageUrl && !text) {
    const match = matchProductFromImageHint(products, {
      imageUrl: inbound.imageUrl,
    });
    if (match.product) {
      const reply = formatProductMatchReply(
        match.product,
        match.similar,
        match.confidence,
      );
      await deliverText(inbound, reply, pageToken);
      await appendMessage({
        tenantId,
        conversationId: convo.id,
        direction: "outbound",
        text: reply,
        recognition: {
          productId: match.product.id,
          productName: match.product.name,
          confidence: match.confidence,
          similarIds: match.similar.map((s) => s.id),
          method: match.method,
        },
      });
      return {
        handled: true,
        reason: "product_recognition",
        replyPreview: reply,
      };
    }

    if (getAiApiKey()) {
      if (
        config.handoffEnabled &&
        (await isHandoffActive(inbound.senderId, tenantId))
      ) {
        return { handled: true, reason: "handoff_active_after_ai_skip" };
      }
      const ai = await generateAiReply({
        text: "",
        config,
        imageUrl: inbound.imageUrl,
        catalog,
        knowledge,
        recommendations: recBlock,
        tenantId,
      });
      const groundedVision = validateGroundedReply(ai.text, {
        products,
        trackingNumbers: [],
        knowledge,
        userText: text || "[image]",
      });
      if (
        config.handoffEnabled &&
        (await isHandoffActive(inbound.senderId, tenantId))
      ) {
        return { handled: true, reason: "handoff_active_after_ai_skip" };
      }
      await deliverText(inbound, groundedVision.text, pageToken);
      await appendMessage({
        tenantId,
        conversationId: convo.id,
        direction: "outbound",
        text: groundedVision.text,
        recognition: { method: "vision" },
      });
      return { handled: true, reason: "image_vision", replyPreview: groundedVision.text };
    }
    const stub = acknowledgeImageStub();
    await deliverText(inbound, stub, pageToken);
    await appendMessage({
      tenantId,
      conversationId: convo.id,
      direction: "outbound",
      text: stub,
      recognition: { method: "none" },
    });
    return { handled: true, reason: "image_ack_stub", replyPreview: stub };
  }

  if (!text && !inbound.imageUrl) {
    return { handled: false, reason: "empty" };
  }

  if (wantsOrderTracking(text)) {
    const phoneMatch = text.match(/(?:\+?88)?01[3-9]\d{8}/);
    let order = phoneMatch
      ? (await findOrdersByPhone(tenantId, phoneMatch[0]))[0]
      : null;
    if (!order) {
      order = await findLatestOrderForSender(tenantId, inbound.senderId);
    }
    const reply = order
      ? formatTrackingReply(order)
      : `অর্ডার খুঁজে পাচ্ছি না। ফোন নম্বরসহ আবার লিখুন, অথবা টিম চেক করবে — WhatsApp ${WHATSAPP_DISPLAY}।`;
    await deliverText(inbound, reply, pageToken);
    await appendMessage({
      tenantId,
      conversationId: convo.id,
      direction: "outbound",
      text: reply,
    });
    return { handled: true, reason: "order_tracking", replyPreview: reply };
  }

  const parsed = tryParseOrderFromText(
    text,
    inbound.senderId,
    inbound.pageId,
    tenantId,
  );
  if (parsed) {
    const catalogHit = products.find((p) =>
      parsed.product.toLowerCase().includes(p.name.toLowerCase().slice(0, 8)),
    );
    if (catalogHit && parsed.unitPrice === undefined) {
      parsed.unitPrice = catalogHit.price;
      parsed.product = catalogHit.name;
    }
    const order = await storeOrder(parsed);
    const confirm = [
      `অর্ডার রেকর্ড হয়েছে ✓`,
      `ID: ${order.id.slice(0, 8)}`,
      `Invoice: ${order.invoiceNumber}`,
      `নাম: ${order.name}`,
      `ফোন: ${order.phone}`,
      `প্রোডাক্ট: ${order.product}`,
      `পরিমাণ: ${order.qty || "1"}`,
      `ট্র্যাকিং: ${order.trackingStatus}`,
      "",
      "শীঘ্রই কনফার্ম করা হবে। ধন্যবাদ!",
    ].join("\n");
    await deliverText(inbound, confirm, pageToken);
    await appendMessage({
      tenantId,
      conversationId: convo.id,
      direction: "outbound",
      text: confirm,
    });
    return {
      handled: true,
      reason: "order_captured",
      replyPreview: confirm,
      orderId: order.id,
    };
  }

  if (wantsProductPhoto(text)) {
    const withImage =
      products.find(
        (p) =>
          p.imageUrl && text.toLowerCase().includes(p.name.toLowerCase()),
      ) ||
      products.find((p) => p.imageUrl) ||
      null;
    const imageUrl = withImage?.imageUrl || config.productImageUrl;
    if (imageUrl) {
      await deliverImage(inbound, imageUrl, pageToken);
      const caption = withImage
        ? `${withImage.name} — ৳${withImage.price} (stock ${withImage.stock})। অর্ডার করতে নাম + ফোন লিখুন।`
        : "এই প্রোডাক্টের ছবি। অর্ডার করতে নাম + ফোন + প্রোডাক্ট লিখে পাঠান।";
      await deliverText(inbound, caption, pageToken);
      await appendMessage({
        tenantId,
        conversationId: convo.id,
        direction: "outbound",
        text: caption,
      });
      return { handled: true, reason: "product_image_sent" };
    }
  }

  const named = products.find((p) =>
    text
      .toLowerCase()
      .includes(p.name.toLowerCase().split("—")[0].trim().slice(0, 8)),
  );
  const namedRecs = named
    ? formatRecommendationsForReply(
        getRecommendations(products, { productId: named.id, limit: 3 }),
      )
    : recBlock;

  const latestOrder = await findLatestOrderForSender(tenantId, inbound.senderId);
  const groundingCtx = {
    products,
    trackingNumbers: latestOrder?.trackingNumber
      ? [latestOrder.trackingNumber]
      : [],
    knowledge,
    userText: text,
  };
  const preGround = ungroundedFactualAsk(groundingCtx);
  if (preGround) {
    await setHandoff(inbound.senderId, true, tenantId);
    await deliverText(inbound, preGround, pageToken);
    await appendMessage({
      tenantId,
      conversationId: convo.id,
      direction: "outbound",
      text: preGround,
    });
    return {
      handled: true,
      reason: "ungrounded_refuse",
      replyPreview: preGround,
      conversationId: convo.id,
    };
  }

  const historyRows = await listMessages(tenantId, convo.id, 8);
  const history = historyRows.slice(0, -1).map((m) => ({
    role: (m.direction === "inbound" ? "user" : "assistant") as
      | "user"
      | "assistant",
    content: m.text.slice(0, 500),
  }));

  const ai = await generateAiReply({
    text: inbound.imageUrl
      ? `${text}\n[Customer also attached an image]`
      : text,
    config,
    imageUrl: inbound.imageUrl,
    catalog,
    knowledge,
    recommendations: namedRecs,
    tenantId,
    history,
  });

  // Re-check handoff: a human agent may have taken over (echo event) while
  // the AI reply above was being generated. Don't double-reply.
  if (
    config.handoffEnabled &&
    (await isHandoffActive(inbound.senderId, tenantId))
  ) {
    return { handled: true, reason: "handoff_active_after_ai_skip" };
  }

  const grounded = validateGroundedReply(ai.text, groundingCtx);
  const confidence = grounded.confidence;
  const lowConf = evaluateEscalation(text, {
    confidence,
    rules: config.guardrailRules,
  });
  if (
    (!grounded.ok && grounded.violations.length) ||
    (lowConf.escalate && lowConf.reason === "low_confidence")
  ) {
    await setHandoff(inbound.senderId, true, tenantId);
    const ack = grounded.ok
      ? escalationAck("low_confidence")
      : grounded.text;
    await deliverText(inbound, ack, pageToken);
    await appendMessage({
      tenantId,
      conversationId: convo.id,
      direction: "outbound",
      text: ack,
    });
    return {
      handled: true,
      reason: grounded.ok
        ? "escalate_low_confidence"
        : "ungrounded_after_llm",
      replyPreview: ack,
    };
  }

  if (ai.text === "PRODUCT_IMAGE" && config.productImageUrl) {
    await deliverImage(inbound, config.productImageUrl, pageToken);
    const msg = "প্রোডাক্ট ছবি পাঠালাম। আর কিছু জানতে চান?";
    await deliverText(inbound, msg, pageToken);
    await appendMessage({
      tenantId,
      conversationId: convo.id,
      direction: "outbound",
      text: msg,
    });
    return { handled: true, reason: "product_image_via_rules" };
  }

  const sendResult = await deliverText(inbound, ai.text, pageToken);
  await appendMessage({
    tenantId,
    conversationId: convo.id,
    direction: "outbound",
    text: ai.text,
  });

  if (sendResult.skipped) {
    console.info("[pipeline] Would reply:", ai.text.slice(0, 200));
  }

  return {
    handled: true,
    reason: sendResult.skipped
      ? "reply_skipped_no_token"
      : `reply_${ai.source}`,
    replyPreview: grounded.ok ? grounded.text : ai.text,
    conversationId: convo.id,
  };
}

export function messengerConfigured(): {
  verifyToken: boolean;
  pageToken: boolean;
  appSecret: boolean;
  aiKey: boolean;
  aiProvider: string;
  aiModel: string;
} {
  const ai = aiProviderSummary();
  return {
    verifyToken: Boolean(process.env.META_VERIFY_TOKEN?.trim()),
    pageToken: Boolean(getPageAccessToken()),
    appSecret: Boolean(process.env.META_APP_SECRET?.trim()),
    aiKey: isAiLlmEnabled(),
    aiProvider: ai.provider,
    aiModel: ai.model,
  };
}

export { DEFAULT_TENANT_ID };
