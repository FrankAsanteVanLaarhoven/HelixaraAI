"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { EthicalGate } from "@/components/console/EthicalGate";

function WorkspaceInner() {
  const params = useSearchParams();
  const side = (params.get("side") || "red") as "red" | "blue" | "purple";
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/v1/ethical?section=workspace&side=${side}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [side]);

  const title = String(data?.title || "Workspace");
  const focus = String(data?.focus || "");
  const links = (data?.links as string[]) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["red", "blue", "purple"] as const).map((s) => (
          <Link
            key={s}
            href={`/console/redteam/workspace?side=${s}`}
            className={
              side === s ? "lm-btn py-1 text-xs" : "lm-btn py-1 text-xs opacity-50"
            }
          >
            {s.toUpperCase()}
          </Link>
        ))}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Workspace
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-[var(--lm-muted)]">{focus}</p>
      </div>
      <div className="lm-panel rounded-lg p-4">
        <div className="mb-2 text-[11px] uppercase text-[var(--lm-muted)]">
          Quick links
        </div>
        <ul className="flex flex-wrap gap-2">
          {links.map((href) => (
            <li key={href}>
              <Link href={href} className="lm-btn py-1 text-xs">
                {href}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <pre className="lm-panel max-h-[50vh] overflow-auto rounded-lg p-4 font-mono text-[11px] text-[var(--lm-muted)]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <EthicalGate title="Red / Blue / Purple workspaces">
      <Suspense
        fallback={
          <div className="text-sm text-[var(--lm-muted)]">Loading workspace…</div>
        }
      >
        <WorkspaceInner />
      </Suspense>
    </EthicalGate>
  );
}
