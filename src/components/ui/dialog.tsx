"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Eyebrow, type Accent } from "./eyebrow";

// DESIGN_GUIDE §7. A large panel with a pop-lg shadow, over a 40% ink backdrop.
// The header matches the page header, without the halftone. Esc and the ✕ close it. Focus stays inside.
export function Dialog({
  trigger,
  eyebrow,
  accent = "red",
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  eyebrow?: ReactNode;
  accent?: Accent;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[min(calc(100vw-32px),520px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
            "rounded-modal border-2 border-line bg-surface p-6 shadow-pop-lg",
          )}
        >
          {eyebrow ? <Eyebrow accent={accent}>{eyebrow}</Eyebrow> : null}
          <DialogPrimitive.Title className="pr-12 font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em]">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1.5 text-sm text-ink-2">
              {description}
            </DialogPrimitive.Description>
          ) : null}
          <div className="mt-5">{children}</div>
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-4 right-4 grid size-[42px] cursor-pointer place-items-center rounded-pill border-2 border-transparent bg-transparent text-ink transition-colors duration-token hover:bg-surface-2"
          >
            <X aria-hidden strokeWidth={2.5} className="size-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
