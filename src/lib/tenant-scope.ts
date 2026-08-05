/**
 * Tenant resolution for publicly reachable API routes.
 *
 * Several public endpoints (`/api/webchat`, `/api/bot/reply`, `/api/comments`)
 * used to read `tenantId` straight out of the request body. Nothing checked
 * that the caller was allowed to act as that tenant, which meant an anonymous
 * request could:
 *
 *   - write messages/comments into any tenant's inbox,
 *   - spend any tenant's daily AI budget (targeted cost attack),
 *   - and, worst, make the bot answer using another tenant's private
 *     system prompt, catalog, and knowledge base — i.e. exfiltrate it by
 *     simply asking the model to repeat what it was given.
 *
 * The rule enforced here: you may only address a tenant other than the public
 * default if you hold a session for that tenant.
 */

import { DEFAULT_TENANT_ID } from "./db/types";
import { getSessionFromRequest } from "./db/auth";

/**
 * Resolve which tenant a public request is allowed to act on.
 *
 * - No `tenantId` supplied → the public default tenant.
 * - `tenantId` matching the caller's session → that tenant.
 * - Anything else → the public default tenant (request is silently scoped
 *   down rather than rejected, so existing widgets keep working).
 */
export async function resolvePublicTenantId(
  request: Request,
  requestedTenantId?: string,
): Promise<string> {
  const requested = requestedTenantId?.trim();
  if (!requested || requested === DEFAULT_TENANT_ID) {
    return DEFAULT_TENANT_ID;
  }

  const session = await getSessionFromRequest(request);
  if (session?.tenantId === requested) {
    return requested;
  }

  console.warn(
    `[tenant-scope] rejected cross-tenant request for "${requested}" — falling back to the default tenant.`,
  );
  return DEFAULT_TENANT_ID;
}
