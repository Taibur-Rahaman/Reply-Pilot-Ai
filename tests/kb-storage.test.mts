import "./load-env.mts";
/**
 * Durable KB bytes live in Postgres (`KbDocument.fileContent`).
 * Disk under data/uploads is cache only.
 */
import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { after, describe, it } from "node:test";

const hasDb = Boolean(process.env.DATABASE_URL?.trim());

describe("KB storage (postgres)", { skip: !hasDb }, () => {
  it("persists original bytes, extracts text, chunks, and retrieves without disk", async () => {
    const { prisma } = await import("../src/lib/db/prisma");
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new Error(
        "PostgreSQL is required for KB storage verification and was not reachable",
      );
    }

    const { DATA_DIR } = await import("../src/lib/db/ids");
    const { storeKbUpload, retrieveKnowledge } =
      await import("../src/lib/db");

    const tenantId = `kb_iso_${Date.now()}`;
    await prisma.tenant.create({
      data: { id: tenantId, name: "KB", slug: tenantId },
    });

    const marker = `KB_BYTE_MARKER_${tenantId}`;
    const payload = Buffer.from(
      `Return policy: ${marker}. Store credit within 7 days.\n`,
      "utf8",
    );

    try {
      const doc = await storeKbUpload({
        tenantId,
        filename: "policy.txt",
        mimeType: "text/plain",
        buffer: payload,
      });

      const row = await prisma.kbDocument.findFirst({
        where: { id: doc.id, tenantId },
        select: { fileContent: true, extractedText: true, storagePath: true },
      });
      assert.ok(row);
      assert.ok(row.fileContent);
      assert.equal(Buffer.from(row.fileContent).equals(payload), true);
      assert.equal(row.extractedText.includes(marker), true);

      const chunks = await prisma.kbChunk.findMany({
        where: { tenantId, documentId: doc.id },
      });
      assert.ok(chunks.length >= 1);
      assert.equal(chunks.some((c) => c.content.includes(marker)), true);

      if (row.storagePath) {
        await unlink(path.join(DATA_DIR, row.storagePath)).catch(() => undefined);
      }

      const retrieved = await retrieveKnowledge(tenantId, marker, 5);
      assert.equal(retrieved.includes(marker), true);

      const still = await prisma.kbDocument.findFirst({
        where: { id: doc.id, tenantId },
        select: { fileContent: true },
      });
      assert.ok(still?.fileContent);
      assert.equal(Buffer.from(still.fileContent).equals(payload), true);
    } finally {
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
  });
});

after(async () => {
  if (!hasDb) return;
  const { prisma } = await import("../src/lib/db/prisma");
  await prisma.$disconnect();
});
