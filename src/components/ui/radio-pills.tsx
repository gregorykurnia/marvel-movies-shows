"use client";

import { RadioGroup } from "radix-ui";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. For short fixed choices of four or fewer. A row of outlined pills.
// The selected pill takes its meaning's colour (Alive green, Major violet) and a 2px shadow.
const toneClasses = {
  green:
    "data-[state=checked]:bg-green data-[state=checked]:text-on-green",
  violet:
    "data-[state=checked]:bg-violet data-[state=checked]:text-on-violet",
  neutral:
    "data-[state=checked]:bg-surface-2 data-[state=checked]:text-ink",
  // Movie is red, show is blue and short is orange, everywhere (DESIGN_GUIDE §2).
  red: "data-[state=checked]:bg-red data-[state=checked]:text-on-red",
  blue: "data-[state=checked]:bg-blue data-[state=checked]:text-on-blue",
  orange: "data-[state=checked]:bg-orange data-[state=checked]:text-on-orange",
  // Unknown status, and the warning colour.
  yellow: "data-[state=checked]:bg-yellow data-[state=checked]:text-on-yellow",
} as const;

// Each option can set its own tone, since Status is green on Alive only. The group tone is the fallback.
export function RadioPills({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  tone = "neutral",
  name,
  className,
}: {
  label: string;
  options: { value: string; label: string; tone?: keyof typeof toneClasses }[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  tone?: keyof typeof toneClasses;
  name?: string;
  className?: string;
}) {
  return (
    <RadioGroup.Root
      aria-label={label}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-pill border-2 border-line bg-surface px-3.5 py-2 font-body text-sm font-bold leading-none transition-[box-shadow,background-color] duration-token data-[state=checked]:shadow-[2px_2px_0_var(--shadow-ink)]",
            toneClasses[option.tone ?? tone],
          )}
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
