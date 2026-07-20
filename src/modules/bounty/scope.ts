import type { BountyProgram } from "@/modules/bounty/types";

/** Normalize host from URL or domain */
export function hostFromTarget(target: string): string {
  const t = target.trim().toLowerCase();
  try {
    if (t.startsWith("http://") || t.startsWith("https://")) {
      return new URL(t).hostname;
    }
  } catch {
    /* fall through */
  }
  return t.replace(/\/.*$/, "").split(":")[0];
}

export function toHttpsUrl(target: string): string {
  const t = target.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

function matchPattern(host: string, pattern: string): boolean {
  const p = pattern.toLowerCase().trim();
  if (!p) return false;
  if (p.startsWith("*.")) {
    const suffix = p.slice(1); // .example.com
    return host === p.slice(2) || host.endsWith(suffix);
  }
  return host === p || host.endsWith(`.${p}`);
}

export function isInScope(
  program: BountyProgram,
  target: string
): { ok: true; host: string } | { ok: false; reason: string } {
  if (!program.active) {
    return { ok: false, reason: "Program is inactive" };
  }
  if (new Date(program.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "Program ROE/scope expired" };
  }
  if (!program.engagementId || !program.legalBasis) {
    return { ok: false, reason: "Program missing engagementId / legalBasis" };
  }

  const host = hostFromTarget(target);
  if (!host || host.length < 3) {
    return { ok: false, reason: "Invalid target host" };
  }

  for (const o of program.outOfScope) {
    if (matchPattern(host, o)) {
      return { ok: false, reason: `Target matches out-of-scope pattern: ${o}` };
    }
  }

  const allowed = program.inScope.some((s) => matchPattern(host, s));
  if (!allowed) {
    return {
      ok: false,
      reason: `Target ${host} not in program in-scope list. Add it to the program scope under ROE first.`,
    };
  }

  return { ok: true, host };
}
