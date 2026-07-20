import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  joinRoom,
  leaveRoom,
  listRooms,
  pollSignals,
  postSignal,
} from "@/modules/live/webrtcSignaling";
import { noStoreHeaders } from "@/lib/cache/runtime";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get("roomId");
  const peerId = req.nextUrl.searchParams.get("peerId");
  const after = req.nextUrl.searchParams.get("after") || undefined;

  if (!roomId || !peerId) {
    return NextResponse.json(
      { rooms: listRooms(), policy: "Authorized live ops rooms only" },
      { headers: noStoreHeaders() }
    );
  }

  const messages = pollSignals(roomId, peerId, after || undefined);
  return NextResponse.json(
    { roomId, peerId, messages },
    { headers: noStoreHeaders() }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const operator = demoOperator();

    if (action === "join") {
      const parsed = z
        .object({ roomId: z.string().min(2).max(80), peerId: z.string().min(2).max(80) })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid" }, { status: 400 });
      }
      const joined = joinRoom(parsed.data.roomId, parsed.data.peerId);
      return NextResponse.json(joined, { headers: noStoreHeaders() });
    }

    if (action === "leave") {
      leaveRoom(String(body.roomId || ""), String(body.peerId || ""));
      return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
    }

    if (action === "offer" || action === "answer" || action === "ice") {
      const parsed = z
        .object({
          roomId: z.string().min(2).max(80),
          peerId: z.string().min(2).max(80),
          to: z.string().optional(),
          sdp: z.unknown().optional(),
          payload: z.unknown().optional(),
        })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid" }, { status: 400 });
      }
      const type =
        action === "offer" ? "offer" : action === "answer" ? "answer" : "ice";
      const payload =
        action === "ice" ? body.payload : body.sdp || body.payload;
      const msg = postSignal({
        roomId: parsed.data.roomId,
        from: parsed.data.peerId,
        to: parsed.data.to,
        type,
        payload,
      });
      if (action === "offer") {
        await appendAudit({
          operatorId: operator.operatorId,
          action: "live.webrtc.offer",
          allowed: true,
          risk: "medium",
          severity: "info",
          details: { roomId: parsed.data.roomId, peerId: parsed.data.peerId },
        });
      }
      // Do not echo full SDP in audit — leakage prevention
      return NextResponse.json(
        { ok: true, id: msg.id, type: msg.type },
        { headers: noStoreHeaders() }
      );
    }

    return NextResponse.json(
      { error: "unknown action", allowed: ["join", "leave", "offer", "answer", "ice"] },
      { status: 400, headers: noStoreHeaders() }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "webrtc failed" },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}
