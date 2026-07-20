"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/modules/theme/context";

export type MapPoint = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  kind: string;
  meta?: Record<string, string | number | boolean | undefined>;
};

export type MapSkin = "default" | "military" | "nasa";

const KIND_COLOR: Record<string, string> = {
  ops: "#2ee6ff",
  twin: "#2ee6ff",
  satellite: "#7cf0ff",
  flight: "#f5b942",
  vessel: "#3dff9a",
  threat: "#ff4d6a",
  infra: "#7f98b3",
  sensor: "#2ee6ff",
  airport: "#9ab0c8",
  alert: "#ff4d6a",
};

/** Real basemap tiles — ops / NASA imagery / dark tactical */
const TILES: Record<string, { url: string; attr: string; maxZoom?: number }> = {
  standard: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  standard_light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  night: {
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  crt: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  thermal: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  /** Dark tactical — military-style unlabeled earth */
  military: {
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  /** NASA-style true-color Earth imagery (Esri World Imagery) */
  nasa: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr:
      "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
  },
};

function FitBounds({
  points,
  region,
  fitMode,
}: {
  points: MapPoint[];
  region?: { lat: number; lon: number; zoom: number } | null;
  fitMode: "global" | "auto" | "region";
}) {
  const map = useMap();
  useEffect(() => {
    if (fitMode === "region" && region) {
      map.setView([region.lat, region.lon], region.zoom, { animate: true });
      return;
    }
    if (fitMode === "global") {
      map.setView([18, 8], 2, { animate: true });
      return;
    }
    const valid = points.filter(
      (p) =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lon) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lon) <= 180
    );
    if (!valid.length) {
      map.setView([20, 0], 2);
      return;
    }
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lon], 5);
      return;
    }
    const bounds = L.latLngBounds(
      valid.map((p) => [p.lat, p.lon] as [number, number])
    );
    map.fitBounds(bounds.pad(0.2), { animate: true, maxZoom: 6 });
  }, [map, points, region, fitMode]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

/** Lat/lon graticule for ops / NASA view */
function Graticule({ step = 15 }: { step?: number }) {
  const lines = useMemo(() => {
    const out: { id: string; positions: [number, number][] }[] = [];
    for (let lat = -90; lat <= 90; lat += step) {
      out.push({
        id: `lat-${lat}`,
        positions: [
          [lat, -180],
          [lat, 180],
        ],
      });
    }
    for (let lon = -180; lon <= 180; lon += step) {
      out.push({
        id: `lon-${lon}`,
        positions: [
          [-85, lon],
          [85, lon],
        ],
      });
    }
    return out;
  }, [step]);

  return (
    <>
      {lines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.positions}
          pathOptions={{
            color: "rgba(46, 230, 255, 0.14)",
            weight: 1,
            opacity: 1,
            interactive: false,
          }}
        />
      ))}
    </>
  );
}

function makeSatIcon(color: string, kind: string) {
  const size = kind === "satellite" ? 18 : kind === "flight" ? 12 : 14;
  const core = kind === "satellite" ? 5 : 4;
  return L.divIcon({
    className: "hx-map-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="hx-marker-wrap" style="--c:${color};--s:${size}px;--core:${core}px">
      <span class="hx-marker-ring"></span>
      <span class="hx-marker-core"></span>
    </span>`,
  });
}

export function RealMap({
  points,
  mode = "standard",
  skin = "default",
  className,
  fitMode = "auto",
  region = null,
  showHud = false,
  liveLabel,
}: {
  points: MapPoint[];
  mode?: string;
  skin?: MapSkin;
  className?: string;
  fitMode?: "global" | "auto" | "region";
  region?: { lat: number; lon: number; zoom: number } | null;
  showHud?: boolean;
  liveLabel?: string;
}) {
  const { resolved } = useTheme();

  const tileKey = useMemo(() => {
    if (skin === "military") return "military";
    if (skin === "nasa") return "nasa";
    if (mode === "standard" && resolved === "light") return "standard_light";
    return mode;
  }, [skin, mode, resolved]);

  const tile = TILES[tileKey] || TILES.standard;
  const opsLook = skin === "military" || skin === "nasa";

  const validPoints = useMemo(
    () =>
      points.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lon) &&
          Math.abs(p.lat) <= 90 &&
          Math.abs(p.lon) <= 180
      ),
    [points]
  );

  const center: [number, number] = region
    ? [region.lat, region.lon]
    : validPoints.length
      ? [validPoints[0].lat, validPoints[0].lon]
      : [20, 0];

  const counts = useMemo(() => {
    const c = { sat: 0, flight: 0, ops: 0, other: 0 };
    for (const p of validPoints) {
      if (p.kind === "satellite") c.sat++;
      else if (p.kind === "flight") c.flight++;
      else if (p.kind === "ops" || p.kind === "twin") c.ops++;
      else c.other++;
    }
    return c;
  }, [validPoints]);

  return (
    <div
      className={className}
      style={{
        height: "100%",
        width: "100%",
        minHeight: 280,
        position: "relative",
      }}
    >
      <MapContainer
        center={center}
        zoom={region?.zoom ?? 2}
        minZoom={1}
        maxZoom={18}
        scrollWheelZoom
        zoomControl={!opsLook}
        attributionControl={!opsLook}
        style={{
          height: "100%",
          width: "100%",
          background: skin === "nasa" ? "#000810" : "var(--lm-map-bg)",
        }}
        worldCopyJump
        className={opsLook ? "hx-ops-map" : undefined}
      >
        <TileLayer
          key={tile.url}
          attribution={tile.attr}
          url={tile.url}
          subdomains={tileKey === "nasa" ? undefined : "abcd"}
          maxZoom={tile.maxZoom ?? 20}
          opacity={skin === "military" ? 0.92 : 1}
        />
        {opsLook ? <Graticule step={15} /> : null}
        <FitBounds points={validPoints} region={region} fitMode={fitMode} />
        <InvalidateSize />
        {validPoints.map((p) => {
          const color = KIND_COLOR[p.kind] || "#2ee6ff";
          if (opsLook && (p.kind === "satellite" || p.kind === "flight" || p.kind === "ops" || p.kind === "twin")) {
            return (
              <Marker
                key={p.id}
                position={[p.lat, p.lon]}
                icon={makeSatIcon(color, p.kind)}
              >
                <Popup>
                  <div style={{ fontSize: 12, minWidth: 150 }}>
                    <strong>{p.label}</strong>
                    <div style={{ opacity: 0.75, marginTop: 4 }}>
                      {p.kind.toUpperCase()} · {p.lat.toFixed(3)}, {p.lon.toFixed(3)}
                      {p.meta?.group ? ` · ${p.meta.group}` : ""}
                    </div>
                    {typeof p.meta?.country === "string" && p.meta.country ? (
                      <div style={{ opacity: 0.7, marginTop: 2 }}>
                        {String(p.meta.country)}
                      </div>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            );
          }
          const radius =
            p.kind === "ops" || p.kind === "twin"
              ? 9
              : p.kind === "threat"
                ? 8
                : p.kind === "flight"
                  ? 5
                  : p.kind === "satellite"
                    ? 6
                    : 7;
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lon]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.75,
                weight: 2,
                opacity: 0.95,
              }}
            >
              <Popup>
                <div style={{ fontSize: 12, minWidth: 140 }}>
                  <strong>{p.label}</strong>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>
                    {p.kind} · {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Ops HUD overlay */}
      {(showHud || opsLook) && (
        <>
          <div className="hx-map-hud-corners" aria-hidden />
          <div className="hx-map-scan" aria-hidden />
          <div className="hx-map-hud-top">
            <span className="hx-live-dot" />
            <span>{liveLabel || "LIVE"}</span>
            <span className="hx-hud-sep">·</span>
            <span>{skin === "nasa" ? "EARTH VIEW" : "TAC VIEW"}</span>
            <span className="hx-hud-sep">·</span>
            <span>{validPoints.length} TRACKS</span>
          </div>
          <div className="hx-map-hud-bottom">
            <span>SAT {counts.sat}</span>
            <span>ADS-B {counts.flight}</span>
            <span>OPS {counts.ops}</span>
            <span>OTHER {counts.other}</span>
          </div>
        </>
      )}

      {!opsLook ? (
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: 12,
            top: 12,
            zIndex: 1000,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(46,230,255,0.85)",
            textShadow: "0 0 8px rgba(0,0,0,0.8)",
          }}
        >
          Live map · OSM/Carto · {mode} · {validPoints.length} pins
        </div>
      ) : null}
    </div>
  );
}
