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
  listProducts,
  resolveTenantIdForPage,
  storeOrder,
  tryParseOrderFromText,
  upsertConversation,
  wantsOrderTracking,
} from "@/lib/db";

export type HandleResult = {
  handled: boolean;
  reason?: string;
  replyPreview?: string;
  orderId?: string;
};

export async function handleInboundMessage(
  inbound: InboundMessage,
): Promise<HandleResult> {
  const tenantId = await resolveTenantIdForPage(inbound.pageId);

  const convo = await upsertConversation({
    tenantId,
    pageId: inbound.pageId || "unknown",
    senderId: inbound.senderId,
    channel: "messenger",
  });

  if (inbound.text || inbound.imageUrl) {
    await appendMessage({
      tenantId,
      conversationId: convo.id,
      direction: inbound.isEcho ? "outbound" : "inbound",
      text: inbound.text || (inbound.imageUrl ? "[image]" : ""),
      mid: inbound.mid,
      imageUrl: inbound.imageUrl,
    });
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
      await sendTextMessage(inbound.senderId, resume);
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
      await sendTextMessage(inbound.senderId, ack);
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
        channel: "messenger",
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
      await sendTextMessage(inbound.senderId, ack);
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
      await sendTextMessage(inbound.senderId, reply);
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
      const ai = await generateAiReply({
        text: "",
        config,
        imageUrl: inbound.imageUrl,
        catalog,
        knowledge,
        recommendations: recBlock,
      });
      await sendTextMessage(inbound.senderId, ai.text);
      await appendMessage({
        tenantId,
        conversationId: convo.id,
        direction: "outbound",
        text: ai.text,
        recognition: { method: "vision" },
      });
      return { handled: true, reason: "image_vision", replyPreview: ai.text };
    }
    const stub = acknowledgeImageStub();
    await sendTextMessage(inbound.senderId, stub);
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
      : "অর্ডার খুঁজে পাচ্ছি না। ফোন নম্বরসহ আবার লিখুন, অথবা টিম চেক করবে — WhatsApp 01810-285559।";
    await sendTextMessage(inbound.senderId, reply);
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
    await sendTextMessage(inbound.senderId, confirm);
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
      await sendImageMessage(inbound.senderId, imageUrl);
      const caption = withImage
        ? `${withImage.name} — ৳${withImage.price} (stock ${withImage.stock})। অর্ডার করতে নাম + ফোন লিখুন।`
        : "এই প্রোডাক্টের ছবি। অর্ডার করতে নাম + ফোন + প্রোডাক্ট লিখে পাঠান।";
      await sendTextMessage(inbound.senderId, caption);
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

  const ai = await generateAiReply({
    text: inbound.imageUrl
      ? `${text}\n[Customer also attached an image]`
      : text,
    config,
    imageUrl: inbound.imageUrl,
    catalog,
    knowledge,
    recommendations: namedRecs,
  });

  const confidence =
    ai.source === "llm" ? 0.85 : ai.source === "rules" ? 0.8 : 0.72;
  const lowConf = evaluateEscalation(text, {
    confidence,
    rules: config.guardrailRules,
  });
  if (lowConf.escalate && lowConf.reason === "low_confidence") {
    await setHandoff(inbound.senderId, true, tenantId);
    const ack = escalationAck("low_confidence");
    await sendTextMessage(inbound.senderId, ack);
    await appendMessage({
      tenantId,
      conversationId: convo.id,
      direction: "outbound",
      text: ack,
    });
    return {
      handled: true,
      reason: "escalate_low_confidence",
      replyPreview: ack,
    };
  }

  if (ai.text === "PRODUCT_IMAGE" && config.productImageUrl) {
    await sendImageMessage(inbound.senderId, config.productImageUrl);
    const msg = "প্রোডাক্ট ছবি পাঠালাম। আর কিছু জানতে চান?";
    await sendTextMessage(inbound.senderId, msg);
    await appendMessage({
      tenantId,
      conversationId: convo.id,
      direction: "outbound",
      text: msg,
    });
    return { handled: true, reason: "product_image_via_rules" };
  }

  const sendResult = await sendTextMessage(inbound.senderId, ai.text);
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
    replyPreview: ai.text,
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
