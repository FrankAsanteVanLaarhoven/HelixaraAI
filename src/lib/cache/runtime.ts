/**
 * In-process runtime cache for scalable API responses.
 * Never cache secrets, elevated sessions, or operator PII.
 */

export type CacheTier = "memory" | "platform";

interface Entry<T> {
  value: T;
  exp: number;
  tags: string[];
}

const store = new Map<string, Entry<unknown>>();
const MAX_KEYS = 500;

/** Keys that must never be cached */
const BLOCKED =
  /(token|password|secret|session|authorization|cookie|elevated|webhook)/i;

export function cacheKey(parts: (string | number | boolean | undefined)[]): string {
  return parts.map((p) => String(p ?? "")).join("::");
}

export function isCacheableKey(key: string): boolean {
  return !BLOCKED.test(key);
}

export function cacheGet<T>(key: string): T | undefined {
  if (!isCacheableKey(key)) return undefined;
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.exp) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet<T>(
  key: string,
  value: T,
  ttlMs: number,
  tags: string[] = []
): void {
  if (!isCacheableKey(key)) return;
  if (store.size >= MAX_KEYS) {
    // drop oldest ~10%
    const keys = [...store.keys()].slice(0, Math.ceil(MAX_KEYS * 0.1));
    for (const k of keys) store.delete(k);
  }
  store.set(key, { value, exp: Date.now() + Math.max(ttlMs, 0), tags });
}

export async function cacheWrap<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  tags: string[] = []
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  cacheSet(key, value, ttlMs, tags);
  return value;
}

export function cacheInvalidateTag(tag: string): number {
  let n = 0;
  for (const [k, e] of store) {
    if (e.tags.includes(tag)) {
      store.delete(k);
      n++;
    }
  }
  return n;
}

export function cacheStats() {
  let live = 0;
  const now = Date.now();
  for (const e of store.values()) {
    if (e.exp > now) live++;
  }
  return {
    tier: "memory" as CacheTier,
    keys: store.size,
    live,
    maxKeys: MAX_KEYS,
    note: "Process-local cache. Pair with CDN for static; APIs use no-store.",
  };
}

/** Platform/CDN cache control helpers for public non-sensitive JSON */
export function platformCacheHeaders(seconds: number, swr = 60) {
  return {
    "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${swr}`,
    "CDN-Cache-Control": `public, s-maxage=${seconds}`,
    "Vercel-CDN-Cache-Control": `public, s-maxage=${seconds}`,
  };
}

export function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    "Surrogate-Control": "no-store",
  };
}
