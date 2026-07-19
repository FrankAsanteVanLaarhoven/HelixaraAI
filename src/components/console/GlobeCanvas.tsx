"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  kind: string;
};

const KIND_COLOR: Record<string, string> = {
  ops: "#2ee6ff",
  satellite: "#9b8cff",
  flight: "#f5b942",
  vessel: "#3dff9a",
  threat: "#ff4d6a",
  infra: "#7f98b3",
  sensor: "#2ee6ff",
};

function project(lat: number, lon: number, w: number, h: number, rot: number) {
  const x = ((lon + 180 + rot) % 360) / 360 * w;
  const y = (90 - lat) / 180 * h;
  return { x, y };
}

export function GlobeCanvas({
  points,
  mode = "standard",
}: {
  points: Point[];
  mode?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rot, setRot] = useState(0);
  const [hover, setHover] = useState<string | null>(null);

  const palette = useMemo(() => {
    if (mode === "night") return { bg: "#02060d", grid: "rgba(80,120,180,0.15)", land: "rgba(40,70,110,0.35)" };
    if (mode === "crt") return { bg: "#031408", grid: "rgba(40,255,80,0.12)", land: "rgba(20,90,40,0.35)" };
    if (mode === "thermal") return { bg: "#12060a", grid: "rgba(255,100,40,0.12)", land: "rgba(120,40,20,0.35)" };
    return { bg: "#07101c", grid: "rgba(46,230,255,0.1)", land: "rgba(20,50,90,0.4)" };
  }, [mode]);

  useEffect(() => {
    const id = setInterval(() => setRot((r) => (r + 0.15) % 360), 40);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);

    // lat/lon grid
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = (((lon + 180 + rot) % 360) / 360) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // soft landmass blobs (stylized, not cartographic)
    const blobs = [
      { lat: 40, lon: -100, rx: 0.12, ry: 0.1 },
      { lat: 50, lon: 10, rx: 0.1, ry: 0.08 },
      { lat: 20, lon: 80, rx: 0.14, ry: 0.1 },
      { lat: -15, lon: -60, rx: 0.08, ry: 0.12 },
      { lat: -25, lon: 135, rx: 0.08, ry: 0.07 },
      { lat: 5, lon: 20, rx: 0.09, ry: 0.12 },
    ];
    ctx.fillStyle = palette.land;
    for (const b of blobs) {
      const p = project(b.lat, b.lon, w, h, rot);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, w * b.rx, h * b.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // wrap seam
      ctx.beginPath();
      ctx.ellipse(p.x - w, p.y, w * b.rx, h * b.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(p.x + w, p.y, w * b.rx, h * b.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // arcs between ops nodes
    const ops = points.filter((p) => p.kind === "ops");
    ctx.strokeStyle = "rgba(46,230,255,0.18)";
    for (let i = 0; i < ops.length; i++) {
      for (let j = i + 1; j < ops.length; j++) {
        const a = project(ops[i].lat, ops[i].lon, w, h, rot);
        const b = project(ops[j].lat, ops[j].lon, w, h, rot);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 40, b.x, b.y);
        ctx.stroke();
      }
    }

    for (const pt of points) {
      const { x, y } = project(pt.lat, pt.lon, w, h, rot);
      const color = KIND_COLOR[pt.kind] || "#2ee6ff";
      const r = pt.kind === "ops" ? 5 : pt.kind === "threat" ? 4 : 3;

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = hover === pt.id ? 18 : 8;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (pt.kind === "satellite" || pt.kind === "ops") {
        ctx.beginPath();
        ctx.strokeStyle = color + "55";
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (hover === pt.id || pt.kind === "ops" || pt.kind === "threat") {
        ctx.fillStyle = "#d7e6f7";
        ctx.font = "10px ui-sans-serif, system-ui";
        ctx.fillText(pt.label.slice(0, 36), x + 8, y - 6);
      }
    }

    // HUD corners
    ctx.strokeStyle = "rgba(46,230,255,0.35)";
    ctx.lineWidth = 1.5;
    const c = 18;
    // TL
    ctx.beginPath();
    ctx.moveTo(8, 8 + c);
    ctx.lineTo(8, 8);
    ctx.lineTo(8 + c, 8);
    ctx.stroke();
    // TR
    ctx.beginPath();
    ctx.moveTo(w - 8 - c, 8);
    ctx.lineTo(w - 8, 8);
    ctx.lineTo(w - 8, 8 + c);
    ctx.stroke();
    // BL
    ctx.beginPath();
    ctx.moveTo(8, h - 8 - c);
    ctx.lineTo(8, h - 8);
    ctx.lineTo(8 + c, h - 8);
    ctx.stroke();
    // BR
    ctx.beginPath();
    ctx.moveTo(w - 8 - c, h - 8);
    ctx.lineTo(w - 8, h - 8);
    ctx.lineTo(w - 8, h - 8 - c);
    ctx.stroke();
  }, [points, rot, hover, palette]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ width: "100%", height: "100%" }}
        onMouseMove={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          let found: string | null = null;
          for (const pt of points) {
            const p = project(pt.lat, pt.lon, rect.width, rect.height, rot);
            const d = Math.hypot(p.x - mx, p.y - my);
            if (d < 12) {
              found = pt.id;
              break;
            }
          }
          setHover(found);
        }}
        onMouseLeave={() => setHover(null)}
      />
      <div className="pointer-events-none absolute left-3 top-3 text-[10px] uppercase tracking-[0.25em] text-cyan-300/80">
        God&apos;s Eye · {mode}
      </div>
    </div>
  );
}
