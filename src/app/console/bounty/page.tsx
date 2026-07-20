"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bug,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Wrench,
  CheckCircle2,
} from "lucide-react";

type Program = {
  id: string;
  shortId: string;
  name: string;
  owner: string;
  engagementId: string;
  legalBasis: string;
  inScope: string[];
  outOfScope: string[];
  active: boolean;
  expiresAt: string;
};

type Finding = {
  id: string;
  shortId: string;
  programId: string;
  target: string;
  checkId: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  remediation: string[];
  restoreJobId?: string;
};

type RestoreJob = {
  id: string;
  shortId: string;
  findingId: string;
  target: string;
  status: string;
  steps: {
    id: string;
    title: string;
    detail: string;
    status: string;
    note?: string;
  }[];
  verifyOk?: boolean;
  verifyDetail?: string;
};

type Asset = {
  id: string;
  host: string;
  url: string;
  sources: string[];
  live?: boolean;
  httpStatus?: number;
  title?: string;
  lastScannedAt?: string;
};

export default function BountyPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [restores, setRestores] = useState<RestoreJob[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [policy, setPolicy] = useState("");
  const [policyDyn, setPolicyDyn] = useState("");
  const [programId, setProgramId] = useState("");
  const [target, setTarget] = useState("example.com");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [selectedFinding, setSelectedFinding] = useState<string | null>(null);
  const [onlyLive, setOnlyLive] = useState(false);

  // new program
  const [pName, setPName] = useState("Org web bounty");
  const [pOwner, setPOwner] = useState("Security team");
  const [pEng, setPEng] = useState("BOUNTY-ROE-001");
  const [pLegal, setPLegal] = useState("Signed bug bounty / authorized testing SOW");
  const [pScope, setPScope] = useState("*.example.com, example.com");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/bounty", { cache: "no-store" });
    const data = await res.json();
    setPrograms(data.programs || []);
    setFindings(data.findings || []);
    setRestores(data.restores || []);
    setPolicy(data.policy?.scope || "");
    setPolicyDyn(data.policy?.dynamic || "");
    const pid = programId || data.programs?.[0]?.id || "";
    if (!programId && data.programs?.[0]?.id) {
      setProgramId(data.programs[0].id);
    }
    const allAssets = (data.assets || []) as Asset[];
    if (pid) {
      setAssets(
        allAssets.filter(
          (a) =>
            (a as Asset & { programId?: string }).programId === pid ||
            !(a as Asset & { programId?: string }).programId
        )
      );
      // Prefer program-scoped fetch
      try {
        const r2 = await fetch(`/api/v1/bounty?kind=assets&id=${pid}`, {
          cache: "no-store",
        });
        const d2 = await r2.json();
        if (d2.assets) setAssets(d2.assets);
      } catch {
        /* keep snapshot assets */
      }
    } else {
      setAssets(allAssets);
    }
  }, [programId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredFindings = useMemo(
    () =>
      programId
        ? findings.filter((f) => f.programId === programId)
        : findings,
    [findings, programId]
  );

  const activeRestore = useMemo(() => {
    const f = findings.find((x) => x.id === selectedFinding);
    if (!f?.restoreJobId) return null;
    return restores.find((r) => r.id === f.restoreJobId) || null;
  }, [findings, restores, selectedFinding]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/v1/bounty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.reason || data.error || `HTTP ${res.status}`);
      }
      if (data.findings) setFindings(data.findings);
      await load();
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createProgram() {
    const inScope = pScope
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const data = await post({
      action: "program.create",
      name: pName,
      owner: pOwner,
      engagementId: pEng,
      legalBasis: pLegal,
      inScope,
    });
    if (data?.program) {
      setProgramId(data.program.id);
      setMsg(`Program ${data.program.shortId} created`);
    }
  }

  async function scan() {
    const data = await post({
      action: "scan",
      programId,
      target,
    });
    if (data?.ok) {
      setMsg(
        `Scan complete · host ${data.host || target} · ${(data.findings || []).length} findings for program`
      );
    }
  }

  async function discoverAll() {
    const data = await post({
      action: "discover",
      programId,
      maxHosts: 80,
      probeLive: true,
    });
    if (data?.ok) {
      setAssets(data.assets || []);
      setMsg(
        `Discovered ${data.stats?.total ?? data.assets?.length ?? 0} sites (CT ${data.stats?.crt ?? 0} · DNS ${data.stats?.prefix ?? 0} · live ${data.stats?.live ?? 0})`
      );
    }
  }

  async function scanAllDynamic() {
    const data = await post({
      action: "scan.all",
      programId,
      rediscover: true,
      onlyLive,
      maxSites: 40,
    });
    if (data?.ok) {
      setAssets(data.assets || []);
      setMsg(
        `Dynamic scan · ${data.scanned?.length ?? 0} sites · ${data.findingCount ?? 0} new findings · errors ${data.errors?.length ?? 0}`
      );
    }
  }

  async function startRestore(findingId: string) {
    setSelectedFinding(findingId);
    const data = await post({ action: "restore.create", findingId });
    if (data?.job) setMsg(`Restore job ${data.job.shortId} created`);
  }

  async function probe(jobId: string) {
    const data = await post({ action: "restore.probe", jobId });
    if (data?.ok) {
      setMsg(
        data.verifyOk
          ? `Probe OK · ${data.detail}`
          : `Probe failed · ${data.detail}`
      );
    }
  }

  async function complete(jobId: string) {
    const data = await post({ action: "restore.complete", jobId });
    if (data?.ok) setMsg("Restore completed · finding verified");
  }

  function severityClass(s: string) {
    if (s === "critical" || s === "high") return "lm-badge lm-badge-crit";
    if (s === "medium") return "lm-badge lm-badge-warn";
    return "lm-badge lm-badge-live";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Bug bounty
          </div>
          <h1 className="text-2xl font-semibold">Search · find · restore</h1>
        </div>
        <button className="lm-btn" onClick={() => load()} disabled={busy}>
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {policy ? (
        <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
          {policy}
          {policyDyn ? (
            <div className="mt-1 text-cyan-100/80">{policyDyn}</div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[320px_1fr_320px]">
        {/* Programs */}
        <div className="space-y-3">
          <div className="lm-panel max-h-[40vh] overflow-auto rounded-lg">
            <div className="sticky top-0 border-b border-[var(--lm-border)] bg-[var(--lm-panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-muted)]">
              Programs
            </div>
            <ul className="divide-y divide-[var(--lm-border)]">
              {programs.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2.5 text-left ${
                      programId === p.id ? "bg-cyan-400/5" : ""
                    }`}
                    onClick={() => setProgramId(p.id)}
                  >
                    <div className="font-mono text-[11px] text-cyan-200">
                      #{p.shortId}
                    </div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-[11px] text-[var(--lm-muted)]">
                      {p.inScope.slice(0, 3).join(", ")}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lm-panel space-y-2 rounded-lg p-3">
            <div className="text-[11px] uppercase text-[var(--lm-muted)]">
              New program (ROE)
            </div>
            <input
              className="lm-input text-sm"
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              placeholder="Name"
            />
            <input
              className="lm-input text-sm"
              value={pOwner}
              onChange={(e) => setPOwner(e.target.value)}
              placeholder="Owner"
            />
            <input
              className="lm-input font-mono text-sm"
              value={pEng}
              onChange={(e) => setPEng(e.target.value)}
              placeholder="Engagement id"
            />
            <input
              className="lm-input text-sm"
              value={pLegal}
              onChange={(e) => setPLegal(e.target.value)}
              placeholder="Legal basis"
            />
            <textarea
              className="lm-input min-h-[56px] text-sm"
              value={pScope}
              onChange={(e) => setPScope(e.target.value)}
              placeholder="In-scope roots (*.example.com, example.com)"
            />
            <button className="lm-btn w-full" disabled={busy} onClick={createProgram}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create program
            </button>
          </div>

          <div className="lm-panel max-h-[28vh] overflow-auto rounded-lg">
            <div className="sticky top-0 border-b border-[var(--lm-border)] bg-[var(--lm-panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-muted)]">
              Dynamic sites ({assets.length})
            </div>
            <ul className="divide-y divide-[var(--lm-border)]">
              {assets.map((a) => (
                <li key={a.id || a.host}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-[12px] hover:bg-white/[0.03]"
                    onClick={() => setTarget(a.host)}
                  >
                    <div className="flex flex-wrap items-center gap-2 font-mono text-cyan-200/90">
                      {a.host}
                      {a.live === true ? (
                        <span className="lm-badge lm-badge-live">live</span>
                      ) : a.live === false ? (
                        <span className="lm-badge">down</span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-[var(--lm-muted)]">
                      {(a.sources || []).join(", ")}
                      {a.httpStatus ? ` · HTTP ${a.httpStatus}` : ""}
                      {a.title ? ` · ${a.title}` : ""}
                    </div>
                  </button>
                </li>
              ))}
              {!assets.length ? (
                <li className="p-4 text-center text-[12px] text-[var(--lm-muted)]">
                  Run Discover all sites to expand wildcards dynamically.
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        {/* Scan + findings */}
        <div className="space-y-3">
          <div className="lm-panel space-y-3 rounded-lg p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
                  Single target (or pick from dynamic list)
                </label>
                <input
                  className="lm-input font-mono"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
              <button
                className="lm-btn"
                disabled={busy || !programId}
                onClick={scan}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Find bugs
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="lm-btn"
                disabled={busy || !programId}
                onClick={discoverAll}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Discover all sites
              </button>
              <button
                className="lm-btn"
                disabled={busy || !programId}
                onClick={scanAllDynamic}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Scan all dynamically
              </button>
              <label className="flex items-center gap-2 text-[11px] text-[var(--lm-muted)]">
                <input
                  type="checkbox"
                  checked={onlyLive}
                  onChange={(e) => setOnlyLive(e.target.checked)}
                />
                Live hosts only
              </label>
            </div>
            <p className="text-[11px] text-[var(--lm-muted)]">
              Dynamic: Certificate Transparency + DNS prefixes + sitemaps under your
              in-scope roots (*.domain). Then scans every discovered site still in ROE.
            </p>
          </div>

          {error ? <div className="text-sm text-rose-300">{error}</div> : null}
          {msg ? <div className="text-sm text-emerald-300/90">{msg}</div> : null}

          <div className="lm-panel max-h-[55vh] overflow-auto rounded-lg">
            <div className="sticky top-0 border-b border-[var(--lm-border)] bg-[var(--lm-panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-muted)]">
              Findings ({filteredFindings.length})
            </div>
            <ul className="divide-y divide-[var(--lm-border)]">
              {filteredFindings.map((f) => (
                <li key={f.id} className="px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-cyan-200">
                          #{f.shortId}
                        </span>
                        <span className={severityClass(f.severity)}>{f.severity}</span>
                        <span className="lm-badge">{f.status}</span>
                      </div>
                      <div className="mt-1 text-sm font-medium">{f.title}</div>
                      <div className="text-[12px] text-[var(--lm-muted)]">
                        {f.summary}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-[var(--lm-muted)]">
                        {f.target} · {f.checkId}
                      </div>
                    </div>
                    <button
                      className="lm-btn py-1 text-xs"
                      disabled={busy}
                      onClick={() => startRestore(f.id)}
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      Restore
                    </button>
                  </div>
                  {f.remediation?.length ? (
                    <ul className="mt-2 list-inside list-disc text-[11px] text-[var(--lm-muted)]">
                      {f.remediation.slice(0, 4).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
              {!filteredFindings.length ? (
                <li className="p-6 text-center text-sm text-[var(--lm-muted)]">
                  No findings yet — select program and run Find bugs on an in-scope host.
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        {/* Restore panel */}
        <div className="space-y-3">
          <div className="lm-panel rounded-lg p-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
              <Bug className="h-3.5 w-3.5" />
              Restore workflow
            </div>
            {activeRestore ? (
              <div className="space-y-3">
                <div className="font-mono text-[12px] text-cyan-200">
                  #{activeRestore.shortId} · {activeRestore.status}
                </div>
                <div className="text-[11px] text-[var(--lm-muted)]">
                  {activeRestore.target}
                </div>
                <ul className="space-y-2">
                  {activeRestore.steps.map((s) => (
                    <li
                      key={s.id}
                      className="rounded border border-[var(--lm-border)] px-2 py-1.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{s.title}</span>
                        <span className="lm-badge">{s.status}</span>
                      </div>
                      <div className="text-[var(--lm-muted)]">{s.detail}</div>
                      {s.status === "pending" ? (
                        <button
                          className="lm-btn mt-1 py-0.5 text-[10px]"
                          disabled={busy}
                          onClick={() =>
                            post({
                              action: "restore.step",
                              jobId: activeRestore.id,
                              stepId: s.id,
                              status: "done",
                            })
                          }
                        >
                          Mark done
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {activeRestore.verifyDetail ? (
                  <div className="text-[11px] text-[var(--lm-muted)]">
                    Probe: {activeRestore.verifyDetail}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    className="lm-btn"
                    disabled={busy}
                    onClick={() => probe(activeRestore.id)}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Health probe
                  </button>
                  <button
                    className="lm-btn"
                    disabled={busy || !activeRestore.verifyOk}
                    onClick={() => complete(activeRestore.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Complete
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--lm-muted)]">
                Select a finding and click Restore to open a guided remediation +
                verify workflow for that in-scope system.
              </p>
            )}
          </div>

          <div className="lm-panel rounded-lg p-3 text-[11px] leading-relaxed text-[var(--lm-muted)]">
            <strong className="text-[var(--lm-text)]">Capabilities</strong>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Wildcard roots (*.example.com)</li>
              <li>Dynamic discovery of all related sites</li>
              <li>Scan all sites dynamically</li>
              <li>Safe surface bug search + restore</li>
              <li>Audit trail</li>
            </ul>
            <p className="mt-2">
              All discovered hosts must still match program scope / ROE. Not open-internet
              scanning outside your authorized roots.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
