import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Each section has one accent colour (DESIGN_GUIDE §2, "Section accents"). The page header uses it for
// the eyebrow bar and the halftone corner. Each entry sets --accent (the fill), --accent-ink (text on paper)
// and --on-accent (text on the fill).
export const accentClasses = {
  red: "[--accent:var(--red)] [--accent-ink:var(--red-ink)] [--on-accent:var(--on-red)]",
  blue: "[--accent:var(--blue)] [--accent-ink:var(--blue-ink)] [--on-accent:var(--on-blue)]",
  violet: "[--accent:var(--violet)] [--accent-ink:var(--violet-ink)] [--on-accent:var(--on-violet)]",
  green: "[--accent:var(--green)] [--accent-ink:var(--green-ink)] [--on-accent:var(--on-green)]",
  orange: "[--accent:var(--orange)] [--accent-ink:var(--orange-ink)] [--on-accent:var(--on-orange)]",
} as const;

export type Accent = keyof typeof accentClasses;

// Mono uppercase context above a page title, e.g. "LOKI · SEASON 1 · EPISODE 1".
export function Eyebrow({
  accent = "red",
  className,
  children,
}: {
  accent?: Accent;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "mb-2.5 flex items-center gap-2 whitespace-nowrap font-mono text-xs font-bold uppercase leading-none tracking-[.1em] text-(--accent-ink)",
        "before:h-1 before:w-[18px] before:rounded-sm before:bg-(--accent) before:content-['']",
        accentClasses[accent],
        className,
      )}
    >
      {children}
    </p>
  );
}
