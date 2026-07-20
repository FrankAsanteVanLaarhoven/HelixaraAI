/**
 * HelixaraAI browser / Node SDK
 * Typed client for production integrations. Never stores API secrets in localStorage.
 */

export type HelixaraClientOptions = {
  baseUrl?: string;
  /** Optional bearer for future auth — keep in memory only */
  getToken?: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
  /** Default timeout ms */
  timeoutMs?: number;
};

export class HelixaraError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "HelixaraError";
  }
}

export class HelixaraClient {
  readonly baseUrl: string;
  private getToken?: HelixaraClientOptions["getToken"];
  private fetchImpl: typeof fetch;
  private timeoutMs: number;

  constructor(opts: HelixaraClientOptions = {}) {
    this.baseUrl = (opts.baseUrl || "").replace(/\/$/, "");
    this.getToken = opts.getToken;
    this.fetchImpl = opts.fetchImpl || fetch.bind(globalThis);
    this.timeoutMs = opts.timeoutMs ?? 60_000;
  }

  private async headers(extra?: HeadersInit): Promise<Headers> {
    const h = new Headers(extra);
    h.set("Accept", "application/json");
    if (!h.has("Content-Type")) h.set("Content-Type", "application/json");
    const token = this.getToken ? await this.getToken() : null;
    if (token) h.set("Authorization", `Bearer ${token}`);
    return h;
  }

  async request<T>(
    path: string,
    init: RequestInit & { timeoutMs?: number } = {}
  ): Promise<T> {
    const ctrl = new AbortController();
    const t = setTimeout(
      () => ctrl.abort(),
      init.timeoutMs ?? this.timeoutMs
    );
    try {
      const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: await this.headers(init.headers),
        signal: init.signal || ctrl.signal,
        credentials: "same-origin",
        cache: "no-store",
      });
      const text = await res.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      if (!res.ok) {
        throw new HelixaraError(
          `HTTP ${res.status}`,
          res.status,
          body
        );
      }
      return body as T;
    } finally {
      clearTimeout(t);
    }
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  // —— High-level helpers ——
  health() {
    return this.get<{ status: string; service: string }>("/api/v1/health");
  }

  capabilities() {
    return this.get<Record<string, unknown>>("/api/v1/capabilities");
  }

  bountyDiscover(programId: string) {
    return this.post("/api/v1/bounty", { action: "discover", programId });
  }

  bountyScanAll(programId: string, opts?: { onlyLive?: boolean }) {
    return this.post("/api/v1/bounty", {
      action: "scan.all",
      programId,
      rediscover: true,
      ...opts,
    });
  }

  telemetryLive() {
    return this.get<Record<string, unknown>>("/api/v1/telemetry?live=1");
  }

  geospatial() {
    return this.get<Record<string, unknown>>("/api/v1/geospatial");
  }

  webrtcOffer(roomId: string, sdp: RTCSessionDescriptionInit, peerId: string) {
    return this.post("/api/v1/live/webrtc", {
      action: "offer",
      roomId,
      peerId,
      sdp,
    });
  }

  webrtcAnswer(roomId: string, sdp: RTCSessionDescriptionInit, peerId: string) {
    return this.post("/api/v1/live/webrtc", {
      action: "answer",
      roomId,
      peerId,
      sdp,
    });
  }

  webrtcPoll(roomId: string, peerId: string) {
    return this.get<Record<string, unknown>>(
      `/api/v1/live/webrtc?roomId=${encodeURIComponent(roomId)}&peerId=${encodeURIComponent(peerId)}`
    );
  }

  cacheStats() {
    return this.get<Record<string, unknown>>("/api/v1/platform/cache");
  }
}

/** Singleton browser helper (no secret persistence) */
let browserClient: HelixaraClient | null = null;

export function getHelixaraClient(opts?: HelixaraClientOptions): HelixaraClient {
  if (typeof window === "undefined") {
    return new HelixaraClient(opts);
  }
  if (!browserClient) {
    browserClient = new HelixaraClient({
      baseUrl: "",
      ...opts,
    });
  }
  return browserClient;
}

export default HelixaraClient;
