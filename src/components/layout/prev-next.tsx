import Link from "next/link";

import { Panel } from "@/components/ui/panel";

// DESIGN_GUIDE §8, "Detail". Previous and next panels. On a recap they follow the custom order.
export type Neighbour = { href: string; title: string } | null;

export function PrevNext({ previous, next }: { previous: Neighbour; next: Neighbour }) {
  return (
    <nav aria-label="Previous and next" className="mt-7 grid grid-cols-2 gap-3">
      <NeighbourCard label="← Previous" neighbour={previous} emptyText="Start of the list" />
      <NeighbourCard label="Next →" neighbour={next} emptyText="End of the list" align="right" />
    </nav>
  );
}

function NeighbourCard({
  label,
  neighbour,
  emptyText,
  align = "left",
}: {
  label: string;
  neighbour: Neighbour;
  emptyText: string;
  align?: "left" | "right";
}) {
  if (!neighbour) {
    return (
      <div className="grid place-items-center rounded-panel border-2 border-dashed border-ink-3 p-4 text-center text-sm text-ink-3">
        {emptyText}
      </div>
    );
  }
  return (
    <Link href={neighbour.href} className="no-underline">
      <Panel interactive className={`h-full p-4 ${align === "right" ? "text-right" : ""}`}>
        <small className="mb-1.5 block font-mono text-[11px] leading-none font-bold tracking-[.08em] text-ink-3 uppercase">
          {label}
        </small>
        <b className="font-display text-base leading-tight font-bold">{neighbour.title}</b>
      </Panel>
    </Link>
  );
}
