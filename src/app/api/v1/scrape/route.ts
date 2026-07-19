import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scrapeUrl } from "@/lib/crawl/engine";
import { demoOperator } from "@/lib/ethics/guardrails";
import { rememberScrape, listScrapes } from "@/lib/store/jobs";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  url: z.string().url(),
  deep: z.boolean().optional(),
  tier: z.enum(["standard", "elevated", "sovereign"]).optional(),
  respectRobots: z.boolean().optional(),
  maxLinks: z.number().int().min(0).max(20).optional(),
});

export async function GET() {
  return NextResponse.json({ jobs: listScrapes(20) });
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const operator = demoOperator();
    const result = await scrapeUrl(parsed.data, operator);
    rememberScrape(result);

    return NextResponse.json(result, {
      status: result.status === "blocked" ? 403 : result.status === "error" ? 502 : 200,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "scrape failed" },
      { status: 500 }
    );
  }
}
