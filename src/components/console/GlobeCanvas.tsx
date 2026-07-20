"use client";

/**
 * Real interactive basemap (Leaflet + OpenStreetMap/Carto tiles).
 * Keeps the GlobeCanvas export name for drop-in use across console pages.
 */

import dynamic from "next/dynamic";

export type MapPoint = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  kind: string;
};

const RealMap = dynamic(
  () => import("@/components/console/RealMap").then((m) => m.RealMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] w-full items-center justify-center bg-[#0a0f14] text-xs text-cyan-300/70">
        Loading real map tiles…
      </div>
    ),
  }
);

export function GlobeCanvas({
  points,
  mode = "standard",
}: {
  points: MapPoint[];
  mode?: string;
}) {
  return (
    <div className="h-full w-full overflow-hidden rounded-lg">
      <RealMap points={points} mode={mode} />
    </div>
  );
}
