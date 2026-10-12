import type {
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. An outlined panel that scrolls sideways inside itself. The page never scrolls sideways.
export function TableWrap({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-panel border-2 border-line bg-surface shadow-pop",
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(
        "w-full min-w-[860px] border-collapse text-sm",
        className,
      )}
      {...props}
    />
  );
}

// Header row: surface-2, mono uppercase 12px, 2px bottom outline. A sorted column shows a red arrow.
export function Th({
  sorted,
  sortDirection,
  className,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & {
  sorted?: boolean;
  sortDirection?: "asc" | "desc";
}) {
  return (
    <th
      scope="col"
      aria-sort={
        sorted ? (sortDirection === "desc" ? "descending" : "ascending") : undefined
      }
      className={cn(
        "whitespace-nowrap border-b-2 border-line bg-surface-2 px-3.5 py-3.5 text-left font-mono text-xs font-bold uppercase tracking-[.06em]",
        sorted ? "text-ink" : "text-ink-2",
        className,
      )}
      {...props}
    >
      {children}
      {sorted ? (
        <span aria-hidden className="ml-1 text-red">
          {sortDirection === "desc" ? "▼" : "▲"}
        </span>
      ) : null}
    </th>
  );
}

// Rows: 1.5px soft dividers, yellow-soft on hover.
export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b-[1.5px] border-line-soft transition-colors duration-token last:border-b-0 hover:bg-yellow-soft",
        className,
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3.5 py-3 align-middle", className)} {...props} />;
}
