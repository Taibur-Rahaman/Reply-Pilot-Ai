/**
 * One-shot: encrypt plaintext PageConnection.accessToken rows with
 * TOKEN_ENCRYPTION_KEY. Safe to re-run — already-encrypted values are skipped.
 */
import { decryptSecret, encryptSecret, isEncrypted } from "../src/lib/crypto";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  if (!process.env.TOKEN_ENCRYPTION_KEY?.trim()) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required.");
  }
  const pages = await prisma.pageConnection.findMany({
    where: { accessToken: { not: null } },
    select: { id: true, accessToken: true },
  });
  let updated = 0;
  for (const page of pages) {
    const token = page.accessToken;
    if (!token || isEncrypted(token)) continue;
    const roundTrip = decryptSecret(token);
    if (!roundTrip) continue;
    await prisma.pageConnection.update({
      where: { id: page.id },
      data: { accessToken: encryptSecret(roundTrip) },
    });
    updated += 1;
  }
  console.log(`[encrypt-tokens] encrypted ${updated} page token(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
