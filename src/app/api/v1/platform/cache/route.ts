import { NextResponse } from "next/server";
import { cacheStats, noStoreHeaders } from "@/lib/cache/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      runtime: cacheStats(),
      policy: {
        api: "private, no-store — never CDN-cache operator/API data",
        static: "public immutable for /_next/static and icons",
        sw: "shell-only; /api/* never cached in service worker",
        leakage: "tokens/secrets blocked from runtime cache keys",
      },
    },
    { headers: noStoreHeaders() }
  );
}
