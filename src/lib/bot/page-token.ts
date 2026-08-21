import { prisma } from "@/lib/db/prisma";
import { decryptSecret } from "@/lib/crypto";

/**
 * Resolve the Graph Page token for this tenant+page.
 * Dual-mode: stored (possibly encrypted) PageConnection token, else env token
 * for operator-managed single-Page pilots. sendTextMessage itself never guesses.
 */
export async function resolvePageSendToken(
  tenantId: string,
  pageId?: string,
): Promise<string | undefined> {
  if (pageId) {
    const page = await prisma.pageConnection.findFirst({
      where: { tenantId, pageId, status: "active" },
      select: { accessToken: true },
    });
    if (page?.accessToken) {
      return decryptSecret(page.accessToken);
    }
  }
  return process.env.META_PAGE_ACCESS_TOKEN?.trim() || undefined;
}
