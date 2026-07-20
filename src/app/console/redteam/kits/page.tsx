"use client";

import { useEffect, useState } from "react";
import { EthicalGate } from "@/components/console/EthicalGate";
import { RefreshCw } from "lucide-react";

type Kit = {
  id: string;
  category: string;
  name: string;
  summary: string;
  ethicalUse: string;
  techniques?: string[];
  detection?: string;
  remediation?: string;
  blockedNote?: string;
};

export default function KitsPage() {
  const [items, setItems] = useState<Kit[]>([]);
  const [policy, setPolicy] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/v1/ethical?section=kits", { cache: "no-store" });
    const data = await res.json();
    if (data.gate && data.gate.ok === false) {
      setError(data.gate.reason || "usage gate");
      return;
    }
    setItems(data.items || []);
    setPolicy(data.policy?.message || "");
    setError("");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <EthicalGate title="Exploit / payload kits (ethical)">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
              Kits
            </div>
            <h1 className="text-2xl font-semibold">CVE · detection · remediation</h1>
          </div>
          <button className="lm-btn" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        {policy ? (
          <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
            {policy}
          </div>
        ) : null}
        {error ? <div className="text-sm text-rose-300">{error}</div> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((k) => (
            <div key={k.id} className="lm-panel rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
                {k.category}
              </div>
              <h3 className="mt-1 font-medium">{k.name}</h3>
              <p className="mt-1 text-sm text-[var(--lm-muted)]">{k.summary}</p>
              <p className="mt-2 text-[11px] text-emerald-300/80">
                Ethical use: {k.ethicalUse}
              </p>
              {k.techniques?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {k.techniques.map((t) => (
                    <span key={t} className="lm-badge font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              {k.detection ? (
                <p className="mt-2 text-[11px] text-[var(--lm-muted)]">
                  <strong className="text-[var(--lm-text)]">Detect:</strong>{" "}
                  {k.detection}
                </p>
              ) : null}
              {k.remediation ? (
                <p className="mt-1 text-[11px] text-[var(--lm-muted)]">
                  <strong className="text-[var(--lm-text)]">Remediate:</strong>{" "}
                  {k.remediation}
                </p>
              ) : null}
              {k.blockedNote ? (
                <p className="mt-2 text-[11px] text-rose-300">{k.blockedNote}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </EthicalGate>
  );
}
