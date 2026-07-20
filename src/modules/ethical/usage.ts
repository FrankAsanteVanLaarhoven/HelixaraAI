/**
 * Mandatory ethical-hacking usage acceptance for Red Team surfaces.
 * Elevated (owner+superadmin dual-control) unlocks restricted paths.
 */

import {
  BLOCK_TO_CAPABILITY,
  isCapabilityAuthorized,
} from "@/modules/auth/elevated";

export const ETHICAL_USAGE_NOTICE = `
HELIXARA ETHICAL HACKING — AUTHORIZED USE ONLY

By using Red Team labs, kits, ATT&CK plans, purple boards, awareness sims,
or Red/Blue workspaces you confirm:

1. You have written authorization (ROE / SOW / lab charter) for every target.
2. Activity is ethical hacking and defensive security testing only.
3. You will not target systems, people, or networks without permission.
4. High-risk paths stay LOCKED by default and unlock only when BOTH
   verified owner AND superadmin authorize them (dual control):
   • Exploit / payload live lab
   • Live phishing host
   • SMS spoof / send
   • OTA deauth / RF inject
   • Live ATT&CK campaign runner
   • Purple live orchestrate
5. Default mode: training, tabletop, detection engineering, software sim.
6. You accept legal responsibility under applicable law (e.g. CFAA, CMA 1990,
   GDPR/UK DPA) and your organization's policies.

Refuse if you cannot attest. Unauthorized use may be a criminal offence.
Configure tokens: HELIXARA_OWNER_TOKEN, HELIXARA_SUPERADMIN_TOKEN
Admin UI: /console/admin/elevated
`.trim();

/** Fallback copy when elevated not granted */
export const HARD_BLOCKS = {
  exploitLive:
    "Exploit/payload live path is locked. Requires dual-control authorization by verified owner AND superadmin.",
  phishingLive:
    "Live phishing host is locked. Requires dual-control authorization by verified owner AND superadmin.",
  smsSpoof:
    "SMS spoof/send is locked. Requires dual-control authorization by verified owner AND superadmin.",
  rfInject:
    "OTA deauth/RF inject is locked. Requires dual-control authorization by verified owner AND superadmin. Software WIDS sim remains available.",
  unauthorized: "Target must be in-scope under attested ROE.",
} as const;

let accepted = false;
let acceptedAt: string | null = null;
let acceptedBy: string | null = null;

export function isEthicalUsageAccepted(): boolean {
  return accepted;
}

async function elevatedStatus(blockKey: keyof typeof HARD_BLOCKS) {
  const cap = BLOCK_TO_CAPABILITY[blockKey];
  if (!cap) {
    return { allowed: false, message: HARD_BLOCKS[blockKey] };
  }
  const auth = await isCapabilityAuthorized(cap);
  if (auth.authorized) {
    return {
      allowed: true,
      message: `Elevated ${cap} authorized by owner + superadmin until ${auth.grant?.expiresAt || "n/a"}`,
    };
  }
  return {
    allowed: false,
    message: `${HARD_BLOCKS[blockKey]} Unlock at /console/admin/elevated (owner AND superadmin).`,
  };
}

export async function getEthicalUsageState() {
  const elevated = {
    exploitLive: await elevatedStatus("exploitLive"),
    phishingLive: await elevatedStatus("phishingLive"),
    smsSpoof: await elevatedStatus("smsSpoof"),
    rfInject: await elevatedStatus("rfInject"),
  };
  return {
    accepted,
    acceptedAt,
    acceptedBy,
    notice: ETHICAL_USAGE_NOTICE,
    hardBlocks: HARD_BLOCKS,
    elevated,
    mode: "ethical-hacking-with-elevated-dual-control" as const,
    adminPath: "/console/admin/elevated",
  };
}

export function acceptEthicalUsage(input: {
  operatorId: string;
  confirmText: string;
}): { ok: true; acceptedAt: string } | { ok: false; reason: string } {
  const expected = "I ACCEPT ETHICAL HACKING ONLY";
  if (input.confirmText.trim().toUpperCase() !== expected) {
    return {
      ok: false,
      reason: `Type exactly: ${expected}`,
    };
  }
  if (!input.operatorId.trim()) {
    return { ok: false, reason: "operatorId required" };
  }
  accepted = true;
  acceptedAt = new Date().toISOString();
  acceptedBy = input.operatorId.trim();
  return { ok: true, acceptedAt };
}

export function requireEthicalUsage():
  | { ok: true }
  | { ok: false; reason: string; notice: string } {
  if (!accepted) {
    return {
      ok: false,
      reason: "Accept ethical hacking usage notice first",
      notice: ETHICAL_USAGE_NOTICE,
    };
  }
  return { ok: true };
}
