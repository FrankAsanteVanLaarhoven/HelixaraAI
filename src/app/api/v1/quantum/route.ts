import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  quantumCapabilityReport,
  runQuantumHybrid,
} from "@/modules/quantum/hybrid";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  problem: z.enum([
    "crawl_path",
    "threat_clustering",
    "anomaly_weights",
    "tsp_recon",
  ]),
  nodes: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
});

export async function GET() {
  return NextResponse.json(quantumCapabilityReport());
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
    const job = await runQuantumHybrid(parsed.data);
    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "quantum failed" },
      { status: 500 }
    );
  }
}
