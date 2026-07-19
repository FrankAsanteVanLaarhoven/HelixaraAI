import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  tone = "cyan",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "cyan" | "amber" | "green" | "red";
}) {
  const toneClass = {
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    green: "text-emerald-300",
    red: "text-rose-300",
  }[tone];

  return (
    <div className="lm-panel rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--lm-muted)]">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass)}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-[11px] text-[var(--lm-muted)]">{hint}</div>
      ) : null}
    </div>
  );
}
