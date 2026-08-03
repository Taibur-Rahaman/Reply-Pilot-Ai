import { newId, toIso } from "./ids";
import { prisma } from "./prisma";
import type { AuditLog } from "./types";
import type { Prisma } from "@prisma/client";

export async function writeAuditLog(input: {
  tenantId: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}): Promise<AuditLog> {
  const row = await prisma.auditLog.create({
    data: {
      id: newId("audit"),
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      meta: (input.meta as Prisma.InputJsonValue) ?? undefined,
    },
  });
  return {
    id: row.id,
    tenantId: row.tenantId,
    actorId: row.actorId || undefined,
    actorEmail: row.actorEmail || undefined,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId || undefined,
    meta: (row.meta as Record<string, unknown>) || undefined,
    createdAt: toIso(row.createdAt),
  };
}

export async function listAuditLogs(
  tenantId: string,
  limit = 50,
): Promise<AuditLog[]> {
  const rows = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    actorId: row.actorId || undefined,
    actorEmail: row.actorEmail || undefined,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId || undefined,
    meta: (row.meta as Record<string, unknown>) || undefined,
    createdAt: toIso(row.createdAt),
  }));
}
