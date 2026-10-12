import type { ReactNode } from "react";

import { accentClasses, Eyebrow, type Accent } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

// DESIGN_GUIDE §6. Every page starts with this. A panel with an eyebrow, an H1, an optional subtitle or
// progress bar, actions on the right (they wrap below on phones), and a halftone corner in the section accent.
export function PageHeader({
  accent = "red",
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  accent?: Accent;
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative mb-6 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-panel border-2 border-line bg-surface px-[22px] pt-[22px] pb-5 shadow-pop",
        accentClasses[accent],
        className,
      )}
    >
      <div className="relative z-10 min-w-0 flex-1">
        <Eyebrow accent={accent}>{eyebrow}</Eyebrow>
        <h1 className="font-display text-[clamp(28px,4.2vw,40px)] leading-[1.05] font-extrabold tracking-[-0.02em]">
          {title}
        </h1>
        {subtitle ? <div className="mt-1.5 text-[15px] text-ink-2">{subtitle}</div> : null}
        {children ? <div className="mt-2 max-w-[420px]">{children}</div> : null}
      </div>
      {actions ? (
        <div className="relative z-10 flex flex-wrap gap-2.5">{actions}</div>
      ) : null}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2.5 -right-2.5 h-[140px] w-[200px] bg-[radial-gradient(var(--accent)_1.6px,transparent_1.9px)] bg-[length:11px_11px] opacity-[.35] [-webkit-mask-image:radial-gradient(circle_at_top_right,black_20%,transparent_70%)] [mask-image:radial-gradient(circle_at_top_right,black_20%,transparent_70%)]"
      />
    </header>
  );
}
