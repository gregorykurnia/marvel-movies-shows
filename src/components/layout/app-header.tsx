import Link from "next/link";
import { Suspense } from "react";

import { SearchBox } from "@/components/ui/search-box";

import { ActiveNavList } from "./active-nav-list";
import { NavList } from "./nav";
import { ThemeToggle } from "./theme-toggle";

// DESIGN_GUIDE §6, "App header". Logo, nav pills (the active one is filled ink), search and the theme toggle.
// Under 860px the nav drops to a scrollable pill row below the header, and the search fills the width.
export function AppHeader() {
  return (
    <header className="border-b-2 border-line bg-surface">
      <div className="flex h-16 items-center gap-4 px-5 max-[520px]:gap-2.5 max-[520px]:px-3.5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-display text-[19px] font-extrabold tracking-[-0.02em] whitespace-nowrap no-underline"
        >
          <span
            aria-hidden
            className="grid size-[34px] -rotate-6 place-items-center rounded-[10px] border-2 border-line bg-yellow text-lg text-on-yellow shadow-[2px_2px_0_var(--shadow-ink)]"
          >
            ★
          </span>
          <span className="max-[520px]:sr-only">Marvel Directory</span>
        </Link>

        <nav aria-label="Sections" className="hidden gap-0.5 min-[860px]:flex">
          <Suspense fallback={<NavList variant="desktop" />}>
            <ActiveNavList variant="desktop" />
          </Suspense>
        </nav>

        <SearchBox className="ml-auto w-[260px] max-[860px]:ml-0 max-[860px]:w-auto max-[860px]:flex-1" />
        <ThemeToggle />
      </div>

      <nav
        aria-label="Sections"
        className="flex gap-1 overflow-x-auto border-t-2 border-line px-3 py-2 [scrollbar-width:none] min-[860px]:hidden [&::-webkit-scrollbar]:hidden"
      >
        <Suspense fallback={<NavList variant="mobile" />}>
          <ActiveNavList variant="mobile" />
        </Suspense>
      </nav>
    </header>
  );
}
