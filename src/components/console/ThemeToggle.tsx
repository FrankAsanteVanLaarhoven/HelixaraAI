"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/modules/theme/context";
import { cn } from "@/lib/utils";

const OPTIONS: {
  id: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, resolved, setPreference, cycle } = useTheme();

  if (compact) {
    const Icon =
      preference === "light" ? Sun : preference === "dark" ? Moon : Monitor;
    return (
      <button
        type="button"
        className="lm-btn px-2 py-1.5"
        onClick={cycle}
        title={`Theme: ${preference} (${resolved})`}
        aria-label={`Theme ${preference}, click to cycle`}
      >
        <Icon className="h-3.5 w-3.5" />
        {!compact ? preference : null}
      </button>
    );
  }

  return (
    <div
      className="inline-flex items-center rounded border border-[var(--lm-border)] bg-[var(--lm-panel)] p-0.5"
      role="group"
      aria-label="Theme mode"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = preference === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPreference(opt.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition",
              active
                ? "bg-cyan-400/15 text-[var(--lm-cyan)]"
                : "text-[var(--lm-muted)] hover:text-[var(--lm-text)]"
            )}
            title={
              opt.id === "system"
                ? `System (currently ${resolved})`
                : opt.label
            }
            aria-pressed={active}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
