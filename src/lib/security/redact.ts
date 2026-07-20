/**
 * Data-leakage prevention helpers — redact secrets before logs/events/exports.
 */

const SECRET_KEY =
  /^(authorization|cookie|set-cookie|token|password|secret|api[_-]?key|private[_-]?key|session|jwt|bearer)$/i;

const SECRET_VALUE =
  /\b(sk-[a-zA-Z0-9]{10,}|Bearer\s+[A-Za-z0-9._\-]+|eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)/g;

export function redactString(s: string): string {
  return s.replace(SECRET_VALUE, "[REDACTED]");
}

export function redactDeep<T>(input: T, depth = 0): T {
  if (depth > 8) return input;
  if (input == null) return input;
  if (typeof input === "string") return redactString(input) as T;
  if (Array.isArray(input)) {
    return input.map((v) => redactDeep(v, depth + 1)) as T;
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (SECRET_KEY.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redactDeep(v, depth + 1);
      }
    }
    return out as T;
  }
  return input;
}

export function safeJsonForClient<T extends object>(
  data: T,
  opts?: { stripKeys?: string[] }
): T {
  const stripped = { ...data } as Record<string, unknown>;
  for (const k of opts?.stripKeys || []) {
    delete stripped[k];
  }
  return redactDeep(stripped) as T;
}
