import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. Dashed outline, halftone background, a tilted yellow icon tile with a pop shadow,
// an H3, one sentence, and one primary action.
export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "halftone rounded-panel border-2 border-dashed border-ink-3 px-6 py-11 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="mx-auto mb-4 grid size-21 -rotate-5 place-items-center rounded-[24px] border-2 border-line bg-yellow text-[38px] leading-none text-on-yellow shadow-pop"
      >
        {icon}
      </div>
      <h3 className="mb-1.5 font-display text-[22px] font-bold">{title}</h3>
      {children ? (
        <div className="mx-auto mb-[18px] max-w-[40ch] text-ink-2">{children}</div>
      ) : null}
      {action ? <div className="flex justify-center">{action}</div> : null}
    </section>
  );
}
