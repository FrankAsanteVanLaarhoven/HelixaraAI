"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Shield,
  UserPlus,
  FileCheck2,
  Lock,
} from "lucide-react";

type RosterMember = {
  id: string;
  name: string;
  role: string;
  email?: string;
  active: boolean;
  notes?: string;
};

type Engagement = {
  id: string;
  shortId: string;
  name: string;
  type: string;
  status: string;
  target?: string;
  objective: string;
  labOnly: boolean;
  allowedActivities: string[];
  rosterIds: string[];
  roe?: {
    engagementId: string;
    legalBasis: string;
    scopeSummary: string;
    inScopeTargets: string[];
    expiresAt: string;
    attestedBy: string;
  };
  findings: {
    id: string;
    source: string;
    title: string;
    summary: string;
    severity: string;
    ts: string;
  }[];
  phases: {
    id: string;
    phase: string;
    status: string;
    message: string;
    ts: string;
  }[];
  report?: string;
  blockReason?: string;
  createdAt: string;
  updatedAt: string;
};

type TypeMeta = Record<
  string,
  { label: string; description: string; labOnly: boolean; requiresRoe: boolean }
>;

export default function RedTeamPage() {
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [types, setTypes] = useState<TypeMeta>({});
  const [policy, setPolicy] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // create form
  const [name, setName] = useState("External recon · demo");
  const [type, setType] = useState("external_recon");
  const [target, setTarget] = useState("example.com");
  const [objective, setObjective] = useState(
    "Authorized public footprint and DNS/HTTP posture for defensive hardening"
  );

  // ROE form
  const [roeId, setRoeId] = useState("ROE-LAB-001");
  const [legalBasis, setLegalBasis] = useState(
    "Signed internal lab SOW / authorized demo"
  );
  const [scopeSummary, setScopeSummary] = useState(
    "Public OSINT and surface crawl of in-scope hosts only"
  );
  const [attestedBy, setAttestedBy] = useState("operator.demo");

  // roster form
  const [rmName, setRmName] = useState("");
  const [rmRole, setRmRole] = useState("observer");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/redteam", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRoster(data.roster || []);
      setEngagements(data.engagements || []);
      setTypes(data.types || {});
      setPolicy(data.policy?.scope || "");
      if (!selectedId && data.engagements?.[0]?.id) {
        setSelectedId(data.engagements[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => engagements.find((e) => e.id === selectedId) || null,
    [engagements, selectedId]
  );

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/redteam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.engagements) setEngagements(data.engagements);
      if (data.engagement) {
        setEngagements((prev) => {
          const rest = prev.filter((e) => e.id !== data.engagement.id);
          return [data.engagement, ...rest];
        });
        setSelectedId(data.engagement.id);
      }
      if (data.roster) setRoster(data.roster);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "action failed");
    } finally {
      setBusy(false);
    }
  }

  function statusBadge(status: string) {
    if (status === "blocked") return "lm-badge lm-badge-crit";
    if (status === "active" || status === "roe_attested")
      return "lm-badge lm-badge-live";
    if (status === "closed") return "lm-badge";
    return "lm-badge lm-badge-warn";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Red Team
          </div>
          <h1 className="text-2xl font-semibold">Engagements</h1>
        </div>
        <button className="lm-btn" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {policy ? (
        <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <Lock className="h-3.5 w-3.5" />
            ROE scope
          </div>
          {policy}
        </div>
      ) : null}

      {error ? (
        <div className="text-sm text-rose-300">{error}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[340px_1fr_300px]">
        {/* Engagement list */}
        <div className="lm-panel max-h-[70vh] overflow-auto rounded-lg">
          <div className="sticky top-0 border-b border-[var(--lm-border)] bg-[var(--lm-panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-muted)]">
            Engagements
          </div>
          <ul className="divide-y divide-[var(--lm-border)]">
            {engagements.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full px-3 py-2.5 text-left transition hover:bg-white/[0.03] ${
                    selectedId === e.id ? "bg-cyan-400/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] text-cyan-200/90">
                      #{e.shortId}
                    </span>
                    <span className={statusBadge(e.status)}>{e.status}</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-[var(--lm-text)]">
                    {e.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--lm-muted)]">
                    {types[e.type]?.label || e.type}
                    {e.target ? ` · ${e.target}` : ""}
                  </div>
                </button>
              </li>
            ))}
            {!engagements.length ? (
              <li className="p-6 text-center text-sm text-[var(--lm-muted)]">
                No engagements yet
              </li>
            ) : null}
          </ul>
        </div>

        {/* Detail + actions */}
        <div className="space-y-4">
          <div className="lm-panel space-y-3 rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              New engagement
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
                  Name
                </label>
                <input
                  className="lm-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
                  Type
                </label>
                <select
                  className="lm-input"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {Object.entries(types).map(([id, meta]) => (
                    <option key={id} value={id}>
                      {meta.label}
                      {meta.labOnly ? " (lab)" : ""}
                    </option>
                  ))}
                  {!Object.keys(types).length ? (
                    <>
                      <option value="external_recon">External recon</option>
                      <option value="internal_lab">Internal lab</option>
                      <option value="web_surface">Web surface</option>
                      <option value="wireless_lab_observe">
                        Wireless lab observe
                      </option>
                      <option value="reporting_only">Reporting only</option>
                    </>
                  ) : null}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
                  Target
                </label>
                <input
                  className="lm-input font-mono"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="example.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
                  Objective
                </label>
                <textarea
                  className="lm-input min-h-[64px]"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>
            </div>
            <button
              className="lm-btn"
              disabled={busy}
              onClick={() =>
                post({
                  action: "create",
                  name,
                  type,
                  objective,
                  target: target || undefined,
                })
              }
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create
            </button>
          </div>

          {selected ? (
            <div className="lm-panel space-y-4 rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-cyan-200">
                    #{selected.shortId} · {selected.type}
                  </div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <div className="mt-1 text-sm text-[var(--lm-muted)]">
                    {selected.objective}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={statusBadge(selected.status)}>
                      {selected.status}
                    </span>
                    {selected.labOnly ? (
                      <span className="lm-badge lm-badge-warn">lab only</span>
                    ) : null}
                    {selected.target ? (
                      <span className="lm-badge font-mono">{selected.target}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {selected.blockReason ? (
                <div className="text-sm text-rose-300">{selected.blockReason}</div>
              ) : null}

              {/* ROE */}
              <div className="rounded border border-[var(--lm-border)] p-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  ROE attestation
                </div>
                {selected.roe ? (
                  <div className="space-y-1 text-sm text-[var(--lm-muted)]">
                    <div>
                      <strong className="text-[var(--lm-text)]">
                        {selected.roe.engagementId}
                      </strong>{" "}
                      · {selected.roe.attestedBy}
                    </div>
                    <div>{selected.roe.legalBasis}</div>
                    <div>{selected.roe.scopeSummary}</div>
                    <div className="font-mono text-[11px]">
                      expires {selected.roe.expiresAt}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      className="lm-input text-sm"
                      placeholder="ROE id"
                      value={roeId}
                      onChange={(e) => setRoeId(e.target.value)}
                    />
                    <input
                      className="lm-input text-sm"
                      placeholder="Attested by"
                      value={attestedBy}
                      onChange={(e) => setAttestedBy(e.target.value)}
                    />
                    <input
                      className="lm-input text-sm md:col-span-2"
                      placeholder="Legal basis"
                      value={legalBasis}
                      onChange={(e) => setLegalBasis(e.target.value)}
                    />
                    <textarea
                      className="lm-input min-h-[56px] text-sm md:col-span-2"
                      placeholder="Scope summary"
                      value={scopeSummary}
                      onChange={(e) => setScopeSummary(e.target.value)}
                    />
                    <button
                      className="lm-btn md:col-span-2"
                      disabled={busy}
                      onClick={() =>
                        post({
                          action: "attest",
                          engagementId: selected.id,
                          roeId,
                          legalBasis,
                          scopeSummary,
                          inScopeTargets: selected.target
                            ? [selected.target]
                            : ["lab"],
                          outOfScope: [
                            "production attack",
                            "third-party networks",
                          ],
                          expiresAt: new Date(
                            Date.now() + 7 * 24 * 3600_000
                          ).toISOString(),
                          allowPrivateTargets: selected.labOnly,
                          attestedBy,
                        })
                      }
                    >
                      <Shield className="h-4 w-4" />
                      Attest ROE
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="lm-btn"
                  disabled={busy || selected.status === "closed"}
                  onClick={() =>
                    post({
                      action: "run",
                      engagementId: selected.id,
                      useHermes: true,
                    })
                  }
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Run recon cycle
                </button>
                <button
                  className="lm-btn opacity-80"
                  disabled={busy || selected.status === "closed"}
                  onClick={() =>
                    post({ action: "close", engagementId: selected.id })
                  }
                >
                  Close
                </button>
              </div>

              {/* Findings */}
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
                  Findings ({selected.findings.length})
                </div>
                <ul className="space-y-2">
                  {selected.findings.map((f) => (
                    <li
                      key={f.id}
                      className="rounded border border-[var(--lm-border)] px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap gap-2 text-[11px] text-[var(--lm-muted)]">
                        <span className="lm-badge">{f.source}</span>
                        <span className="lm-badge">{f.severity}</span>
                      </div>
                      <div className="mt-1 font-medium">{f.title}</div>
                      <div className="mt-0.5 text-[var(--lm-muted)]">
                        {f.summary}
                      </div>
                    </li>
                  ))}
                  {!selected.findings.length ? (
                    <li className="text-sm text-[var(--lm-muted)]">
                      No findings yet — attest ROE and run.
                    </li>
                  ) : null}
                </ul>
              </div>

              {/* Phases */}
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
                  Phase log
                </div>
                <ul className="space-y-1 font-mono text-[11px] text-[var(--lm-muted)]">
                  {selected.phases.map((p) => (
                    <li key={p.id}>
                      <span
                        className={
                          p.status === "ok"
                            ? "text-emerald-400"
                            : p.status === "blocked"
                              ? "text-amber-400"
                              : "text-rose-400"
                        }
                      >
                        ●
                      </span>{" "}
                      {p.phase}: {p.message}
                    </li>
                  ))}
                </ul>
              </div>

              {selected.report ? (
                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
                    Report
                  </div>
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded border border-[var(--lm-border)] bg-black/20 p-3 text-[12px] leading-relaxed text-[var(--lm-text)]">
                    {selected.report}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="lm-panel p-6 text-sm text-[var(--lm-muted)]">
              Select or create an engagement.
            </div>
          )}
        </div>

        {/* Roster */}
        <div className="space-y-4">
          <div className="lm-panel max-h-[50vh] overflow-auto rounded-lg">
            <div className="sticky top-0 border-b border-[var(--lm-border)] bg-[var(--lm-panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-muted)]">
              Roster
            </div>
            <ul className="divide-y divide-[var(--lm-border)]">
              {roster.map((m) => (
                <li key={m.id} className="px-3 py-2.5">
                  <div className="text-sm font-medium text-[var(--lm-text)]">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-[var(--lm-muted)]">
                    {m.role}
                    {!m.active ? " · inactive" : ""}
                  </div>
                  {m.notes ? (
                    <div className="mt-0.5 text-[11px] text-[var(--lm-muted)]">
                      {m.notes}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="lm-panel space-y-2 rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
              Add roster member
            </div>
            <input
              className="lm-input text-sm"
              placeholder="Name"
              value={rmName}
              onChange={(e) => setRmName(e.target.value)}
            />
            <select
              className="lm-input text-sm"
              value={rmRole}
              onChange={(e) => setRmRole(e.target.value)}
            >
              <option value="lead">lead</option>
              <option value="recon">recon</option>
              <option value="osint">osint</option>
              <option value="analyst">analyst</option>
              <option value="scribe">scribe</option>
              <option value="observer">observer</option>
            </select>
            <button
              className="lm-btn w-full"
              disabled={busy || rmName.trim().length < 2}
              onClick={() =>
                post({
                  action: "roster.upsert",
                  name: rmName.trim(),
                  role: rmRole,
                  active: true,
                }).then(() => setRmName(""))
              }
            >
              <UserPlus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div className="lm-panel rounded-lg p-3 text-[11px] leading-relaxed text-[var(--lm-muted)]">
            <strong className="text-[var(--lm-text)]">Not included</strong>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Exploit / payload kits</li>
              <li>Phishing / SMS spoof</li>
              <li>Deauth / RF inject</li>
              <li>ATT&amp;CK campaign runner</li>
              <li>Purple-team boards</li>
              <li>Separate Red/Blue workspaces</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
