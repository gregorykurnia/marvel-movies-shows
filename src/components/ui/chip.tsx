import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §2 and §7. Each colour has one meaning. Movie is red, show is blue, short is orange, watched is green.
export const chipVariants = cva(
  [
    "inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-pill border-[1.5px] border-transparent",
    "px-2.5 font-body text-xs font-bold leading-none",
  ],
  {
    variants: {
      tone: {
        movie: "bg-movie-soft text-movie-ink",
        show: "bg-show-soft text-show-ink",
        short: "bg-short-soft text-short-ink",
        alive: "bg-green-soft text-green-ink",
        deceased: "bg-surface-2 text-ink-3",
        unknown: "bg-yellow-soft text-yellow-ink",
        major: "bg-violet text-on-violet",
        minor: "border-violet bg-transparent text-violet-ink",
        universe: "bg-cyan-soft font-mono text-cyan-ink",
        tag: "bg-surface-2 text-ink-2 before:-mr-0.5 before:text-ink-3 before:content-['#']",
        watched: "bg-green text-on-green",
        unwatched: "border-dashed border-ink-3 bg-transparent text-ink-3",
      },
    },
    defaultVariants: { tone: "tag" },
  },
);

export type ChipProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof chipVariants> & {
    // Leading dot, used on Movie, Show and the status chips.
    dot?: boolean;
  };

export function Chip({ tone, dot, className, children, ...props }: ChipProps) {
  return (
    <span className={cn(chipVariants({ tone }), className)} {...props}>
      {dot ? (
        <span aria-hidden className="size-2 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}

// The episode code (S01·E01) and year treatment from §7: mono, with the code on a tinted tag.
export function EpisodeCode({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-bold text-ink-2">
      {children}
    </span>
  );
}

export function Year({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[13px] font-bold tabular-nums text-ink-2">
      {children}
    </span>
  );
}
