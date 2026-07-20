"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Radar, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

type Network = {
  id: string;
  ssid: string;
  bssid: string;
  channel?: number;
  rssi?: number;
  security?: string;
  band?: string;
  hidden?: boolean;
  source: string;
};

type Client = {
  id: string;
  mac: string;
  vendor?: string;
  associatedBssid?: string;
  rssi?: number;
  source: string;
};

type ScanResult = {
  scanId: string;
  ts: string;
  platform: string;
  method: string;
  live: boolean;
  networks: Network[];
  clients: Client[];
  warnings: string[];
  policy: string;
  selected?: { networkId?: string; clientId?: string };
};

export default function WirelessPage() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [clientId, setClientId] = useState("");
  const [engagementId, setEngagementId] = useState("DEMO-LAB-001");
  const [legalBasis, setLegalBasis] = useState(
    "Owned lab AP / signed wireless ROE only"
  );
  const [selectionMsg, setSelectionMsg] = useState("");

  const loadState = useCallback(async () => {
    const res = await fetch("/api/v1/wireless");
    const data = await res.json();
    if (data.lastScan) {
      setScan(data.lastScan);
      if (data.selection?.networkId) setNetworkId(data.selection.networkId);
      if (data.selection?.clientId) setClientId(data.selection.clientId);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  async function runScan() {
    setLoading(true);
    setError("");
    setSelectionMsg("");
    try {
      const res = await fetch("/api/v1/wireless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "scan failed");
        return;
      }
      setScan(data);
      if (!networkId && data.networks?.[0]) {
        setNetworkId(data.networks[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function selectTarget() {
    setLoading(true);
    setError("");
    setSelectionMsg("");
    try {
      const res = await fetch("/api/v1/wireless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          networkId,
          clientId: clientId || undefined,
          engagementId,
          legalBasis,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "select failed");
        return;
      }
      setSelectionMsg(
        `Selected ${data.selection?.network?.ssid} (${data.selection?.network?.bssid})` +
          (data.selection?.client
            ? ` · client ${data.selection.client.mac}`
            : " · no client")
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedNetwork = useMemo(
    () => scan?.networks.find((n) => n.id === networkId),
    [scan, networkId]
  );

  const clientsForNetwork = useMemo(() => {
    if (!scan || !selectedNetwork) return scan?.clients || [];
    const linked = scan.clients.filter(
      (c) =>
        !c.associatedBssid ||
        c.associatedBssid.toLowerCase() === selectedNetwork.bssid.toLowerCase()
    );
    return linked.length ? linked : scan.clients;
  }, [scan, selectedNetwork]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Module · Wireless lab (passive)
          </div>
          <h1 className="text-2xl font-semibold">Wi‑Fi scan & target select</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
            Discover nearby networks and choose an AP + optional client for{" "}
            <strong className="text-amber-200">authorized lab / ROE work</strong>
            . Passive scan only — no deauth, no evil twin, no forced reconnect.
          </p>
        </div>
        <button className="lm-btn" onClick={runScan} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Radar className="h-4 w-4" />
          )}
          Scan nearby Wi‑Fi
        </button>
      </div>

      <div className="space-y-2">
        <div className="rounded border border-rose-400/40 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-50/95">
          <strong>(a) Controlled lab / defensive use only.</strong>{" "}
          <strong>(b) Safeguards:</strong> passive scan + ROE-gated selection;
          no deauth TX, no evil twin.{" "}
          <strong>(c) Law:</strong> UK <em>Computer Misuse Act 1990</em> — unauthorised
          access or acts impairing systems/networks (including wireless disruption of
          third parties) can be criminal. Deploy only with ownership/ROE and local
          counsel. See also{" "}
          <a className="underline text-cyan-200" href="/console/wids">
            WIDS
          </a>{" "}
          and{" "}
          <a className="underline text-cyan-200" href="/console/lab-wifi">
            lab simulator
          </a>
          .
        </div>
        <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
          {scan?.policy ||
            "Passive discovery only for networks you own or are authorized to assess."}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {selectionMsg ? (
        <p className="text-sm text-emerald-300">{selectionMsg}</p>
      ) : null}

      {scan ? (
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className={scan.live ? "lm-badge lm-badge-live" : "lm-badge lm-badge-warn"}>
            {scan.live ? "LIVE RADIO" : "DEMO DATASET"}
          </span>
          <span className="lm-badge">{scan.method}</span>
          <span className="lm-badge">{scan.platform}</span>
          <span className="lm-badge font-mono">{scan.scanId}</span>
        </div>
      ) : null}

      {scan?.warnings?.length ? (
        <ul className="text-[11px] text-[var(--lm-muted)]">
          {scan.warnings.map((w, i) => (
            <li key={i}>· {w}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Networks */}
        <div className="lm-panel rounded-lg p-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            <Wifi className="h-3.5 w-3.5" />
            Networks ({scan?.networks.length ?? 0})
          </div>
          <div className="max-h-[420px] space-y-1 overflow-auto">
            {(scan?.networks || []).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  setNetworkId(n.id);
                  setClientId("");
                }}
                className={cn(
                  "w-full rounded border px-3 py-2 text-left text-xs transition",
                  networkId === n.id
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : "border-[var(--lm-border)] hover:border-cyan-400/30"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--lm-text)]">
                    {n.ssid}
                  </span>
                  {n.hidden ? (
                    <span className="lm-badge lm-badge-warn">hidden</span>
                  ) : null}
                  <span className="lm-badge">{n.source}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-[var(--lm-muted)]">
                  {n.bssid}
                  {n.channel != null ? ` · ch ${n.channel}` : ""}
                  {n.rssi != null ? ` · ${n.rssi} dBm` : ""}
                  {n.security ? ` · ${n.security}` : ""}
                  {n.band ? ` · ${n.band}` : ""}
                </div>
              </button>
            ))}
            {!scan?.networks?.length ? (
              <div className="py-8 text-center text-sm text-[var(--lm-muted)]">
                Run a scan to list nearby APs
              </div>
            ) : null}
          </div>
        </div>

        {/* Clients */}
        <div className="lm-panel rounded-lg p-3">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Devices / clients
            {selectedNetwork ? ` near ${selectedNetwork.ssid}` : ""} (
            {clientsForNetwork.length})
          </div>
          <div className="max-h-[280px] space-y-1 overflow-auto">
            <button
              type="button"
              onClick={() => setClientId("")}
              className={cn(
                "w-full rounded border px-3 py-2 text-left text-xs",
                !clientId
                  ? "border-cyan-400/50 bg-cyan-400/10"
                  : "border-[var(--lm-border)]"
              )}
            >
              No specific client (AP only)
            </button>
            {clientsForNetwork.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClientId(c.id)}
                className={cn(
                  "w-full rounded border px-3 py-2 text-left text-xs transition",
                  clientId === c.id
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : "border-[var(--lm-border)] hover:border-cyan-400/30"
                )}
              >
                <div className="font-mono text-[var(--lm-text)]">{c.mac}</div>
                <div className="text-[10px] text-[var(--lm-muted)]">
                  {c.vendor || "unknown"}
                  {c.rssi != null ? ` · ${c.rssi} dBm` : ""}
                  {c.associatedBssid ? ` · AP ${c.associatedBssid}` : ""}
                  {` · ${c.source}`}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-[var(--lm-border)] pt-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              ROE attestation (required to lock target)
            </div>
            <input
              className="lm-input text-xs"
              value={engagementId}
              onChange={(e) => setEngagementId(e.target.value)}
              placeholder="engagementId"
            />
            <input
              className="lm-input text-xs"
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
              placeholder="legalBasis / ROE note"
            />
            <button
              className="lm-btn w-full"
              disabled={loading || !networkId}
              onClick={selectTarget}
            >
              Lock selected target
            </button>
            {selectedNetwork ? (
              <div className="rounded border border-[var(--lm-border)] bg-black/20 p-2 font-mono text-[10px] text-[var(--lm-muted)]">
                TARGET AP: {selectedNetwork.ssid} / {selectedNetwork.bssid}
                <br />
                CLIENT:{" "}
                {clientId
                  ? clientsForNetwork.find((c) => c.id === clientId)?.mac ||
                    clientId
                  : "(none)"}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="lm-panel rounded-lg p-3 text-[11px] text-[var(--lm-muted)]">
        <strong className="text-cyan-200">Explicitly disabled:</strong>{" "}
        deauthentication floods, client kick, evil-twin, handshake capture
        automation, and any “reveal hidden SSID via deauth” playbooks. For
        authorized wireless assessments, use dedicated licensed tooling under
        your ROE — Helixara only records passive discovery + target selection.
      </div>
    </div>
  );
}
