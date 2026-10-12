"use client";

import { X } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. A 34px pill with an outline and a caret. When active it turns violet and shows a ✕ to clear it.
export function FilterChip({
  children,
  active = false,
  onRemove,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[34px] items-center gap-2 rounded-pill border-2 border-line bg-surface font-body text-[13px] font-bold leading-none",
        active && "border-violet bg-violet-soft text-violet-ink",
        onRemove ? "pr-1.5 pl-3" : "px-3",
        className,
      )}
    >
      <button
        type="button"
        className="cursor-pointer bg-transparent p-0 [color:inherit] [font:inherit]"
        {...props}
      >
        {children}
      </button>
      {active && onRemove ? (
        <button
          type="button"
          aria-label="Remove filter"
          onClick={onRemove}
          className="grid size-5 cursor-pointer place-items-center rounded-full bg-violet text-on-violet"
        >
          <X aria-hidden strokeWidth={3} className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
