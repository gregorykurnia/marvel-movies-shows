import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. Shaped like the final content, with a gentle 1.2s pulse. Never a lone spinner.
// Motion is turned off globally under prefers-reduced-motion (globals.css).
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-[10px] bg-surface-2 [animation:skeleton-pulse_1.2s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}
