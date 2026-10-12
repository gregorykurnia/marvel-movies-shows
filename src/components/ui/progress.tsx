import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. 14px pill track. The fill has green diagonal stripes with an ink edge.
// The label sits beside it in mono, e.g. "4 / 6" or "38%".
export function ProgressBar({
  value,
  label,
  ariaLabel,
  className,
}: {
  value: number;
  label?: string;
  ariaLabel: string;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className="h-3.5 flex-1 overflow-hidden rounded-pill border-2 border-line bg-surface-2"
      >
        <div
          className="h-full border-r-2 border-line bg-[repeating-linear-gradient(-45deg,var(--green)_0_8px,color-mix(in_srgb,var(--green)_78%,var(--surface))_8px_16px)] transition-[width] duration-token ease-token"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label ? (
        <span className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums">
          {label}
        </span>
      ) : null}
    </div>
  );
}
