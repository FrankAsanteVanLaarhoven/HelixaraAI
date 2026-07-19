import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runOsint } from "@/lib/osint/collectors";
import { demoOperator, AuthScope } from "@/lib/ethics/guardrails";
import { rememberOsint, listOsints } from "@/lib/store/jobs";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().min(2).max(500),
  enableDarkWeb: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({ reports: listOsints(20) });
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

    const scopes: AuthScope[] = [
      "osint.public",
      "scrape.surface",
      "scrape.deep",
      "mission.read",
      "mission.write",
      "audit.read",
      "geospatial.read",
      "agent.orchestrate",
    ];
    // Dark web only if explicitly requested AND would still need legal token in prod
    if (parsed.data.enableDarkWeb) {
      // Intentionally NOT auto-adding darkweb.authorized — operators must configure ROE
    }

    const operator = demoOperator({ scopes });
    const report = await runOsint(parsed.data.query, operator);
    rememberOsint(report);

    return NextResponse.json(report, {
      status: report.status === "blocked" ? 403 : 200,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "osint failed" },
      { status: 500 }
    );
  }
}
