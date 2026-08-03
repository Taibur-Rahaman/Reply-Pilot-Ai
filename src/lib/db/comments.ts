import { newId, toIso } from "./ids";
import { prisma } from "./prisma";
import type { CommentEvent, CommentSettings } from "./types";
import { defaultCommentSettings } from "./defaults";
import { storeLead } from "./leads";

function mapSettings(row: {
  tenantId: string;
  autoReplyEnabled: boolean;
  autoReplyText: string;
  spamKeywords: unknown;
  leadCaptureEnabled: boolean;
  updatedAt: Date;
}): CommentSettings {
  return {
    tenantId: row.tenantId,
    autoReplyEnabled: row.autoReplyEnabled,
    autoReplyText: row.autoReplyText,
    spamKeywords: Array.isArray(row.spamKeywords)
      ? row.spamKeywords.map(String)
      : [],
    leadCaptureEnabled: row.leadCaptureEnabled,
    updatedAt: toIso(row.updatedAt),
  };
}

export async function getCommentSettings(
  tenantId: string,
): Promise<CommentSettings> {
  let row = await prisma.commentSettings.findUnique({ where: { tenantId } });
  if (!row) {
    const d = defaultCommentSettings(tenantId);
    row = await prisma.commentSettings.create({
      data: {
        tenantId,
        autoReplyEnabled: d.autoReplyEnabled,
        autoReplyText: d.autoReplyText,
        spamKeywords: d.spamKeywords,
        leadCaptureEnabled: d.leadCaptureEnabled,
      },
    });
  }
  return mapSettings(row);
}

export async function saveCommentSettings(
  tenantId: string,
  patch: Partial<
    Pick<
      CommentSettings,
      | "autoReplyEnabled"
      | "autoReplyText"
      | "spamKeywords"
      | "leadCaptureEnabled"
    >
  >,
): Promise<CommentSettings> {
  const current = await getCommentSettings(tenantId);
  const row = await prisma.commentSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      autoReplyEnabled:
        typeof patch.autoReplyEnabled === "boolean"
          ? patch.autoReplyEnabled
          : current.autoReplyEnabled,
      autoReplyText:
        typeof patch.autoReplyText === "string"
          ? patch.autoReplyText
          : current.autoReplyText,
      spamKeywords: Array.isArray(patch.spamKeywords)
        ? patch.spamKeywords.map(String)
        : current.spamKeywords,
      leadCaptureEnabled:
        typeof patch.leadCaptureEnabled === "boolean"
          ? patch.leadCaptureEnabled
          : current.leadCaptureEnabled,
    },
    update: {
      ...(typeof patch.autoReplyEnabled === "boolean"
        ? { autoReplyEnabled: patch.autoReplyEnabled }
        : {}),
      ...(typeof patch.autoReplyText === "string"
        ? { autoReplyText: patch.autoReplyText }
        : {}),
      ...(Array.isArray(patch.spamKeywords)
        ? { spamKeywords: patch.spamKeywords.map(String) }
        : {}),
      ...(typeof patch.leadCaptureEnabled === "boolean"
        ? { leadCaptureEnabled: patch.leadCaptureEnabled }
        : {}),
    },
  });
  return mapSettings(row);
}

export function isSpamComment(
  text: string,
  keywords: string[],
): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => k.trim() && lower.includes(k.toLowerCase()));
}

export async function listCommentEvents(
  tenantId: string,
): Promise<CommentEvent[]> {
  const rows = await prisma.commentEvent.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((e) => ({
    id: e.id,
    tenantId: e.tenantId,
    commentId: e.commentId,
    postId: e.postId || undefined,
    authorName: e.authorName || undefined,
    text: e.text,
    isSpam: e.isSpam,
    spamAction: (e.spamAction as CommentEvent["spamAction"]) || undefined,
    autoReplied: e.autoReplied,
    replyText: e.replyText || undefined,
    leadId: e.leadId || undefined,
    createdAt: toIso(e.createdAt),
  }));
}

export type ProcessCommentResult = {
  event: CommentEvent;
  spam: boolean;
  autoReplied: boolean;
  leadId?: string;
};

export async function processComment(input: {
  tenantId: string;
  text: string;
  authorName?: string;
  commentId?: string;
  postId?: string;
  phone?: string;
}): Promise<ProcessCommentResult> {
  const settings = await getCommentSettings(input.tenantId);
  const spam = isSpamComment(input.text, settings.spamKeywords);
  let leadId: string | undefined;
  let autoReplied = false;
  let replyText: string | undefined;

  if (
    !spam &&
    settings.leadCaptureEnabled &&
    (input.phone || /01[3-9]\d{8}/.test(input.text))
  ) {
    const phoneMatch = input.text.match(/(?:\+?88)?01[3-9]\d{8}/);
    const phone = input.phone || phoneMatch?.[0] || "00000000000";
    const lead = await storeLead({
      tenantId: input.tenantId,
      name: input.authorName || "Facebook commenter",
      phone,
      businessType: "facebook-comment",
      interest: "comment-lead",
      source: "facebook_comment",
      notes: input.text.slice(0, 400),
    });
    leadId = lead.id;
  }

  if (!spam && settings.autoReplyEnabled && settings.autoReplyText) {
    autoReplied = true;
    replyText = settings.autoReplyText;
  }

  const event = await prisma.commentEvent.create({
    data: {
      id: newId("cmt"),
      tenantId: input.tenantId,
      commentId: input.commentId || newId("fb_cmt"),
      postId: input.postId,
      authorName: input.authorName,
      text: input.text.slice(0, 1000),
      isSpam: spam,
      spamAction: spam ? "flagged" : undefined,
      autoReplied,
      replyText,
      leadId,
    },
  });

  return {
    event: {
      id: event.id,
      tenantId: event.tenantId,
      commentId: event.commentId,
      postId: event.postId || undefined,
      authorName: event.authorName || undefined,
      text: event.text,
      isSpam: event.isSpam,
      spamAction: (event.spamAction as CommentEvent["spamAction"]) || undefined,
      autoReplied: event.autoReplied,
      replyText: event.replyText || undefined,
      leadId: event.leadId || undefined,
      createdAt: toIso(event.createdAt),
    },
    spam,
    autoReplied,
    leadId,
  };
}
