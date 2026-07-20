"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Shield, ShieldOff } from "lucide-react";

type Grant = {
  capability: string;
  status: string;
  engagementId?: string;
  legalBasis?: string;
  expiresAt?: string;
  approvals: { role: string; identity: string; verifiedAt: string }[];
  authorizedAt?: string;
};

type CapMeta = Record<string, { label: string; description: string }>;

const SESSION_KEY = "helixara.elevated.session";

export default function ElevatedAdminPage() {
  const [snap, setSnap] = useState<{
    policy?: { message: string };
    secrets?: { ownerConfigured: boolean; superadminConfigured: boolean; demoElevated: boolean };
    capabilities?: CapMeta;
    grants?: Record<string, Grant>;
    activeSessions?: { sessionId: string; role: string; identity: string; expiresAt: string }[];
  } | null>(null);
  const [role, setRole] = useState<"owner" | "superadmin">("owner");
  const [identity, setIdentity] = useState("owner@helixara.local");
  const [token, setToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessionRole, setSessionRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // approve form
  const [cap, setCap] = useState("rf_ota_inject");
  const [engagementId, setEngagementId] = useState("ROE-ELEVATED-001");
  const [legalBasis, setLegalBasis] = useState(
    "Signed ROE — ethical hacking lab · owner+superadmin dual control"
  );
  const [expiresAt, setExpiresAt] = useState(
    () => new Date(Date.now() + 4 * 3600_000).toISOString()
  );
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/elevated", { cache: "no-store" });
    setSnap(await res.json());
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { sessionId: string; role: string };
        setSessionId(s.sessionId);
        setSessionRole(s.role);
      }
    } catch {
      /* ignore */
    }
    load();
  }, [load]);

  async function verify() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/v1/admin/elevated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", role, identity, token }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.reason || data.error);
      setSessionId(data.session.sessionId);
      setSessionRole(data.session.role);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          sessionId: data.session.sessionId,
          role: data.session.role,
          identity: data.session.identity,
          expiresAt: data.session.expiresAt,
        })
      );
      setMsg(`Verified as ${data.session.role} · ${data.session.identity}`);
      setToken("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "verify failed");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!sessionId) {
      setError("Verify owner or superadmin first");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/v1/admin/elevated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          sessionId,
          capability: cap,
          engagementId,
          legalBasis,
          expiresAt,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.reason || data.error);
      setMsg(`Approval recorded · status ${data.grant?.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(capability: string) {
    if (!sessionId) {
      setError("Verify owner or superadmin first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/elevated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke",
          sessionId,
          capability,
          reason: "revoked from admin UI",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.reason || data.error);
      setMsg(`Revoked ${capability}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "revoke failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (sessionId) {
      await fetch("/api/v1/admin/elevated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout", sessionId }),
      });
    }
    localStorage.removeItem(SESSION_KEY);
    setSessionId("");
    setSessionRole("");
    setMsg("Session cleared");
    await load();
  }

  const grants = snap?.grants || {};
  const caps = snap?.capabilities || {};

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Admin
        </div>
        <h1 className="text-2xl font-semibold">Elevated permissions</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--lm-muted)]">
          Formerly permanent-off paths unlock only after dual-control: verified{" "}
          <strong className="text-[var(--lm-text)]">owner</strong> and{" "}
          <strong className="text-[var(--lm-text)]">superadmin</strong> each
          approve. Operators cannot authorize.
        </p>
      </div>

      {snap?.policy?.message ? (
        <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
          {snap.policy.message}
        </div>
      ) : null}

      <div className="lm-panel space-y-3 rounded-lg p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
          <KeyRound className="h-3.5 w-3.5" />
          Role verification
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            className="lm-input"
            value={role}
            onChange={(e) => setRole(e.target.value as "owner" | "superadmin")}
          >
            <option value="owner">owner</option>
            <option value="superadmin">superadmin</option>
          </select>
          <input
            className="lm-input"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="identity / email"
          />
          <input
            className="lm-input font-mono"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="role token"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="lm-btn" disabled={busy} onClick={verify}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Verify role
          </button>
          <button className="lm-btn opacity-70" onClick={logout}>
            Clear session
          </button>
        </div>
        {sessionId ? (
          <div className="font-mono text-[11px] text-emerald-300/90">
            Active session: {sessionRole} · {sessionId.slice(0, 12)}…
          </div>
        ) : (
          <div className="text-[11px] text-[var(--lm-muted)]">
            No elevated session. Demo tokens (if HELIXARA_ALLOW_DEMO_ELEVATED=1):
            helixara-owner-demo-change-me / helixara-superadmin-demo-change-me
          </div>
        )}
        <div className="text-[11px] text-[var(--lm-muted)]">
          Secrets configured: owner=
          {snap?.secrets?.ownerConfigured ? "yes" : "no"} · superadmin=
          {snap?.secrets?.superadminConfigured ? "yes" : "no"} · demo=
          {snap?.secrets?.demoElevated ? "on" : "off"}
        </div>
      </div>

      <div className="lm-panel space-y-3 rounded-lg p-4">
        <div className="text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
          Approve capability (your role only — peer must approve too)
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="lm-input"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
          >
            {Object.entries(caps).map(([id, meta]) => (
              <option key={id} value={id}>
                {meta.label}
              </option>
            ))}
          </select>
          <input
            className="lm-input font-mono"
            value={engagementId}
            onChange={(e) => setEngagementId(e.target.value)}
            placeholder="Engagement / ROE id"
          />
          <input
            className="lm-input md:col-span-2"
            value={legalBasis}
            onChange={(e) => setLegalBasis(e.target.value)}
            placeholder="Legal basis"
          />
          <input
            className="lm-input font-mono md:col-span-2"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            placeholder="expiresAt ISO"
          />
          <input
            className="lm-input md:col-span-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
          />
        </div>
        <button className="lm-btn" disabled={busy || !sessionId} onClick={approve}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          Record {sessionRole || "role"} approval
        </button>
      </div>

      {error ? <div className="text-sm text-rose-300">{error}</div> : null}
      {msg ? <div className="text-sm text-emerald-300/90">{msg}</div> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(grants).map(([id, g]) => (
          <div key={id} className="lm-panel rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{caps[id]?.label || id}</div>
              <span
                className={
                  g.status === "authorized"
                    ? "lm-badge lm-badge-live"
                    : g.status === "pending"
                      ? "lm-badge lm-badge-warn"
                      : "lm-badge lm-badge-crit"
                }
              >
                {g.status}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--lm-muted)]">
              {caps[id]?.description}
            </p>
            <div className="mt-2 text-[11px] text-[var(--lm-muted)]">
              Approvals:{" "}
              {g.approvals?.length
                ? g.approvals.map((a) => `${a.role}:${a.identity}`).join(" · ")
                : "none"}
            </div>
            {g.engagementId ? (
              <div className="mt-1 font-mono text-[11px] text-cyan-200/80">
                {g.engagementId} · exp {g.expiresAt || "—"}
              </div>
            ) : null}
            <button
              className="lm-btn mt-3 py-1 text-xs opacity-80"
              disabled={!sessionId || busy}
              onClick={() => revoke(id)}
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Revoke
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
