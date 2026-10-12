"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Chip, EpisodeCode, Year } from "@/components/ui/chip";
import { ActionMenu } from "@/components/ui/dropdown-menu";
import type { CatalogEntry } from "@/lib/data/catalog";
import { formatEpisodeCode, formatYear } from "@/lib/format";
import { cn } from "@/lib/utils";

import { WatchedControl } from "./watched-control";

// One row in the recap list (DESIGN_GUIDE §7, "Recap row"). A kind bar (red for a movie, blue for a show), the
// title, a meta line, and the watched chip. Unwatched rows are dashed and flat. In Reorder mode the row also has
// a drag handle and a "⋯" menu with Move up and Move down. The group label moves with its row.
export function RecapRow({
  entry,
  groupLabel,
  reorderable,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  entry: CatalogEntry;
  groupLabel: string | null;
  reorderable: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: entry.id,
    disabled: !reorderable,
  });

  const isMovie = entry.titleKind === "movie";
  const episodeName = entry.name ?? `Episode ${entry.episodeNumber}`;
  const heading = isMovie ? entry.titleName : `${entry.titleName} — ${episodeName}`;
  const code = formatEpisodeCode(entry.seasonNumber, entry.episodeNumber);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("list-none", isDragging && "relative z-10")}
    >
      {groupLabel ? (
        <p className="mt-2 mb-0.5 flex items-center gap-2.5 font-mono text-xs font-bold leading-none tracking-[.08em] text-ink-3 uppercase after:h-0.5 after:flex-1 after:bg-line-soft after:content-['']">
          {groupLabel}
        </p>
      ) : null}
      <article
        data-dragging={isDragging ? "" : undefined}
        // The row a dragged item would drop onto. Tests wait for it before dropping.
        data-over={isOver && !isDragging ? "" : undefined}
        className={cn(
          "flex items-center gap-3.5 rounded-panel border-2 border-line bg-surface py-3.5 pr-3 pl-2.5 shadow-pop",
          !entry.watched && "border-dashed bg-paper shadow-none",
          isDragging && "rotate-[-0.35deg] border-blue shadow-[8px_8px_0_var(--blue)]",
        )}
      >
        {reorderable ? (
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Drag ${heading} to reorder`}
            className="grid size-[42px] shrink-0 cursor-grab touch-none place-items-center rounded-pill border-2 border-transparent bg-transparent text-ink-3 hover:bg-surface-2 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden strokeWidth={2.25} className="size-[18px]" />
          </button>
        ) : null}
        <span
          aria-hidden
          className={cn("min-h-[52px] w-1.5 shrink-0 self-stretch rounded-sm", isMovie ? "bg-movie" : "bg-show")}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight font-bold tracking-[-0.01em]">
            <Link
              href={`/recaps/${entry.id}`}
              className={cn("no-underline hover:underline hover:underline-offset-4", !entry.watched && "text-ink-2")}
            >
              {heading}
            </Link>
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <Chip tone={isMovie ? "movie" : "show"} dot>
              {isMovie ? "Movie" : "Show"}
            </Chip>
            {code ? <EpisodeCode>{code}</EpisodeCode> : null}
            <Year>{formatYear(entry.inUniverseYear)}</Year>
            {entry.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} tone="tag">
                {tag}
              </Chip>
            ))}
          </div>
        </div>
        <WatchedControl entryId={entry.id} watched={entry.watched} className="shrink-0" />
        {reorderable ? (
          <ActionMenu
            label={`More actions for ${heading}`}
            items={[
              { label: "Move up", onSelect: () => onMove("up"), disabled: !canMoveUp },
              { label: "Move down", onSelect: () => onMove("down"), disabled: !canMoveDown },
            ]}
          />
        ) : null}
      </article>
    </li>
  );
}
