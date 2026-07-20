"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Phone, PhoneOff, Video } from "lucide-react";
import { WebGLVideoView } from "@/components/live/WebGLVideoView";

/**
 * Authorized WebRTC live room with WebGL rendering.
 * Uses Helixara signaling API; media is peer-to-peer (no server media store).
 */
export function WebRTCLiveRoom({
  defaultRoom = "ops-live",
}: {
  defaultRoom?: string;
}) {
  const [roomId, setRoomId] = useState(defaultRoom);
  const [peerId] = useState(
    () => `peer-${Math.random().toString(36).slice(2, 10)}`
  );
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const lastSignalId = useRef<string | undefined>(undefined);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
  }, [localStream]);

  useEffect(() => () => cleanup(), [cleanup]);

  async function postSignal(body: Record<string, unknown>) {
    const res = await fetch("/api/v1/live/webrtc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return res.json();
  }

  function createPc() {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (stream) setRemoteStream(stream);
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        postSignal({
          action: "ice",
          roomId,
          peerId,
          payload: ev.candidate.toJSON(),
        }).catch(() => undefined);
      }
    };
    pc.onconnectionstatechange = () => {
      setStatus(pc.connectionState);
    };
    pcRef.current = pc;
    return pc;
  }

  async function startMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setLocalStream(stream);
      setDemoMode(false);
      return stream;
    } catch {
      // Demo canvas stream if camera denied — still exercises WebGL path
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d")!;
      let t = 0;
      const tick = () => {
        t += 1;
        ctx.fillStyle = "#05080f";
        ctx.fillRect(0, 0, 640, 360);
        ctx.strokeStyle = "#2ee6ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < 640; x += 4) {
          const y = 180 + Math.sin((x + t * 3) / 40) * 60;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = "#3dff9a";
        ctx.font = "14px monospace";
        ctx.fillText("HELIXARA LIVE DEMO · NO CAMERA", 24, 40);
        requestAnimationFrame(tick);
      };
      tick();
      const stream = canvas.captureStream(30);
      setLocalStream(stream);
      setDemoMode(true);
      return stream;
    }
  }

  async function poll() {
    try {
      const q = new URLSearchParams({
        roomId,
        peerId,
        ...(lastSignalId.current ? { after: lastSignalId.current } : {}),
      });
      const res = await fetch(`/api/v1/live/webrtc?${q}`, { cache: "no-store" });
      const data = await res.json();
      const msgs = data.messages || [];
      const pc = pcRef.current;
      for (const m of msgs) {
        lastSignalId.current = m.id;
        if (!pc) continue;
        if (m.type === "offer" && m.payload) {
          await pc.setRemoteDescription(m.payload);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await postSignal({
            action: "answer",
            roomId,
            peerId,
            to: m.from,
            sdp: answer,
          });
        } else if (m.type === "answer" && m.payload) {
          if (pc.signalingState !== "stable") {
            await pc.setRemoteDescription(m.payload);
          }
        } else if (m.type === "ice" && m.payload) {
          try {
            await pc.addIceCandidate(m.payload);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "poll failed");
    }
  }

  async function startHost() {
    setError("");
    setStatus("starting");
    cleanup();
    const stream = await startMedia();
    const pc = createPc();
    stream.getTracks().forEach((tr) => pc.addTrack(tr, stream));
    await postSignal({ action: "join", roomId, peerId });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await postSignal({ action: "offer", roomId, peerId, sdp: offer });
    pollTimer.current = setInterval(poll, 1200);
    setStatus("hosting");
  }

  async function startJoin() {
    setError("");
    setStatus("joining");
    cleanup();
    const stream = await startMedia();
    const pc = createPc();
    stream.getTracks().forEach((tr) => pc.addTrack(tr, stream));
    await postSignal({ action: "join", roomId, peerId });
    pollTimer.current = setInterval(poll, 1200);
    setStatus("joined");
  }

  async function hangup() {
    await postSignal({ action: "leave", roomId, peerId }).catch(() => undefined);
    cleanup();
    setStatus("idle");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
            Room (authorized ops)
          </label>
          <input
            className="lm-input font-mono"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={status !== "idle"}
          />
        </div>
        <button className="lm-btn" disabled={status !== "idle"} onClick={startHost}>
          <Video className="h-4 w-4" />
          Host stream
        </button>
        <button className="lm-btn" disabled={status !== "idle"} onClick={startJoin}>
          <Phone className="h-4 w-4" />
          Join
        </button>
        <button className="lm-btn opacity-80" disabled={status === "idle"} onClick={hangup}>
          <PhoneOff className="h-4 w-4" />
          End
        </button>
        <span className="lm-badge lm-badge-live">{status}</span>
        {demoMode ? <span className="lm-badge lm-badge-warn">demo canvas</span> : null}
      </div>
      {error ? <div className="text-sm text-rose-300">{error}</div> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="lm-panel h-[300px] overflow-hidden rounded-lg">
          {localStream ? (
            <WebGLVideoView stream={localStream} mirror label="LOCAL" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--lm-muted)]">
              Local WebGL view
            </div>
          )}
        </div>
        <div className="lm-panel h-[300px] overflow-hidden rounded-lg">
          {remoteStream ? (
            <WebGLVideoView stream={remoteStream} label="REMOTE · WEBRTC" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-[var(--lm-muted)]">
              {status !== "idle" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Waiting for peer…
                </>
              ) : (
                "Remote WebRTC · WebGL"
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-[var(--lm-muted)]">
        Peer id <span className="font-mono text-cyan-200">{peerId}</span> · Media is
        P2P; signaling only. APIs use no-store. Camera optional (demo canvas fallback).
      </p>
    </div>
  );
}
