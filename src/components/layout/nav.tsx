import Link from "next/link";

import { cn } from "@/lib/utils";

// Main sections. Keep in step with PRODUCT_PLAN.md §2 and IMPLEMENTATION_PLAN.md §4.
export const navItems = [
  { href: "/recaps", label: "Recaps" },
  { href: "/titles", label: "Titles" },
  { href: "/timeline", label: "Timeline" },
  { href: "/characters", label: "Characters" },
  { href: "/universes", label: "Universes" },
  { href: "/backup", label: "Backup" },
] as const;

export function isActivePath(pathname: string | undefined, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Plain links with no hooks, so the header can render them on the server. activePath is set from the client
// (see active-nav-list.tsx). Without it, no link is marked active. That's the server and fallback markup.
export function NavList({
  variant,
  activePath,
}: {
  variant: "desktop" | "mobile";
  activePath?: string;
}) {
  return navItems.map((item) => {
    const active = isActivePath(activePath, item.href);
    if (variant === "desktop") {
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "rounded-pill px-3 py-2 text-sm font-bold no-underline transition-colors duration-token",
            active ? "bg-ink text-paper" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      );
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "shrink-0 rounded-pill px-3 py-1.5 text-[13px] font-bold whitespace-nowrap no-underline",
          active ? "bg-ink text-paper" : "text-ink-2",
        )}
      >
        {item.label}
      </Link>
    );
  });
}
