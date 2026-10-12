import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. A 42px pill with a magnifier and a ⌘K hint (the hint is hidden on phones).
// Phase 0 renders the control only. Results and the ⌘K / "/" shortcuts arrive in Phase 4.
export function SearchBox({ className }: { className?: string }) {
  return (
    <form
      role="search"
      action="/search"
      className={cn(
        "flex h-[42px] min-w-0 items-center gap-2.5 rounded-pill border-2 border-line bg-surface py-0 pr-2 pl-3.5 transition-[box-shadow,border-color] duration-token ease-token focus-within:border-blue focus-within:shadow-[0_0_0_4px_var(--blue-soft),3px_3px_0_var(--blue)]",
        className,
      )}
    >
      <Search aria-hidden strokeWidth={2.5} className="size-[18px] shrink-0 text-ink-2" />
      <label htmlFor="site-search" className="sr-only">
        Search
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        placeholder="Search…"
        className="min-w-0 flex-1 bg-transparent font-body text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none"
      />
      <kbd className="shrink-0 rounded-md border-[1.5px] border-line-soft bg-surface-2 px-1.5 py-1.5 font-mono text-[11px] leading-none font-bold text-ink-3 max-[860px]:hidden">
        ⌘K
      </kbd>
    </form>
  );
}
