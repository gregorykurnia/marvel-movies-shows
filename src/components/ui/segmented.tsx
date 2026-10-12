"use client";

import { ToggleGroup } from "radix-ui";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. A pill group with a 2px outline and dividers. The selected segment is ink-filled.
// Used for Watched / Not watched, Movies / Shows and timeline zoom. Arrow keys move between segments.
export function Segmented({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  className,
}: {
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      defaultValue={defaultValue}
      // Radix sends "" when the selected segment is clicked again. Keep the current choice.
      onValueChange={(next) => {
        if (next) onValueChange?.(next);
      }}
      className={cn(
        "inline-flex overflow-hidden rounded-pill border-2 border-line bg-surface",
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className="cursor-pointer bg-transparent px-3.5 py-2.5 font-body text-[13px] font-bold leading-none text-ink-2 transition-colors duration-token [&+&]:border-l-2 [&+&]:border-line data-[state=on]:bg-ink data-[state=on]:text-paper"
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
