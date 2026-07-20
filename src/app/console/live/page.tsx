"use client";

import { useEffect, useState } from "react";
import { WebRTCLiveRoom } from "@/components/live/WebRTCLiveRoom";
import { WebGLVideoView } from "@/components/live/WebGLVideoView";
import { getHelixaraClient } from "@/sdk";
import { Radio, Shield } from "lucide-react";

export default function LivePage() {
  const [cache, setCache] = useState<Record<string, unknown> | null>(null);
  const [demoSrc, setDemoSrc] = useState<string | null>(null);

  useEffect(() => {
    getHelixaraClient()
      .cacheStats()
      .then(setCache)
      .catch(() => setCache(null));

    // Optional demo: silent WebGL path with empty until user hosts
    setDemoSrc(null);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Live
        </div>
        <h1 className="text-2xl font-semibold">WebRTC · WebGL live views</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--lm-muted)]">
          Production live path: peer WebRTC media, WebGL presentation, P2P (no
          server media store). Signaling is no-store. Authorized ops rooms only.
        </p>
      </div>

      <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
        <div className="flex items-center gap-2 font-medium">
          <Shield className="h-3.5 w-3.5" />
          Security
        </div>
        Media is peer-to-peer. Service worker never caches /api. Elevated tokens
        stay out of SW/CDN. Use only for authorized collaboration streams.
      </div>

      <div className="lm-panel rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
          <Radio className="h-3.5 w-3.5" />
          Live room
        </div>
        <WebRTCLiveRoom defaultRoom="helixara-ops" />
      </div>

      {demoSrc ? (
        <div className="lm-panel h-[240px] overflow-hidden rounded-lg">
          <WebGLVideoView src={demoSrc} label="FILE · WEBGL" />
        </div>
      ) : null}

      <div className="lm-panel rounded-lg p-4 text-[12px] text-[var(--lm-muted)]">
        <div className="mb-1 text-[11px] uppercase tracking-wider">
          Platform cache
        </div>
        <pre className="overflow-auto font-mono text-[11px]">
          {cache ? JSON.stringify(cache, null, 2) : "Loading…"}
        </pre>
      </div>
    </div>
  );
}
