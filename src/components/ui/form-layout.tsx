import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Panel } from "./panel";

// DESIGN_GUIDE §8, "Form". One panel holds the form grid (2 columns, stacking under 640px). The footer
// holds Cancel (ghost), Save & add another (secondary) and Save (primary), in that order, right aligned.
export function FormPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <Panel className={cn("p-5 min-[640px]:p-6", className)}>{children}</Panel>;
}

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-[18px] min-[640px]:grid-cols-2", className)}>{children}</div>
  );
}

// Spans both columns of a FormGrid.
export const wide = "min-[640px]:col-span-2";

export function FormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t-[1.5px] border-line-soft pt-5">
      {children}
    </div>
  );
}

// A form-level problem (not tied to one field), such as "that episode already exists". Read by screen readers.
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mb-4 rounded-input border-2 border-red bg-red-soft px-3.5 py-2.5 text-sm font-bold text-red-ink">
      {children}
    </p>
  );
}
