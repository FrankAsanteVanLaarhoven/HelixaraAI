import { NextResponse } from "next/server";
import { getNewsAndAlerts } from "@/modules/news/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getNewsAndAlerts();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "news failed" },
      { status: 502 }
    );
  }
}
