import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addBinding,
  createTwin,
  ensureTwinsRuntime,
  getFidelityModel,
  getTwin,
  listSyncLog,
  listTwins,
  removeTwin,
  syncTwin,
  twinsRuntimeStatus,
  updateTwin,
} from "@/modules/twins/runtime";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureTwinsRuntime();
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const twin = await getTwin(id);
    if (!twin) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({
      twin,
      syncLog: listSyncLog(30).filter((s) => s.twinId === id),
      fidelityModel: getFidelityModel(),
    });
  }
  const twins = await listTwins();
  return NextResponse.json({
    twins,
    fidelityModel: getFidelityModel(),
    syncLog: listSyncLog(40),
    runtime: twinsRuntimeStatus(),
  });
}

const createSchema = z.object({
  action: z.literal("create"),
  label: z.string().min(2).max(120),
  kind: z.enum(["soc", "edge", "hub", "ot", "cloud"]).optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  region: z
    .enum(["eu", "na", "apac", "me", "af", "sa", "oc", "global"])
    .optional(),
  fidelity: z.enum(["low", "medium", "high"]).optional(),
  pollIntervalSec: z.number().int().min(5).max(600).optional(),
  tags: z.array(z.string()).optional(),
  bindings: z
    .array(
      z.object({
        kind: z.enum(["cmdb", "cloud", "ot", "agent", "manual"]),
        target: z.string(),
        detail: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  const operator = demoOperator();
  try {
    const json = await req.json();
    const action = json.action as string;

    if (action === "sync") {
      const twin = await syncTwin(String(json.id), "manual");
      if (!twin) return NextResponse.json({ error: "not found" }, { status: 404 });
      await appendAudit({
        operatorId: operator.operatorId,
        action: "twins.sync",
        allowed: true,
        risk: "low",
        severity: "info",
        details: { id: twin.id, health: twin.health, score: twin.score },
      });
      return NextResponse.json({ twin, syncLog: listSyncLog(20) });
    }

    if (action === "sync_all") {
      const twins = await listTwins();
      for (const t of twins) await syncTwin(t.id, "manual");
      return NextResponse.json({
        twins: await listTwins(),
        syncLog: listSyncLog(40),
      });
    }

    if (action === "create") {
      const parsed = createSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const { action: _a, ...rest } = parsed.data;
      const twin = await createTwin(rest);
      return NextResponse.json({ twin });
    }

    if (action === "update") {
      const twin = await updateTwin(String(json.id), {
        label: json.label,
        lat: json.lat,
        lon: json.lon,
        region: json.region,
        fidelity: json.fidelity,
        pollIntervalSec: json.pollIntervalSec,
        tags: json.tags,
        notes: json.notes,
        kind: json.kind,
      });
      if (!twin) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ twin });
    }

    if (action === "bind") {
      const twin = await addBinding(String(json.id), {
        kind: json.kind,
        target: json.target,
        detail: json.detail,
      });
      if (!twin) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ twin });
    }

    if (action === "delete") {
      const ok = await removeTwin(String(json.id));
      return NextResponse.json({ ok });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "twins failed" },
      { status: 500 }
    );
  }
}
