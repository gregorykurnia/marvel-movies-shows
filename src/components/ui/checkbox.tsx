"use client";

import { Check, Minus } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

// A row checkbox (Phase 12). A native checkbox, so the keyboard and screen readers work as usual, drawn as a 22px
// box with a violet fill when ticked. The label around it is a 40×40px hit target (DESIGN_GUIDE §10). "mixed" is
// the in-between state for a select-all when only some rows are ticked.
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean | "mixed";
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = checked === "mixed";
  }, [checked]);

  return (
    <label className={cn("relative grid size-10 shrink-0 cursor-pointer place-items-center", className)}>
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked === true}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="peer absolute inset-0 size-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden
        className={cn(
          "grid size-[22px] place-items-center rounded-md border-2 border-line bg-surface text-on-violet transition-colors duration-token",
          checked !== false && "border-violet bg-violet",
          "peer-focus-visible:[outline:3px_solid_var(--focus)] peer-focus-visible:outline-offset-2",
        )}
      >
        {checked === true ? <Check strokeWidth={3.5} className="size-3.5" /> : null}
        {checked === "mixed" ? <Minus strokeWidth={3.5} className="size-3.5" /> : null}
      </span>
    </label>
  );
}
