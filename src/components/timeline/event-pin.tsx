"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { HoverCard } from "radix-ui";
import { useId, useState, type CSSProperties, type ReactNode } from "react";

import { Chip, Year } from "@/components/ui/chip";
import { ActionMenu } from "@/components/ui/dropdown-menu";
import type { TimelineEvent } from "@/lib/data/timeline";
import { formatYear } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useMediaQuery, TIMELINE_WIDE } from "./use-media-query";

// The event card on the timeline (DESIGN_GUIDE §7, "Timeline pin"). A small card with a dot in the title's colour.
// On wide screens its details open in a portalled popover on hover or focus, which closes on Esc. Below 700px the
// details open inline on tap. Popover links are not in the tab order, so a keyboard user gets the same links as
// visually hidden links that show when focused.

const KIND_COLOUR = { movie: "var(--movie)", show: "var(--show)", none: "var(--ink-3)" } as const;

function kindOf(event: TimelineEvent): keyof typeof KIND_COLOUR {
  return event.titleKind ?? "none";
}

// The popover and inline panel share one body. `interactive` is false inside the popover, which is visual only.
function EventDetails({ event, interactive }: { event: TimelineEvent; interactive: boolean }) {
  const kind = kindOf(event);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        {event.titleName ? (
          <Chip tone={kind === "none" ? "tag" : kind} dot>
            {event.titleName}
          </Chip>
        ) : (
          <Chip tone="tag">No title</Chip>
        )}
        <Year>{formatYear(event.year)}</Year>
      </div>
      <h4 className="mt-2 font-display text-[17px] leading-[1.25] font-bold tracking-[-0.01em]">{event.text}</h4>
      {event.details ? (
        <p className="mt-1.5 text-sm leading-normal whitespace-pre-line text-ink-2">{event.details}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold">
        {event.entryId ? (
          <Link
            href={`/recaps/${event.entryId}`}
            tabIndex={interactive ? undefined : -1}
            className="text-red-ink no-underline hover:underline"
          >
            Read recap →
          </Link>
        ) : null}
        <Link
          href={`/timeline/${event.id}/edit`}
          tabIndex={interactive ? undefined : -1}
          className="text-ink-2 underline underline-offset-[3px]"
        >
          Edit event
        </Link>
      </div>
    </>
  );
}

// One event on the axis. `reorder` is set only in Reorder mode: the drag handle and the ⋯ menu, built by the
// sortable wrapper, so the card itself never touches a ref.
export function EventCard({ event, reorder }: { event: TimelineEvent; reorder?: { handle: ReactNode; menu: ReactNode } }) {
  const wide = useMediaQuery(TIMELINE_WIDE);
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const kind = kindOf(event);
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
        "block w-[136px] cursor-pointer rounded-[12px] border-2 border-line bg-surface p-2.5 text-left font-body text-[13px] leading-[1.35] font-semibold text-ink",
        "shadow-[3px_3px_0_var(--kind)] transition-[transform,box-shadow] duration-token ease-token",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--kind)]",
        "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-blue",
        "max-[699px]:w-full",
        kind === "none" && "border-dashed",
      )}
    >
      <span aria-hidden className="mb-1.5 block size-2.5 rounded-full border-[1.5px] border-line bg-[var(--kind)]" />
      {event.text}
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
                <EventDetails event={event} interactive={false} />
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
          {event.entryId ? (
            <Link
              href={`/recaps/${event.entryId}`}
              className="sr-only text-[13px] font-bold text-red-ink focus:not-sr-only"
            >
              Read recap for “{event.text}”
            </Link>
          ) : null}
          <Link href={`/timeline/${event.id}/edit`} className="sr-only text-[13px] font-bold text-ink-2 focus:not-sr-only">
            Edit “{event.text}”
          </Link>
        </span>
      ) : null}

      {tapToExpand && expanded ? (
        <div id={panelId} className="rounded-panel border-2 border-line bg-surface p-3.5 shadow-pop">
          <EventDetails event={event} interactive />
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
        <EventCard event={event} reorder={{ handle, menu }} />
      </div>
    </li>
  );
}
