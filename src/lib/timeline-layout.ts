import { formatYear } from "./format";

// The timeline axis (IMPLEMENTATION_PLAN §5.2). Each year that has events takes one slot, and the empty years
// between slots collapse into a gap marker that says how many years it spans. Zoom groups years into decades or
// centuries, and each group becomes one slot with its event count. Pure functions only, so they can be unit tested.

export type Zoom = "year" | "decade" | "century";
export const ZOOMS: readonly Zoom[] = ["year", "decade", "century"];

// How many years one slot covers at each zoom level.
const UNIT: Record<Zoom, number> = { year: 1, decade: 10, century: 100 };

// The first year of the slot a year falls in. Floor, so −5003 is in the decade starting at −5010.
export function bucketStart(year: number, zoom: Zoom): number {
  const unit = UNIT[zoom];
  return Math.floor(year / unit) * unit;
}

export type AxisSlot<T> = {
  kind: "slot";
  key: string;
  start: number;
  label: string;
  items: T[];
};

export type AxisGap = {
  kind: "gap";
  key: string;
  // How many years the gap spans, from the start of one slot to the start of the next.
  years: number;
};

export type AxisItem<T> = AxisSlot<T> | AxisGap;

function slotLabel(start: number, zoom: Zoom): string {
  if (zoom === "year") return formatYear(start);
  const end = start + UNIT[zoom] - 1;
  return `${formatYear(start)}–${formatYear(end)}`;
}

// Lays out events that are already sorted by year (then by their tie-break order). Items that share a slot stay in
// the order given. A gap appears only where the next slot starts more than one unit after the previous one.
export function layoutAxis<T extends { year: number }>(items: T[], zoom: Zoom): AxisItem<T>[] {
  const axis: AxisItem<T>[] = [];
  let previous: AxisSlot<T> | null = null;

  for (const item of items) {
    const start = bucketStart(item.year, zoom);
    if (previous && previous.start === start) {
      previous.items.push(item);
      continue;
    }
    if (previous && start - previous.start > UNIT[zoom]) {
      axis.push({ kind: "gap", key: `gap-${previous.start}`, years: start - previous.start });
    }
    previous = { kind: "slot", key: `slot-${start}`, start, label: slotLabel(start, zoom), items: [item] };
    axis.push(previous);
  }

  return axis;
}

// The label on a gap marker, e.g. "6,943 yrs". Gaps are always at least two units, so the plural is right.
export function gapLabel(years: number): string {
  return `${years.toLocaleString("en-GB")} yrs`;
}

// Reorders a list after one event moves within its year. `afterId` is the same-year event it now follows, or null
// for the first place in that year. The list is the same across all years, so only the moving event changes place.
export function moveWithinYear<T extends { id: string; year: number }>(
  items: T[],
  movingId: string,
  afterId: string | null,
): T[] {
  const moving = items.find((item) => item.id === movingId);
  if (!moving) return items;
  const others = items.filter((item) => item.id !== movingId);

  let insertAt: number;
  if (afterId === null) {
    const first = others.findIndex((item) => item.year === moving.year);
    // Alone in its year: nothing to reorder, so it stays where it is.
    if (first === -1) return items;
    insertAt = first;
  } else {
    const index = others.findIndex((item) => item.id === afterId);
    if (index === -1) return items;
    insertAt = index + 1;
  }

  return [...others.slice(0, insertAt), moving, ...others.slice(insertAt)];
}

// The event a move should follow, for the "Move up" and "Move down" actions. `group` is one year's events in order.
// Returns undefined when the event is already at that end of its year.
export function neighbourForMove<T extends { id: string }>(
  group: T[],
  id: string,
  direction: "up" | "down",
): { afterId: string | null } | undefined {
  const index = group.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  if (direction === "up") {
    if (index === 0) return undefined;
    return { afterId: index >= 2 ? group[index - 2].id : null };
  }
  if (index === group.length - 1) return undefined;
  return { afterId: group[index + 1].id };
}
