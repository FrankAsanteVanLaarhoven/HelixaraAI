"use client";

import { useEffect, useState } from "react";

type Caps = {
  name: string;
  version?: string;
  modules?: {
    id: string;
    name: string;
    status: string;
  }[];
  dataSources?: { area: string; source: string }[];
  locales?: string[];
  llmProviders?: Record<string, unknown>;
};

export default function CapabilitiesPage() {
  const [caps, setCaps] = useState<Caps | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/capabilities")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setCaps)
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"));
  }, []);

  if (error) {
    return (
      <div className="text-sm text-rose-300">
        Failed to load modules: {error}
      </div>
    );
  }

  if (!caps) {
    return (
      <div className="text-sm text-[var(--lm-muted)]">Loading modules…</div>
    );
  }

  const modules = caps.modules || [];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Modules
        </div>
        <h1 className="text-2xl font-semibold">{caps.name}</h1>
        {caps.version ? (
          <p className="mt-1 text-sm text-[var(--lm-muted)]">v{caps.version}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m) => (
          <div key={m.id} className="lm-panel rounded-lg p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-[var(--lm-text)]">{m.name}</h3>
              <span
                className={
                  m.status === "active" || m.status === "hybrid"
                    ? "lm-badge lm-badge-live"
                    : "lm-badge lm-badge-warn"
                }
              >
                {m.status}
              </span>
            </div>
          </div>
        ))}
        {!modules.length ? (
          <div className="text-sm text-[var(--lm-muted)]">No modules listed</div>
        ) : null}
      </div>

      {caps.dataSources?.length ? (
        <div className="lm-panel rounded-lg p-4">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Data sources
          </div>
          <ul className="space-y-2 text-sm text-[var(--lm-muted)]">
            {caps.dataSources.map((b) => (
              <li key={b.area}>
                <strong className="text-[var(--lm-text)]">{b.area}</strong> —{" "}
                {b.source}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {caps.locales?.length ? (
        <div className="lm-panel rounded-lg p-4 text-sm text-[var(--lm-muted)]">
          Locales: {caps.locales.join(", ")}
        </div>
      ) : null}
    </div>
  );
}
