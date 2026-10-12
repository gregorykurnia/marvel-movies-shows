import type { ReactNode } from "react";

import { AppHeader } from "./app-header";

// DESIGN_GUIDE §6 and §11. Every page renders inside this shell: the five-colour stripe, the header, then the content.
// The content sits in a 1200px column with 16px gutters on phones and 32px on desktop. The page never scrolls sideways.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-pill focus:border-2 focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:font-bold"
      >
        Skip to content
      </a>
      <div aria-hidden className="flex h-1.5">
        <span className="flex-1 bg-red" />
        <span className="flex-1 bg-yellow" />
        <span className="flex-1 bg-blue" />
        <span className="flex-1 bg-green" />
        <span className="flex-1 bg-violet" />
      </div>
      <AppHeader />
      <main
        id="main"
        className="mx-auto w-full min-w-0 max-w-[1200px] flex-1 px-4 pt-6 pb-8 min-[768px]:px-8 max-[520px]:pt-5 max-[520px]:pb-7"
      >
        {children}
      </main>
    </div>
  );
}
