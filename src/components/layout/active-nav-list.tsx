"use client";

import { usePathname } from "next/navigation";

import { NavList } from "./nav";

// Reads the current path to mark the active section. Kept in its own client component inside a Suspense
// boundary, so the rest of the header can be prerendered (usePathname needs a boundary on dynamic routes).
export function ActiveNavList({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();
  return <NavList variant={variant} activePath={pathname} />;
}
