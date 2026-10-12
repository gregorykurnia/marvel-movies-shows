"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { moveEntry } from "@/actions/entries";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { TagFilter } from "@/components/tags/tag-filter";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { SegmentedLinks } from "@/components/ui/segmented-links";
import { useToast } from "@/components/ui/toast";
import type { CatalogEntry } from "@/lib/data/catalog";
import { decadeLabel, formatCount } from "@/lib/format";
import { reorderAfter } from "@/lib/ordering";
import { recapsHref, type RecapFilters } from "@/lib/recap-filters";

import { RecapRow } from "./recap-row";

export type FilterOption = { href: string; label: string; active: boolean };

// The custom-ordered recap list (IMPLEMENTATION_PLAN §5.1). Reorder mode turns on drag and drop. Each move
// shows at once, and rolls back with a message if the save fails. Filters live in the URL, so they are
// server-side, and reordering is off while any filter is on (a filtered view has no full order to move in).
export function RecapList({
  entries,
  totals,
  filtered,
  filters,
  tagOptions,
  watchedOptions,
  typeOptions,
}: {
  entries: CatalogEntry[];
  totals: { total: number; watched: number };
  filtered: boolean;
  filters: RecapFilters;
  tagOptions: string[];
  watchedOptions: FilterOption[];
  typeOptions: FilterOption[];
}) {
  const router = useRouter();
  const [reordering, setReordering] = useState(false);
  const reorderOn = reordering && !filtered;
  const [items, showMove] = useOptimistic(
    entries,
    (current: CatalogEntry[], move: { id: string; afterId: string | null }) =>
      reorderAfter(current, move.id, move.afterId),
  );
  const [, startTransition] = useTransition();
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Moves an entry to sit right after `afterId`. The screen updates first. The server's new order replaces
  // it after the save. If the save fails, the optimistic change is dropped and the old order comes back.
  function moveTo(id: string, afterId: string | null) {
    startTransition(async () => {
      showMove({ id, afterId });
      try {
        const result = await moveEntry({ entryId: id, afterId });
        if (!result.ok) toast(`Couldn't move it: ${result.message}`);
      } catch {
        toast("Couldn't save the new order, so it's been put back. Check your connection and try again.");
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    // After the move, the item above the dropped one is the new "after" neighbour.
    const next = arrayMove(items, from, to);
    moveTo(String(active.id), next[to - 1]?.id ?? null);
  }

  function moveByMenu(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 2 : index + 1;
    // Moving up: the new neighbour above is two places up. Moving down: it is the item below.
    moveTo(items[index].id, target < 0 ? null : items[target].id);
  }

  const rows = items.map((entry, index) => {
    const label = decadeLabel(entry.inUniverseYear);
    const previousLabel = index === 0 ? null : decadeLabel(items[index - 1].inUniverseYear);
    return { entry, index, label: label === previousLabel ? null : label };
  });

  const nothingMatches = filtered && entries.length === 0;

  return (
    <>
      <PageHeader
        accent="red"
        eyebrow={`Your order · ${formatCount(totals.total, "entry", "entries")}`}
        title="Recaps"
        actions={
          <>
            <Button
              variant="blue"
              aria-pressed={reorderOn}
              disabled={filtered}
              onClick={() => setReordering((on) => !on)}
            >
              {reorderOn ? "✓ Done reordering" : "⇅ Reorder"}
            </Button>
            <Link href="/titles" className={buttonVariants({ variant: "secondary" })}>
              Titles
            </Link>
            <Link href="/titles/new" className={buttonVariants({ variant: "primary" })}>
              ＋ Add title
            </Link>
          </>
        }
      >
        <ProgressBar
          ariaLabel="Overall watched progress"
          value={totals.total === 0 ? 0 : (totals.watched / totals.total) * 100}
          label={`${totals.watched} / ${totals.total} watched · ${
            totals.total === 0 ? 0 : Math.round((totals.watched / totals.total) * 100)
          }%`}
        />
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SegmentedLinks label="Watched filter" options={watchedOptions} />
        <SegmentedLinks label="Type filter" options={typeOptions} />
        <TagFilter
          value={filters.tag}
          options={tagOptions}
          onChange={(tag) => router.replace(recapsHref({ ...filters, tag }), { scroll: false })}
        />
        {filtered ? (
          <Link href="/recaps" scroll={false} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Clear filters
          </Link>
        ) : null}
        <span className="ml-auto font-mono text-[13px] font-bold text-ink-2 tabular-nums">
          {filtered ? `${entries.length} of ${totals.total} shown` : null}
        </span>
      </div>
      {filtered ? (
        <p className="-mt-2 mb-4 text-[13px] text-ink-3">Clear the filters to reorder the list.</p>
      ) : null}

      {totals.total === 0 ? (
        <EmptyState
          icon="★"
          title="No recaps yet"
          action={
            <Link href="/titles/new" className={buttonVariants({ variant: "primary" })}>
              ＋ Add title
            </Link>
          }
        >
          Add a movie or a show. Its recaps will show up here in the order you choose.
        </EmptyState>
      ) : nothingMatches ? (
        <EmptyState
          icon="★"
          title="Nothing matches these filters"
          action={
            <Link href="/recaps" scroll={false} className={buttonVariants({ variant: "secondary" })}>
              Clear filters
            </Link>
          }
        >
          Try the other watched or type filter.
        </EmptyState>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <ol aria-label="Recaps in order" className="grid gap-3">
              {rows.map(({ entry, index, label }) => (
                <RecapRow
                  key={entry.id}
                  entry={entry}
                  groupLabel={label}
                  reorderable={reorderOn}
                  canMoveUp={index > 0}
                  canMoveDown={index < items.length - 1}
                  onMove={(direction) => moveByMenu(index, direction)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}
