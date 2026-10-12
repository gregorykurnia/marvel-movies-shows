import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §8, "Message". Used for 404 and the error boundary. A centred panel with a tilted icon tile,
// an H1, one sentence, and actions.
export function MessagePanel({
  icon,
  title,
  children,
  actions,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "halftone mx-auto mt-6 max-w-[560px] rounded-panel border-2 border-line bg-surface px-6 py-12 text-center shadow-pop",
        className,
      )}
    >
      <div
        aria-hidden
        className="mx-auto mb-5 grid size-21 -rotate-5 place-items-center rounded-[24px] border-2 border-line bg-yellow text-[38px] leading-none text-on-yellow shadow-pop"
      >
        {icon}
      </div>
      <h1 className="mb-2.5 font-display text-[clamp(28px,4.2vw,40px)] leading-[1.05] font-extrabold tracking-[-0.02em]">
        {title}
      </h1>
      <div className="mx-auto mb-6 max-w-[42ch] text-[15px] text-ink-2">{children}</div>
      {actions ? <div className="flex flex-wrap justify-center gap-2.5">{actions}</div> : null}
    </section>
  );
}
