"use client";

import { useEffect, useState } from "react";
import { Cpu, Loader2 } from "lucide-react";
import { useI18n } from "@/modules/i18n/context";

export default function QuantumPage() {
  const { t } = useI18n();
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [problem, setProblem] = useState("crawl_path");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v1/quantum")
      .then((r) => r.json())
      .then(setReport);
  }, []);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/quantum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem }),
      });
      setJob(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const metrics = job?.metrics as
    | {
        speedupVsNaive: number;
        accuracyGainPct: number;
        qubitsSimulated: number;
        iterations: number;
      }
    | undefined;
  const benchmarks = (job?.industryBenchmark || []) as {
    name: string;
    target: string;
    achieved: string;
    pass: boolean;
  }[];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Module · Quantum
        </div>
        <h1 className="text-2xl font-semibold">{t("quantum.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
          {t("quantum.desc")}
        </p>
      </div>

      {report ? (
        <div className="lm-panel rounded-lg p-4 text-sm text-[var(--lm-muted)]">
          <div className="mb-2 text-cyan-200">
            Status: {String(report.status)} · generalQuantumLLM:{" "}
            {String((report.claims as { generalQuantumLLM?: boolean })?.generalQuantumLLM)}
          </div>
          <pre className="overflow-auto whitespace-pre-wrap font-mono text-[11px]">
            {JSON.stringify(report, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="lm-panel flex flex-wrap items-end gap-3 rounded-lg p-4">
        <label className="text-sm text-[var(--lm-muted)]">
          Problem
          <select
            className="lm-input mt-1"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
          >
            <option value="crawl_path">crawl_path</option>
            <option value="threat_clustering">threat_clustering</option>
            <option value="anomaly_weights">anomaly_weights</option>
            <option value="tsp_recon">tsp_recon</option>
          </select>
        </label>
        <button className="lm-btn" onClick={run} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Cpu className="h-4 w-4" />
          )}
          Run hybrid job
        </button>
      </div>

      {job ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lm-panel rounded-lg p-4">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">Metrics</div>
            {metrics ? (
              <ul className="mt-2 space-y-1 text-sm">
                <li>Speedup vs naive: {metrics.speedupVsNaive}×</li>
                <li>Accuracy gain: {metrics.accuracyGainPct}%</li>
                <li>Qubits simulated: {metrics.qubitsSimulated}</li>
                <li>Iterations: {metrics.iterations}</li>
                <li>Backend: {String(job.backend)}</li>
              </ul>
            ) : null}
          </div>
          <div className="lm-panel rounded-lg p-4">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">
              Industry benchmarks
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              {benchmarks.map((b) => (
                <li key={b.name} className="flex items-start gap-2">
                  <span className={b.pass ? "lm-badge lm-badge-live" : "lm-badge lm-badge-warn"}>
                    {b.pass ? "PASS" : "CHECK"}
                  </span>
                  <span>
                    <strong className="text-[var(--lm-text)]">{b.name}</strong>
                    <br />
                    <span className="text-[11px] text-[var(--lm-muted)]">
                      target {b.target} · achieved {b.achieved}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
