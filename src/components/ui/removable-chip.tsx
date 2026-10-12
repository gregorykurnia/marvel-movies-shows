import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// A chip with a ✕ to take it off again. Used for the multi-select picker (IMPLEMENTATION_PLAN §5.4).
export function RemovableChip({
  children,
  removeLabel,
  onRemove,
  className,
}: {
  children: ReactNode;
  removeLabel: string;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-pill border-2 border-line bg-surface py-1 pr-1 pl-3 text-[13px] leading-none font-semibold",
        className,
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full bg-surface-2 text-ink transition-colors duration-token hover:bg-red-soft hover:text-red-ink"
      >
        <X aria-hidden strokeWidth={3} className="size-3" />
      </button>
    </span>
  );
}
