/**
 * In-memory WebRTC signaling for authorized live ops views.
 * Ephemeral SDP exchange only — no media relay of sensitive payloads.
 */

import { uid } from "@/lib/utils";

export type SignalMessage = {
  id: string;
  roomId: string;
  from: string;
  to?: string;
  type: "offer" | "answer" | "ice" | "leave";
  payload: unknown;
  ts: string;
};

interface Room {
  id: string;
  createdAt: number;
  peers: Set<string>;
  messages: SignalMessage[];
}

const rooms = new Map<string, Room>();
const ROOM_TTL_MS = 30 * 60_000;
const MAX_MSG = 80;

function prune() {
  const now = Date.now();
  for (const [id, r] of rooms) {
    if (now - r.createdAt > ROOM_TTL_MS) rooms.delete(id);
  }
}

function getRoom(roomId: string): Room {
  prune();
  let r = rooms.get(roomId);
  if (!r) {
    r = {
      id: roomId,
      createdAt: Date.now(),
      peers: new Set(),
      messages: [],
    };
    rooms.set(roomId, r);
  }
  return r;
}

export function listRooms() {
  prune();
  return [...rooms.values()].map((r) => ({
    id: r.id,
    peers: [...r.peers],
    messages: r.messages.length,
    ageMs: Date.now() - r.createdAt,
  }));
}

export function joinRoom(roomId: string, peerId: string) {
  const r = getRoom(roomId);
  r.peers.add(peerId);
  return { roomId, peerId, peers: [...r.peers] };
}

export function postSignal(input: {
  roomId: string;
  from: string;
  to?: string;
  type: SignalMessage["type"];
  payload: unknown;
}): SignalMessage {
  const r = getRoom(input.roomId);
  r.peers.add(input.from);
  const msg: SignalMessage = {
    id: uid("sig"),
    roomId: input.roomId,
    from: input.from,
    to: input.to,
    type: input.type,
    // Never log raw SDP to disk; keep in memory only
    payload: input.payload,
    ts: new Date().toISOString(),
  };
  r.messages.push(msg);
  if (r.messages.length > MAX_MSG) {
    r.messages = r.messages.slice(-MAX_MSG);
  }
  return msg;
}

export function pollSignals(
  roomId: string,
  peerId: string,
  afterId?: string
): SignalMessage[] {
  const r = rooms.get(roomId);
  if (!r) return [];
  r.peers.add(peerId);
  let msgs = r.messages.filter(
    (m) => m.from !== peerId && (!m.to || m.to === peerId)
  );
  if (afterId) {
    const idx = msgs.findIndex((m) => m.id === afterId);
    msgs = idx >= 0 ? msgs.slice(idx + 1) : msgs;
  }
  return msgs;
}

export function leaveRoom(roomId: string, peerId: string) {
  const r = rooms.get(roomId);
  if (!r) return;
  r.peers.delete(peerId);
  postSignal({ roomId, from: peerId, type: "leave", payload: {} });
  if (!r.peers.size) rooms.delete(roomId);
}
