"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type FormEvent } from "react";
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

import { moveEvent as moveEventAction } from "@/actions/events";
import { EmptyState } from "@/components/layout/empty-state";
import { TagFilter } from "@/components/tags/tag-filter";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import type { TimelineEvent } from "@/lib/data/timeline";
import {
  bucketStart,
  gapLabel,
  layoutAxis,
  moveWithinYear,
  neighbourForMove,
  ZOOMS,
  type AxisItem,
  type AxisSlot,
  type Zoom,
} from "@/lib/timeline-layout";
import { formatCount, formatYear } from "@/lib/format";
import { cn } from "@/lib/utils";

import { EventCard, SortableEvent } from "./event-pin";

export type TypeFilter = "all" | "movie" | "show";

const ZOOM_LABELS: Record<Zoom, string> = { year: "Year", decade: "Decade", century: "Century" };
const TYPE_LABELS: Record<TypeFilter, string> = { all: "All", movie: "Movies", show: "Shows" };
const TYPE_OPTIONS = (["all", "movie", "show"] as const).map((value) => ({ value, label: TYPE_LABELS[value] }));

// The timeline (DESIGN_GUIDE §8, Canvas; IMPLEMENTATION_PLAN §5.2). Events are placed by year on a compressed axis.
// Empty years collapse into gap markers. Zoom groups years into decades or centuries, and clicking a group zooms
// into it. Reorder mode moves events within their year, and each move shows at once. It rolls back if the save fails.
export function TimelineView({
  events,
  initialType,
  initialTag,
}: {
  events: TimelineEvent[];
  initialType: TypeFilter;
  initialTag: string | null;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [type, setType] = useState<TypeFilter>(initialType);
  const [tag, setTag] = useState<string | null>(initialTag);
  const [zoom, setZoom] = useState<Zoom>("year");
  const [reordering, setReordering] = useState(false);
  const [jumpText, setJumpText] = useState("");
  const [jumpMessage, setJumpMessage] = useState<string | null>(null);
  const [items, showMove] = useOptimistic(
    events,
    (current: TimelineEvent[], move: { id: string; afterId: string | null }) =>
      moveWithinYear(current, move.id, move.afterId),
  );
  // Set when a bucket is clicked, so the year it zooms into can be scrolled to after the zoom changes.
  const pendingScroll = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Keep the address bar in step with the filters, so a filtered view can be bookmarked.
  useEffect(() => {
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (tag) params.set("tag", tag);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [type, tag]);

  useEffect(() => {
    if (pendingScroll.current === null) return;
    document.getElementById(`slot-${pendingScroll.current}`)?.scrollIntoView({ inline: "center", block: "nearest" });
    pendingScroll.current = null;
  }, [zoom]);

  // Every tag used on an event, once each, for the tag filter.
  const tagOptions = useMemo(
    () => [...new Set(events.flatMap((event) => event.tags))].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    [events],
  );
  const shown = useMemo(
    () =>
      items.filter(
        (event) =>
          (type === "all" || event.titleKind === type) &&
          (tag === null || event.tags.some((name) => name.toLowerCase() === tag.toLowerCase())),
      ),
    [items, type, tag],
  );
  const axis = useMemo(() => layoutAxis(shown, zoom), [shown, zoom]);
  // Reordering needs every event of a year in view, so it's off while a filter hides some, and above year zoom.
  const filtered = type !== "all" || tag !== null;
  const reorderOn = reordering && zoom === "year" && !filtered;

  const range = events.length
    ? `${formatYear(events[0].year)} to ${formatYear(Math.max(...events.map((event) => event.year)))}`
    : null;

  // Moves one event, after `afterId` (null: first in its year). The screen updates first. If the save fails, the
  // optimistic change is dropped and the old order comes back.
  function moveTo(event: TimelineEvent, afterId: string | null) {
    startTransition(async () => {
      showMove({ id: event.id, afterId });
      try {
        const result = await moveEventAction({ eventId: event.id, afterId });
        if (!result.ok) toast(`Couldn't move it: ${result.message}`);
      } catch {
        toast("Couldn't save the new order, so it's been put back. Check your connection and try again.");
      }
    });
  }

  function onDragEnd(drag: DragEndEvent) {
    const { active, over } = drag;
    if (!over || active.id === over.id) return;
    const moving = items.find((event) => event.id === active.id);
    const target = items.find((event) => event.id === over.id);
    // Only within one year. Dropping on another year does nothing.
    if (!moving || !target || moving.year !== target.year) return;
    const group = items.filter((event) => event.year === moving.year);
    const from = group.findIndex((event) => event.id === moving.id);
    const to = group.findIndex((event) => event.id === target.id);
    // After the move, the event above the dropped one is the new "after" neighbour.
    const next = arrayMove(group, from, to);
    moveTo(moving, next[to - 1]?.id ?? null);
  }

  function moveByMenu(group: TimelineEvent[], event: TimelineEvent, direction: "up" | "down") {
    const step = neighbourForMove(group, event.id, direction);
    if (step) moveTo(event, step.afterId);
  }

  function zoomInto(bucket: AxisSlot<TimelineEvent>) {
    const next: Zoom = zoom === "century" ? "decade" : "year";
    pendingScroll.current = Math.min(...bucket.items.map((event) => bucketStart(event.year, next)));
    setZoom(next);
  }

  // The year nearest the one typed. Years are whole numbers, and "−" is accepted for negative years.
  function onJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = jumpText.trim().replaceAll("−", "-");
    if (!/^-?\d+$/.test(text)) {
      setJumpMessage("Enter a year, such as 1945 or −5000.");
      return;
    }
    const target = Number(text);
    const slots = axis.filter((item) => item.kind === "slot");
    if (slots.length === 0) {
      setJumpMessage("There are no events to jump to yet.");
      return;
    }
    const nearest = slots.reduce((best, slot) =>
      Math.abs(slot.start - target) < Math.abs(best.start - target) ? slot : best,
    );
    setJumpMessage(null);
    document.getElementById(`slot-${nearest.start}`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  function clearFilters() {
    setType("all");
    setTag(null);
  }

  return (
    <>
      <PageHeader
        accent="orange"
        eyebrow={range ? `${formatCount(events.length, "event")} · ${range}` : "Timeline"}
        title="Timeline"
        actions={
          <Link href="/timeline/new" className={buttonVariants({ variant: "primary" })}>
            ＋ Add event
          </Link>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon="◷"
          title="No events yet"
          action={
            <Link href="/timeline/new" className={buttonVariants({ variant: "primary" })}>
              ＋ Add event
            </Link>
          }
        >
          Write down what happened and in which year. Events are placed by year, and the axis only shows years that have one.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <Segmented
              label="Type filter"
              value={type}
              onValueChange={(value) => setType(value as TypeFilter)}
              options={TYPE_OPTIONS}
            />
            <TagFilter value={tag} options={tagOptions} onChange={setTag} />
            <Segmented
              label="Zoom"
              value={zoom}
              onValueChange={(value) => setZoom(value as Zoom)}
              options={ZOOMS.map((value) => ({ value, label: ZOOM_LABELS[value] }))}
            />
            <form onSubmit={onJump} className="flex items-center gap-2" noValidate>
              <label className="flex h-[42px] items-center rounded-pill border-2 border-line bg-surface pr-1.5 pl-3.5 focus-within:border-blue focus-within:shadow-[0_0_0_4px_var(--blue-soft),3px_3px_0_var(--blue)]">
                <span className="sr-only">Jump to year</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={jumpText}
                  onChange={(event) => setJumpText(event.target.value)}
                  placeholder="Jump to year"
                  aria-invalid={jumpMessage ? true : undefined}
                  className="w-[130px] bg-transparent font-mono text-sm font-bold text-ink placeholder:font-body placeholder:font-medium placeholder:text-ink-3 focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-[30px] cursor-pointer rounded-pill bg-surface-2 px-3 text-[13px] font-bold text-ink hover:bg-line-soft"
                >
                  Go
                </button>
              </label>
            </form>
            <Button
              variant="blue"
              aria-pressed={reorderOn}
              disabled={zoom !== "year" || filtered}
              onClick={() => setReordering((on) => !on)}
              className="ml-auto"
            >
              {reorderOn ? "✓ Done reordering" : "⇅ Reorder"}
            </Button>
          </div>
          {jumpMessage ? (
            <p role="status" className="-mt-2 mb-3 text-[13px] font-semibold text-red-ink">
              {jumpMessage}
            </p>
          ) : null}
          {zoom !== "year" || filtered ? (
            <p className="-mt-2 mb-3 text-[13px] text-ink-3">
              {zoom !== "year" ? "Zoom to the year level to reorder events." : "Clear the filters to reorder events."}
            </p>
          ) : null}

          {shown.length === 0 ? (
            <EmptyState
              icon="◷"
              title="Nothing matches this filter"
              action={
                <button type="button" onClick={clearFilters} className={buttonVariants({ variant: "secondary" })}>
                  Show all events
                </button>
              }
            >
              No events match these filters yet.
            </EmptyState>
          ) : (
            <Canvas
              axis={axis}
              zoom={zoom}
              reorderOn={reorderOn}
              sensors={sensors}
              onDragEnd={onDragEnd}
              onMove={moveByMenu}
              onZoomInto={zoomInto}
            />
          )}
        </>
      )}
    </>
  );
}

// The full-width visual. Horizontal and scrollable inside its own panel on wide screens, vertical below 700px.
function Canvas({
  axis,
  zoom,
  reorderOn,
  sensors,
  onDragEnd,
  onMove,
  onZoomInto,
}: {
  axis: AxisItem<TimelineEvent>[];
  zoom: Zoom;
  reorderOn: boolean;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  onMove: (group: TimelineEvent[], event: TimelineEvent, direction: "up" | "down") => void;
  onZoomInto: (bucket: AxisSlot<TimelineEvent>) => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <div
        role="region"
        aria-label="Timeline"
        tabIndex={0}
        className="relative overflow-x-auto px-4 pt-3 pb-6 min-[700px]:px-5 min-[700px]:pt-4"
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <ol
            className={cn(
              "relative flex flex-col pl-9",
              "min-[700px]:min-w-max min-[700px]:flex-row min-[700px]:pt-[18px] min-[700px]:pl-0",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-0 bottom-0 left-[11px] w-1.5 rounded-sm bg-ink",
                "min-[700px]:top-[30px] min-[700px]:right-0 min-[700px]:bottom-auto min-[700px]:left-0 min-[700px]:h-1.5 min-[700px]:w-auto",
              )}
            />
            {axis.map((item) =>
              item.kind === "gap" ? (
                <li
                  key={item.key}
                  className="relative z-[1] flex list-none flex-col items-start py-1 min-[700px]:w-[104px] min-[700px]:items-center min-[700px]:pt-[26px]"
                >
                  <span className="-ml-9 rounded-pill border-[1.5px] border-dashed border-ink-3 bg-surface px-2 py-1.5 font-mono text-[11px] leading-none font-bold whitespace-nowrap text-ink-2 min-[700px]:ml-0">
                    ⋯ {gapLabel(item.years)} ⋯
                  </span>
                </li>
              ) : (
                <Slot
                  key={item.key}
                  slot={item}
                  zoom={zoom}
                  reorderOn={reorderOn}
                  onMove={onMove}
                  onZoomInto={onZoomInto}
                />
              ),
            )}
          </ol>
        </DndContext>
      </div>
    </Panel>
  );
}

// One slot on the axis: a year (or a decade or century bucket) with its events.
function Slot({
  slot,
  zoom,
  reorderOn,
  onMove,
  onZoomInto,
}: {
  slot: AxisSlot<TimelineEvent>;
  zoom: Zoom;
  reorderOn: boolean;
  onMove: (group: TimelineEvent[], event: TimelineEvent, direction: "up" | "down") => void;
  onZoomInto: (bucket: AxisSlot<TimelineEvent>) => void;
}) {
  const id = `slot-${slot.start}`;

  // Decade and century zoom show counts. A click zooms into the group.
  if (zoom !== "year") {
    return (
      <li id={id} className="relative z-[1] flex list-none flex-col items-start min-[700px]:w-[160px] min-[700px]:items-center">
        <button
          type="button"
          onClick={() => onZoomInto(slot)}
          aria-label={`${slot.label}: ${formatCount(slot.items.length, "event")}. Zoom in.`}
          className="grid w-full cursor-pointer justify-items-start gap-2 rounded-panel border-2 border-line bg-surface p-3 text-left shadow-pop transition-[transform,box-shadow] duration-token ease-token hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-lg min-[700px]:justify-items-center min-[700px]:text-center"
        >
          <span className="rounded-pill bg-surface-2 px-3 py-1 font-mono text-[13px] font-bold tabular-nums text-ink">
            {slot.label}
          </span>
          <span className="font-mono text-[13px] font-bold text-ink-2 tabular-nums">
            {formatCount(slot.items.length, "event")}
          </span>
        </button>
      </li>
    );
  }

  const year = (
    <span className="relative z-[1] mb-3.5 inline-flex h-[31px] items-center rounded-pill border-2 border-line bg-surface px-2.5 font-mono text-[15px] font-bold whitespace-nowrap tabular-nums -ml-9 min-[700px]:ml-0">
      {slot.label}
    </span>
  );

  if (reorderOn) {
    return (
      <li id={id} className="relative flex list-none flex-col items-start py-2 min-[700px]:w-[160px] min-[700px]:items-center">
        {year}
        <SortableContext items={slot.items.map((event) => event.id)} strategy={verticalListSortingStrategy}>
          <ul aria-label={`Events in ${slot.label}`} className="grid w-full gap-2.5 min-[700px]:justify-items-center">
            {slot.items.map((event, index) => (
              <SortableEvent
                key={event.id}
                event={event}
                canMoveUp={index > 0}
                canMoveDown={index < slot.items.length - 1}
                onMove={(direction) => onMove(slot.items, event, direction)}
              />
            ))}
          </ul>
        </SortableContext>
      </li>
    );
  }

  return (
    <li id={id} className="relative flex list-none flex-col items-start py-2 min-[700px]:w-[160px] min-[700px]:items-center">
      {year}
      <ul aria-label={`Events in ${slot.label}`} className="grid w-full gap-2.5 min-[700px]:justify-items-center">
        {slot.items.map((event) => (
          <li key={event.id} className="w-full list-none min-[700px]:flex min-[700px]:justify-center">
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </li>
  );
}
