"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

export function EthicalGate({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [accepted, setAccepted] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState("");
  const [operatorId, setOperatorId] = useState("operator.demo");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ethical?section=usage", {
        cache: "no-store",
      });
      const data = await res.json();
      setAccepted(Boolean(data.accepted));
      setNotice(data.notice || "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/ethical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept_usage",
          operatorId,
          confirmText: confirm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.reason || data.error || "accept failed");
      }
      setAccepted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--lm-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading ethical usage gate…
      </div>
    );
  }

  if (!accepted) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-2 text-amber-200">
          <ShieldAlert className="h-5 w-5" />
          <h1 className="text-xl font-semibold">
            {title || "Ethical hacking usage"}
          </h1>
        </div>
        <pre className="lm-panel max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg p-4 text-[12px] leading-relaxed text-[var(--lm-muted)]">
          {notice}
        </pre>
        <div className="lm-panel space-y-3 rounded-lg p-4">
          <label className="block text-[11px] uppercase text-[var(--lm-muted)]">
            Operator id
          </label>
          <input
            className="lm-input"
            value={operatorId}
            onChange={(e) => setOperatorId(e.target.value)}
          />
          <label className="block text-[11px] uppercase text-[var(--lm-muted)]">
            Type exactly: I ACCEPT ETHICAL HACKING ONLY
          </label>
          <input
            className="lm-input font-mono"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="I ACCEPT ETHICAL HACKING ONLY"
          />
          {error ? <div className="text-sm text-rose-300">{error}</div> : null}
          <button className="lm-btn" disabled={busy} onClick={accept}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Accept & continue
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
