/**
 * Unified gate: ethical usage + elevated dual-control for restricted paths.
 */

import {
  isCapabilityAuthorized,
  type ElevatedCapabilityId,
  BLOCK_TO_CAPABILITY,
} from "@/modules/auth/elevated";
import { HARD_BLOCKS, requireEthicalUsage } from "@/modules/ethical/usage";

export async function requireElevatedCapability(
  capability: ElevatedCapabilityId
): Promise<
  | { ok: true; grantEngagementId?: string }
  | { ok: false; reason: string; code: "usage" | "elevated" }
> {
  const usage = requireEthicalUsage();
  if (!usage.ok) {
    return { ok: false, reason: usage.reason, code: "usage" };
  }
  const auth = await isCapabilityAuthorized(capability);
  if (!auth.authorized) {
    return {
      ok: false,
      reason: `${auth.reason} (capability: ${capability})`,
      code: "elevated",
    };
  }
  return {
    ok: true,
    grantEngagementId: auth.grant?.engagementId,
  };
}

export async function elevatedOrMessage(
  blockKey: keyof typeof HARD_BLOCKS
): Promise<{ allowed: boolean; message: string }> {
  const cap = BLOCK_TO_CAPABILITY[blockKey];
  if (!cap) {
    return { allowed: false, message: HARD_BLOCKS[blockKey] };
  }
  const auth = await isCapabilityAuthorized(cap);
  if (auth.authorized) {
    return {
      allowed: true,
      message: `Elevated capability ${cap} authorized by owner + superadmin until ${auth.grant?.expiresAt || "n/a"} · engagement ${auth.grant?.engagementId || "n/a"}`,
    };
  }
  return {
    allowed: false,
    message: `${HARD_BLOCKS[blockKey]} — Unlock only via dual-control: verified owner AND superadmin at /console/admin/elevated.`,
  };
}
