// One timeline order for hand-written events and recap items (IMPLEMENTATION_PLAN §5.2, PRODUCT_PLAN §7). Years sort as
// numbers, so BCE years (negative) come first. Within a year, events come first, then recap items. Each list keeps its
// own order: events in their tie-break order, recap items in recap order. Pure, so it can be unit tested.
export function mergeTimeline<E extends { year: number }, R extends { year: number }>(events: E[], recaps: R[]): (E | R)[] {
  // Array.sort is stable, so with events first in the array, a year's events stay ahead of its recap items.
  return [...events, ...recaps].sort((a, b) => a.year - b.year);
}
