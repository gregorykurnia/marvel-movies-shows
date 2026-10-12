"use client";

import { useSyncExternalStore } from "react";

// True when the query matches. Server rendering and hydration use `serverValue`, then the real value takes over.
// The timeline needs this at 700px: a hover popover on wide screens, and tap-to-expand inline below it.
export function useMediaQuery(query: string, serverValue = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

// The timeline's wide layout starts at 700px (DESIGN_GUIDE §5).
export const TIMELINE_WIDE = "(min-width: 700px)";
