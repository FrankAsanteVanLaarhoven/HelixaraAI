"use client";

/**
 * Real interactive basemap (Leaflet + OpenStreetMap/Carto/NASA imagery).
 * Keeps the GlobeCanvas export name for drop-in use across console pages.
 */

import dynamic from "next/dynamic";
import type { MapPoint, MapSkin } from "@/components/console/RealMap";

export type { MapPoint, MapSkin };

const RealMap = dynamic(
  () => import("@/components/console/RealMap").then((m) => m.RealMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] w-full items-center justify-center bg-[#0a0f14] text-xs text-cyan-300/70">
        Acquiring live tracks…
      </div>
    ),
  }
);

export function GlobeCanvas({
  points,
  mode = "standard",
  skin = "default",
  fitMode = "auto",
  region = null,
  showHud = false,
  liveLabel,
}: {
  points: MapPoint[];
  mode?: string;
  skin?: MapSkin;
  fitMode?: "global" | "auto" | "region";
  region?: { lat: number; lon: number; zoom: number } | null;
  showHud?: boolean;
  liveLabel?: string;
}) {
  return (
    <div className="h-full w-full overflow-hidden rounded-lg">
      <RealMap
        points={points}
        mode={mode}
        skin={skin}
        fitMode={fitMode}
        region={region}
        showHud={showHud}
        liveLabel={liveLabel}
      />
    </div>
  );
}
