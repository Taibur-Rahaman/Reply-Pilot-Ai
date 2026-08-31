import {
  hasMinRole,
  requireMinRole,
  type SessionPayload,
} from "@/lib/db/auth";
import type { TeamRole } from "@/lib/db/types";

/**
 * Sales MVP mutation policy.
 *
 * admin 40 / manager 30 — tenant config, catalog, KB, team, Connect, ecommerce
 * moderator 20 / agent 10 — inbox, orders, leads, complaints (ops)
 * Super-admin is email-gated on /api/admin/tenants, not a team role.
 */
export const MIN_ROLE = {
  inbox: "agent",
  orders: "agent",
  leads: "agent",
  complaints: "agent",
  analytics: "agent",
  catalogWrite: "manager",
  knowledgeWrite: "manager",
  configWrite: "manager",
  teamWrite: "manager",
  ecommerceWrite: "manager",
  connectWrite: "manager",
  commentsWrite: "manager",
} as const satisfies Record<string, TeamRole>;

export function denyUnless(
  session: SessionPayload,
  min: TeamRole,
): Response | null {
  return requireMinRole(session, min);
}

export { hasMinRole, requireMinRole };
