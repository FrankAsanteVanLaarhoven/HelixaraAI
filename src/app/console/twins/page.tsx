"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/modules/i18n/context";

export default function TwinsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<{
    twins: {
      id: string;
      label: string;
      lat: number;
      lon: number;
      meta?: Record<string, unknown>;
      health?: string;
      lastSync?: string;
    }[];
    fidelityModel: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/v1/twins")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Module · Digital Twins
        </div>
        <h1 className="text-2xl font-semibold">{t("twins.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
          {t("twins.desc")}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(data?.twins || []).map((tw) => (
          <div key={tw.id} className="lm-panel rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-cyan-200">{tw.label}</h3>
              <span className="lm-badge lm-badge-live">{tw.health || "synced"}</span>
            </div>
            <div className="mt-2 font-mono text-xs text-[var(--lm-muted)]">
              {tw.lat.toFixed(4)}, {tw.lon.toFixed(4)}
            </div>
            <div className="mt-1 text-[11px] text-[var(--lm-muted)]">
              fidelity {String(tw.meta?.fidelity || "—")} · region{" "}
              {String(tw.meta?.region || "—")}
            </div>
            <div className="mt-1 text-[10px] text-[var(--lm-muted)]">
              last sync {tw.lastSync || "—"}
            </div>
          </div>
        ))}
      </div>

      {data?.fidelityModel ? (
        <pre className="lm-panel overflow-auto rounded-lg p-4 font-mono text-[11px] text-[var(--lm-muted)]">
          {JSON.stringify(data.fidelityModel, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
