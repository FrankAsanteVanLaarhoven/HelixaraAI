import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Production security headers + browsing optimizations.
 * Prevents common leakage vectors and enables safe caching of static shells.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const isStatic =
    path.startsWith("/_next/static") ||
    path.startsWith("/icons") ||
    path.endsWith(".svg") ||
    path.endsWith(".png") ||
    path.endsWith(".webmanifest") ||
    path === "/sw.js";

  // —— Security headers (all responses) ——
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), interest-cohort=(), payment=()"
  );
  res.headers.set("X-DNS-Prefetch-Control", "on");
  res.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin"
  );
  res.headers.set("Cross-Origin-Resource-Policy", "same-site");
  // HSTS only meaningful on HTTPS — still set for production deployers
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // Content-Security-Policy — tight default; WebGL/WebRTC need media/blob/ws
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://server.arcgisonline.com",
    "font-src 'self' data:",
    "connect-src 'self' blob: data: https: http://127.0.0.1:* http://localhost:* ws: wss:",
    "media-src 'self' blob: mediastream:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);

  // —— Caching strategy ——
  if (isApi) {
    // APIs: no shared cache (prevent data leakage via CDN/platform caches)
    res.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate, max-age=0"
    );
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Surrogate-Control", "no-store");
    res.headers.set("Vary", "Authorization, Cookie");
  } else if (isStatic) {
    res.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  } else if (path === "/sw.js") {
    res.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    res.headers.set("Service-Worker-Allowed", "/");
  } else {
    // HTML shells: short private cache + revalidate (CDN-friendly for anon shells)
    res.headers.set(
      "Cache-Control",
      "private, max-age=0, must-revalidate"
    );
  }

  // Request id for observability (no PII)
  res.headers.set("X-Helixara-Request-Id", crypto.randomUUID());

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/image|favicon.ico).*)",
  ],
};
