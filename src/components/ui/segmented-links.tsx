import Link from "next/link";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7, "Segmented control", for filters that live in the URL. Each segment is a link, so the
// filter works without JavaScript and can be bookmarked. The active one is ink-filled, like Segmented.
export function SegmentedLinks({
  label,
  options,
  className,
}: {
  label: string;
  options: { href: string; label: string; active: boolean }[];
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn("inline-flex overflow-hidden rounded-pill border-2 border-line bg-surface", className)}
    >
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          scroll={false}
          aria-current={option.active ? "true" : undefined}
          className={cn(
            "px-3.5 py-2.5 font-body text-[13px] leading-none font-bold no-underline transition-colors duration-token [&+&]:border-l-2 [&+&]:border-line",
            option.active ? "bg-ink text-paper" : "text-ink-2 hover:bg-surface-2",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
