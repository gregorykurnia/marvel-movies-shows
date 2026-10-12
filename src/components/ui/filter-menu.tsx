"use client";

import { X } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useState } from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7, "Filter chip". A 34px pill with an outline and a caret. Chosen, it turns violet, shows its value,
// and has a round ✕ to clear it. The options open in a floating list, one value at a time.
export function FilterMenu({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== null;
  const chosen = options.find((option) => option.value === value);

  return (
    <div
      className={cn(
        "inline-flex h-[34px] items-center gap-1 rounded-pill border-2 border-line bg-surface font-body text-[13px] leading-none font-bold",
        active ? "border-violet bg-violet-soft pr-1.5 pl-3 text-violet-ink" : "px-3",
      )}
    >
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          className={cn(
            "inline-flex h-full cursor-pointer items-center gap-1.5 bg-transparent p-0 font-bold [color:inherit] [font:inherit]",
          )}
        >
          <span>
            {label}
            {chosen ? `: ${chosen.label}` : ""}
          </span>
          <span aria-hidden className="text-[11px]">
            ▾
          </span>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 max-h-[min(340px,70dvh)] w-[min(280px,calc(100vw-24px))] overflow-y-auto rounded-input border-2 border-line bg-surface p-1.5 shadow-float"
          >
            <p className="px-2.5 pt-1.5 pb-2 font-mono text-[11px] font-bold tracking-[.08em] text-ink-3 uppercase">
              {label}
            </p>
            {[{ value: "", label: "Any" }, ...options].map((option) => {
              const selected = option.value === "" ? value === null : option.value === value;
              return (
                <button
                  key={option.value || "any"}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(option.value === "" ? null : option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium",
                    selected ? "bg-blue-soft font-bold text-blue-ink" : "hover:bg-surface-2",
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selected ? <span aria-hidden>✓</span> : null}
                </button>
              );
            })}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {active ? (
        <button
          type="button"
          aria-label={`Remove ${label} filter`}
          onClick={() => onChange(null)}
          className="grid size-5 cursor-pointer place-items-center rounded-full bg-violet text-on-violet"
        >
          <X aria-hidden strokeWidth={3} className="size-3" />
        </button>
      ) : null}
    </div>
  );
}
