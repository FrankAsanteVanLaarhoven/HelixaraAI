import { NextRequest, NextResponse } from "next/server";
import { LOCALES, getCatalog } from "@/modules/i18n/locales";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") || "en";
  return NextResponse.json({
    locales: LOCALES,
    locale,
    catalog: getCatalog(locale),
    keys: Object.keys(getCatalog("en")).length,
    note: "Full-site message catalogs — every UI key has a value per locale (fallback to EN).",
  });
}
