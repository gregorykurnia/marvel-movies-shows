"use client";

import { MoreHorizontal } from "lucide-react";
import { DropdownMenu as Menu } from "radix-ui";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §10. Every drag action also has a menu path ("Move up" / "Move down"), so keyboard and
// screen reader users never need to drag. A floating panel with the shadow-float token.
export function ActionMenu({
  label,
  items,
}: {
  label: string;
  items: { label: string; onSelect: () => void; disabled?: boolean }[];
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        className="grid size-[42px] cursor-pointer place-items-center rounded-pill border-2 border-transparent bg-transparent text-ink transition-colors duration-token hover:bg-surface-2 data-[state=open]:bg-surface-2"
      >
        <MoreHorizontal aria-hidden strokeWidth={2.5} className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[180px] rounded-input border-2 border-line bg-surface p-1.5 shadow-float"
        >
          {items.map((item) => (
            <Menu.Item
              key={item.label}
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm font-semibold outline-none",
                "data-[highlighted]:bg-blue-soft data-[highlighted]:text-blue-ink",
                "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
              )}
            >
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
