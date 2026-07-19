import { NextRequest, NextResponse } from "next/server";
import { CURRENCY_META, getFxRates } from "@/modules/fx/currency";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const base = req.nextUrl.searchParams.get("base") || "USD";
    const rates = await getFxRates(base);
    return NextResponse.json({ ...rates, meta: CURRENCY_META });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fx failed" },
      { status: 502 }
    );
  }
}
