"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { FastForward, GripVertical, History, Rewind, type LucideIcon } from "lucide-react";
import { HoverCard } from "radix-ui";
import { useId, useState, type CSSProperties, type ReactNode } from "react";

import { Chip, Year } from "@/components/ui/chip";
import { ActionMenu } from "@/components/ui/dropdown-menu";
import type { TimelineEvent, TimelineItem } from "@/lib/data/timeline";
import { formatYear } from "@/lib/format";
import { TIME_JUMP_LABEL, type TimeJumpKind } from "@/lib/time-jump";
import { cn } from "@/lib/utils";

import { useMediaQuery, TIMELINE_WIDE } from "./use-media-query";

// The event card on the timeline (DESIGN_GUIDE §7, "Timeline pin"). A small card with a dot in the title's colour.
// On wide screens its details open in a portalled popover on hover or focus, which closes on Esc. Below 700px the
// details open inline on tap. Popover links are not in the tab order, so a keyboard user gets the same links as
// visually hidden links that show when focused.
//
// A recap item (IMPLEMENTATION_PLAN §5.2) uses the same card, with a "From recap" label and the recap's universe. It has
// no edit-event link and no drag handle or ⋯ menu, because it is shown from its recap and can't be moved.
//
// A time jump item (Phase 8) is a recap item for another year. It has its kind label in place of "From recap", the
// title after it, a hollow dot and a tinted card, so it never reads as the title's main story. Dashed borders stay
// reserved for events without a title.

const KIND_COLOUR = { movie: "var(--movie)", show: "var(--show)", short: "var(--short)", none: "var(--ink-3)" } as const;

// One icon per kind of other year. The icon always sits beside the kind's name, so the kind is never shown by colour
// alone.
const JUMP_ICON: Record<TimeJumpKind, LucideIcon> = {
  flashback: Rewind,
  flash_forward: FastForward,
  time_travel: History,
};

function kindOf(item: TimelineItem): keyof typeof KIND_COLOUR {
  return item.titleKind ?? "none";
}

// The links in a card's details. An event links to its recap (if it has one) and to its edit page. A recap item and a
// time jump item both link to their recap and to the recap's edit page.
function linksFor(item: TimelineItem): { readHref: string | null; editHref: string; editLabel: string } {
  if (item.source === "event") {
    return {
      readHref: item.entryId ? `/recaps/${item.entryId}` : null,
      editHref: `/timeline/${item.id}/edit`,
      editLabel: "Edit event",
    };
  }
  return { readHref: `/recaps/${item.entryId}`, editHref: `/recaps/${item.entryId}/edit`, editLabel: "Edit recap" };
}

// The universe of a recap item or a time jump item (Phase 9, Phase 10). The card and the popover both use this, so the
// chip is the same in both places. Nothing is drawn when the item has no universe.
function UniverseNote({ name, variant }: { name: string | null; variant: "card" | "popover" }) {
  if (!name) return null;
  if (variant === "card") {
    return (
      <span className="mb-1 block max-w-full">
        <Chip tone="universe" className="max-w-full truncate font-mono text-[10px]">
          {name}
        </Chip>
      </span>
    );
  }
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[13px] font-semibold text-ink-2">
      Universe: <Chip tone="universe">{name}</Chip>
    </p>
  );
}

// A time jump's kind: its icon and name, in mono capitals.
function JumpKindLabel({ kind, className }: { kind: TimeJumpKind; className?: string }) {
  const Icon = JUMP_ICON[kind];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono font-bold tracking-[0.06em] uppercase", className)}>
      <Icon aria-hidden strokeWidth={2.25} className="size-3 shrink-0" />
      {TIME_JUMP_LABEL[kind]}
    </span>
  );
}

// The popover and inline panel share one body. `interactive` is false inside the popover, which is visual only.
function EventDetails({ item, interactive }: { item: TimelineItem; interactive: boolean }) {
  const kind = kindOf(item);
  const links = linksFor(item);
  const jump = item.source === "jump" ? item : null;
  // A recap or jump item always has a title, so its chip is the show name or "Movie" or "Short".
  const chipText = item.source === "event" ? item.titleName : item.chip;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        {jump ? (
          <JumpKindLabel kind={jump.jumpKind} className="text-[12px] text-ink-2" />
        ) : chipText ? (
          <Chip tone={kind === "none" ? "tag" : kind} dot>
            {chipText}
          </Chip>
        ) : (
          <Chip tone="tag">No title</Chip>
        )}
        <Year>{formatYear(item.year)}</Year>
      </div>
      <h4 className="mt-2 font-display text-[17px] leading-[1.25] font-bold tracking-[-0.01em]">{item.text}</h4>
      {item.source === "recap" ? <UniverseNote name={item.universeName} variant="popover" /> : null}
      {jump ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] leading-normal font-semibold text-ink-2">
          <Chip tone={kind === "none" ? "tag" : kind} dot>
            {jump.chip}
          </Chip>
          <span className="min-w-0 break-words">
            {jump.titleName}
            {jump.episodeLabel ? ` · ${jump.episodeLabel}` : ""}
          </span>
        </div>
      ) : null}
      {jump && jump.mainYear !== null ? (
        <p className="mt-1.5 font-mono text-[13px] font-bold tabular-nums text-ink-2">
          Main story: {formatYear(jump.mainYear)}
        </p>
      ) : null}
      {jump ? <UniverseNote name={jump.universeName} variant="popover" /> : null}
      {item.source === "event" && item.details ? (
        <p className="mt-1.5 text-sm leading-normal whitespace-pre-line text-ink-2">{item.details}</p>
      ) : null}
      {item.tags.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <Chip key={tag} tone="tag">
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold">
        {links.readHref ? (
          <Link
            href={links.readHref}
            tabIndex={interactive ? undefined : -1}
            className="text-red-ink no-underline hover:underline"
          >
            Read recap →
          </Link>
        ) : null}
        <Link
          href={links.editHref}
          tabIndex={interactive ? undefined : -1}
          className="text-ink-2 underline underline-offset-[3px]"
        >
          {links.editLabel}
        </Link>
      </div>
    </>
  );
}

// One event, recap item or time jump item on the axis. `reorder` is set only for a hand-written event in Reorder mode:
// the drag handle and the ⋯ menu, built by the sortable wrapper, so the card itself never touches a ref.
export function EventCard({ item, reorder }: { item: TimelineItem; reorder?: { handle: ReactNode; menu: ReactNode } }) {
  const wide = useMediaQuery(TIMELINE_WIDE);
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const kind = kindOf(item);
  const links = linksFor(item);
  const style = { "--kind": KIND_COLOUR[kind] } as CSSProperties;
  // Below 700px a tap opens the details inline. Reorder mode has no details, so the pin only drags there.
  const tapToExpand = !wide && !reorder;

  const pin = (
    <button
      type="button"
      style={style}
      aria-expanded={tapToExpand ? expanded : undefined}
      aria-controls={tapToExpand ? panelId : undefined}
      onClick={tapToExpand ? () => setExpanded((open) => !open) : undefined}
      className={cn(
        "block w-[136px] cursor-pointer rounded-[12px] border-2 border-line p-2.5 text-left font-body text-[13px] leading-[1.35] font-semibold text-ink",
        item.source === "jump" ? "bg-surface-2" : "bg-surface",
        "shadow-[3px_3px_0_var(--kind)] transition-[transform,box-shadow] duration-token ease-token",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--kind)]",
        "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-blue",
        "max-[699px]:w-full",
        kind === "none" && "border-dashed",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mb-1.5 block size-2.5 rounded-full border-[1.5px] border-line bg-[var(--kind)]",
          item.source === "jump" && "border-[2.5px] border-[var(--kind)] bg-surface-2",
        )}
      />
      {item.source === "recap" ? (
        <span className="mb-0.5 block font-mono text-[10px] font-bold tracking-[0.06em] text-ink-3 uppercase">From recap</span>
      ) : null}
      {item.source === "jump" ? (
        <span className="mb-0.5 block font-mono text-[10px] font-bold tracking-[0.06em] text-ink-2 uppercase break-words">
          <JumpKindLabel kind={item.jumpKind} className="text-[10px]" />
          <span className="block">{item.titleName}</span>
        </span>
      ) : null}
      {item.source !== "event" ? <UniverseNote name={item.universeName} variant="card" /> : null}
      {item.text}
    </button>
  );

  return (
    <div className="grid w-full min-w-0 gap-2">
      <div className="flex min-w-0 items-start gap-1.5">
        {reorder ? (
          <>
            {reorder.handle}
            <div className="min-w-0 flex-1">{pin}</div>
            {reorder.menu}
          </>
        ) : wide ? (
          <HoverCard.Root openDelay={120} closeDelay={80}>
            <HoverCard.Trigger asChild>{pin}</HoverCard.Trigger>
            <HoverCard.Portal>
              <HoverCard.Content
                side="bottom"
                align="center"
                sideOffset={10}
                collisionPadding={12}
                className="z-50 w-[260px] rounded-input border-2 border-line bg-surface p-4 shadow-float"
              >
                <EventDetails item={item} interactive={false} />
              </HoverCard.Content>
            </HoverCard.Portal>
          </HoverCard.Root>
        ) : (
          pin
        )}
      </div>

      {/* Keyboard path to the popover's links. Hidden until one of them has focus. */}
      {!reorder && wide ? (
        <span className="flex flex-wrap gap-2">
          {links.readHref ? (
            <Link href={links.readHref} className="sr-only text-[13px] font-bold text-red-ink focus:not-sr-only">
              Read recap for “{item.text}”
            </Link>
          ) : null}
          <Link href={links.editHref} className="sr-only text-[13px] font-bold text-ink-2 focus:not-sr-only">
            {item.source === "event" ? `Edit “${item.text}”` : `Edit recap for “${item.text}”`}
          </Link>
        </span>
      ) : null}

      {tapToExpand && expanded ? (
        <div id={panelId} className="rounded-panel border-2 border-line bg-surface p-3.5 shadow-pop">
          <EventDetails item={item} interactive />
        </div>
      ) : null}
    </div>
  );
}

// An event card in Reorder mode, sortable within its year. The year's list is a SortableContext in TimelineView.
export function SortableEvent({
  event,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  event: TimelineEvent;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: event.id });

  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      aria-label={`Drag “${event.text}” to reorder within ${formatYear(event.year)}`}
      className="mt-0.5 grid size-[34px] shrink-0 cursor-grab touch-none place-items-center rounded-pill border-2 border-transparent bg-transparent text-ink-3 hover:bg-surface-2 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden strokeWidth={2.25} className="size-[18px]" />
    </button>
  );

  const menu = (
    <ActionMenu
      label={`More actions for “${event.text}”`}
      items={[
        { label: "Move up", onSelect: () => onMove("up"), disabled: !canMoveUp },
        { label: "Move down", onSelect: () => onMove("down"), disabled: !canMoveDown },
      ]}
    />
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("list-none", isDragging && "relative z-10")}
    >
      <div
        data-dragging={isDragging ? "" : undefined}
        // The card a dragged event would drop onto. Tests wait for it before dropping (see RecapRow).
        data-over={isOver && !isDragging ? "" : undefined}
        className={cn(
          "rounded-input border-2 border-line bg-surface p-1.5",
          isDragging && "rotate-[-0.35deg] border-blue shadow-[8px_8px_0_var(--blue)]",
        )}
      >
        <EventCard item={event} reorder={{ handle, menu }} />
      </div>
    </li>
  );
}
