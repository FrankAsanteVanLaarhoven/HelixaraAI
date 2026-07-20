/**
 * Passive Wi‑Fi discovery for authorized lab / owned networks only.
 * NO deauth, NO aireplay, NO forced disconnects, NO hidden-SSID active attacks.
 *
 * Platforms:
 * - macOS: `airport -s` or system_profiler when available
 * - Linux: `nmcli` / `iw` when available
 * - Otherwise: structured lab demo dataset (clearly labeled)
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { emitEvent } from "@/modules/events/bus";
import { uid } from "@/lib/utils";

const execFileAsync = promisify(execFile);

export interface WifiNetwork {
  id: string;
  ssid: string;
  bssid: string;
  channel?: number;
  rssi?: number;
  security?: string;
  band?: string;
  hidden?: boolean;
  source: "live" | "demo";
}

export interface WifiClient {
  id: string;
  mac: string;
  vendor?: string;
  associatedBssid?: string;
  rssi?: number;
  source: "live" | "demo";
}

export interface WifiScanResult {
  scanId: string;
  ts: string;
  platform: string;
  method: string;
  live: boolean;
  networks: WifiNetwork[];
  clients: WifiClient[];
  selected?: {
    networkId?: string;
    clientId?: string;
  };
  warnings: string[];
  policy: string;
}

export interface WifiSelection {
  networkId: string;
  clientId?: string;
  engagementId?: string;
  legalBasis?: string;
}

const lastScan: { result: WifiScanResult | null; selection: WifiSelection | null } =
  {
    result: null,
    selection: null,
  };

const POLICY =
  "Passive discovery only for networks you own or are authorized to assess under ROE. HelixaraAI does not perform deauthentication, evil-twin, or forced reconnection attacks.";

function demoNetworks(): WifiNetwork[] {
  return [
    {
      id: "net_lab_alpha",
      ssid: "HELIXARA-LAB",
      bssid: "aa:bb:cc:11:22:01",
      channel: 6,
      rssi: -42,
      security: "WPA2-PSK",
      band: "2.4GHz",
      source: "demo",
    },
    {
      id: "net_lab_5g",
      ssid: "HELIXARA-LAB-5G",
      bssid: "aa:bb:cc:11:22:05",
      channel: 36,
      rssi: -55,
      security: "WPA3-SAE",
      band: "5GHz",
      source: "demo",
    },
    {
      id: "net_guest",
      ssid: "Office-Guest",
      bssid: "d4:6e:0e:12:34:56",
      channel: 11,
      rssi: -68,
      security: "Open",
      band: "2.4GHz",
      source: "demo",
    },
    {
      id: "net_iot",
      ssid: "IoT-Segment",
      bssid: "f0:9f:c2:ab:cd:ef",
      channel: 1,
      rssi: -72,
      security: "WPA2-PSK",
      band: "2.4GHz",
      source: "demo",
    },
    {
      id: "net_hidden_demo",
      ssid: "<hidden / not broadcast>",
      bssid: "00:11:22:33:44:55",
      channel: 44,
      rssi: -61,
      security: "WPA2-Enterprise",
      band: "5GHz",
      hidden: true,
      source: "demo",
    },
  ];
}

function demoClients(): WifiClient[] {
  return [
    {
      id: "cli_1",
      mac: "3c:22:fb:10:20:30",
      vendor: "Apple",
      associatedBssid: "aa:bb:cc:11:22:01",
      rssi: -48,
      source: "demo",
    },
    {
      id: "cli_2",
      mac: "a4:83:e7:aa:bb:01",
      vendor: "Samsung",
      associatedBssid: "aa:bb:cc:11:22:01",
      rssi: -59,
      source: "demo",
    },
    {
      id: "cli_3",
      mac: "b8:27:eb:00:11:22",
      vendor: "Raspberry Pi",
      associatedBssid: "f0:9f:c2:ab:cd:ef",
      rssi: -70,
      source: "demo",
    },
    {
      id: "cli_4",
      mac: "dc:a6:32:fe:dc:ba",
      vendor: "Unknown",
      associatedBssid: "d4:6e:0e:12:34:56",
      rssi: -75,
      source: "demo",
    },
  ];
}

async function scanMacosAirport(): Promise<{
  networks: WifiNetwork[];
  method: string;
} | null> {
  const airport =
    "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport";
  try {
    const { stdout } = await execFileAsync(airport, ["-s"], {
      timeout: 20_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const lines = stdout.split("\n").slice(1).filter(Boolean);
    const networks: WifiNetwork[] = [];
    for (const line of lines) {
      // SSID can have spaces — airport pads columns; rough parse from end
      const m = line.match(
        /^(.+?)\s+([0-9a-f:]{17})\s+(-?\d+)\s+[^\s]+\s+(\d+)/i
      );
      if (!m) continue;
      const ssid = m[1].trim() || "<hidden / empty SSID>";
      const bssid = m[2].toLowerCase();
      networks.push({
        id: `net_${bssid.replace(/:/g, "")}`,
        ssid,
        bssid,
        rssi: Number(m[3]),
        channel: Number(m[4]),
        hidden: !m[1].trim(),
        source: "live",
      });
    }
    if (!networks.length) return null;
    return { networks, method: "macos-airport -s" };
  } catch {
    return null;
  }
}

async function scanLinuxNmcli(): Promise<{
  networks: WifiNetwork[];
  method: string;
} | null> {
  try {
    const { stdout } = await execFileAsync(
      "nmcli",
      [
        "-t",
        "-f",
        "SSID,BSSID,CHAN,SIGNAL,SECURITY",
        "dev",
        "wifi",
        "list",
      ],
      { timeout: 25_000, maxBuffer: 2 * 1024 * 1024 }
    );
    const networks: WifiNetwork[] = [];
    for (const line of stdout.split("\n").filter(Boolean)) {
      // nmcli escapes : as \:
      const parts = line.split(/(?<!\\):/).map((p) => p.replace(/\\:/g, ":"));
      const [ssid, bssid, chan, signal, security] = parts;
      if (!bssid) continue;
      networks.push({
        id: `net_${bssid.replace(/:/g, "").toLowerCase()}`,
        ssid: ssid || "<hidden / empty SSID>",
        bssid: bssid.toLowerCase(),
        channel: chan ? Number(chan) : undefined,
        rssi: signal ? -Math.abs(100 - Number(signal)) : undefined,
        security: security || undefined,
        hidden: !ssid,
        source: "live",
      });
    }
    if (!networks.length) return null;
    return { networks, method: "linux-nmcli" };
  } catch {
    return null;
  }
}

/**
 * Passive client enumeration is OS-limited without monitor mode.
 * We never invent attack paths; return demo clients tagged as such when live AP scan only.
 */
export async function runWifiScan(): Promise<WifiScanResult> {
  const platform = process.platform;
  const warnings: string[] = [];
  let networks: WifiNetwork[] = [];
  let method = "demo";
  let live = false;

  if (platform === "darwin") {
    const r = await scanMacosAirport();
    if (r) {
      networks = r.networks;
      method = r.method;
      live = true;
      warnings.push(
        "Client STA list requires monitor-mode tooling; showing lab demo clients linked by BSSID when available."
      );
    }
  } else if (platform === "linux") {
    const r = await scanLinuxNmcli();
    if (r) {
      networks = r.networks;
      method = r.method;
      live = true;
      warnings.push(
        "Passive nmcli scan — associated client MACs need authorized monitor mode (not enabled here)."
      );
    }
  } else {
    warnings.push(`Platform ${platform}: live scan not implemented — demo dataset.`);
  }

  if (!networks.length) {
    networks = demoNetworks();
    method = "demo-fallback";
    live = false;
    warnings.push(
      "No live radio scan available (permissions, driver, or tool missing). Using labeled demo lab networks."
    );
  }

  // Clients: always demo-associated unless we later add passive monitor capture
  const clients = demoClients().map((c) => {
    // Prefer attach demo clients to first live network if present
    if (live && networks[0] && c.associatedBssid?.startsWith("aa:bb:cc")) {
      return {
        ...c,
        associatedBssid: networks[0].bssid,
        source: "demo" as const,
      };
    }
    return c;
  });

  const result: WifiScanResult = {
    scanId: uid("wscan"),
    ts: new Date().toISOString(),
    platform,
    method,
    live,
    networks,
    clients,
    selected: lastScan.selection
      ? {
          networkId: lastScan.selection.networkId,
          clientId: lastScan.selection.clientId,
        }
      : undefined,
    warnings,
    policy: POLICY,
  };

  lastScan.result = result;

  emitEvent({
    type: "agent.task",
    source: "wireless.scan",
    severity: "info",
    title: `Wi‑Fi scan · ${networks.length} APs · ${live ? "live" : "demo"}`,
    payload: {
      scanId: result.scanId,
      method,
      live,
      networkCount: networks.length,
    },
  });

  return result;
}

export function selectWifiTarget(sel: WifiSelection): {
  ok: boolean;
  error?: string;
  selection?: WifiSelection & {
    network?: WifiNetwork;
    client?: WifiClient;
  };
} {
  if (!sel.engagementId || !sel.legalBasis) {
    return {
      ok: false,
      error:
        "Selection requires engagementId + legalBasis (ROE / ownership attestation).",
    };
  }
  const scan = lastScan.result;
  if (!scan) {
    return { ok: false, error: "Run a scan first." };
  }
  const network = scan.networks.find((n) => n.id === sel.networkId);
  if (!network) {
    return { ok: false, error: "Unknown networkId — refresh scan." };
  }
  let client: WifiClient | undefined;
  if (sel.clientId) {
    client = scan.clients.find((c) => c.id === sel.clientId);
    if (!client) {
      return { ok: false, error: "Unknown clientId." };
    }
  }

  lastScan.selection = sel;
  scan.selected = {
    networkId: sel.networkId,
    clientId: sel.clientId,
  };

  emitEvent({
    type: "agent.task",
    source: "wireless.select",
    severity: "info",
    title: `Wi‑Fi target selected · ${network.ssid}`,
    payload: {
      bssid: network.bssid,
      clientMac: client?.mac,
      engagementId: sel.engagementId,
      legalBasis: sel.legalBasis,
    },
  });

  return {
    ok: true,
    selection: { ...sel, network, client },
  };
}

export function getWifiState() {
  return {
    lastScan: lastScan.result,
    selection: lastScan.selection,
    policy: POLICY,
    capabilities: {
      passiveScan: true,
      selectNetwork: true,
      selectClient: true,
      deauth: false,
      evilTwin: false,
      forceReconnect: false,
    },
  };
}
