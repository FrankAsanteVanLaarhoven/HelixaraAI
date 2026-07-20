/**
 * Mandatory ethical-hacking usage acceptance for expanded Red Team surfaces.
 * Live weaponization (real exploits, SMS spoof, OTA deauth, live phishing) stays off.
 */

export const ETHICAL_USAGE_NOTICE = `
HELIXARA ETHICAL HACKING — AUTHORIZED USE ONLY

By using Red Team labs, kits, ATT&CK plans, purple boards, awareness sims,
or Red/Blue workspaces you confirm:

1. You have written authorization (ROE / SOW / lab charter) for every target.
2. Activity is ethical hacking and defensive security testing only.
3. You will not target systems, people, or networks without permission.
4. Live weaponization is disabled in this product:
   • No exploit / shellcode generation for real-world use
   • No live phishing sites or credential harvest against real users
   • No SMS / caller-ID spoofing or message injection
   • No OTA deauth, jamming, or RF frame injection
5. Kits, campaigns, and sims are for training, tabletop, detection engineering,
   and authorized lab software simulation under ROE.
6. You accept legal responsibility under applicable law (e.g. CFAA, CMA 1990,
   GDPR/UK DPA) and your organization's policies.

Refuse if you cannot attest. Unauthorized use may be a criminal offence.
`.trim();

export const HARD_BLOCKS = {
  exploitLive: "Live exploit/payload generation is permanently disabled. Use CVE awareness + remediation kits only.",
  phishingLive: "Live phishing hosting and credential capture are permanently disabled. Use SIMULATION templates only.",
  smsSpoof: "SMS spoof / sender-ID spoof / smishing send is permanently disabled. Awareness previews only.",
  rfInject: "OTA deauth / RF inject / jamming is permanently disabled. Software lab simulation for WIDS training only.",
  unauthorized: "Target must be in-scope under attested ROE.",
} as const;

let accepted = false;
let acceptedAt: string | null = null;
let acceptedBy: string | null = null;

export function isEthicalUsageAccepted(): boolean {
  return accepted;
}

export function getEthicalUsageState() {
  return {
    accepted,
    acceptedAt,
    acceptedBy,
    notice: ETHICAL_USAGE_NOTICE,
    hardBlocks: HARD_BLOCKS,
    mode: "ethical-hacking-only" as const,
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
