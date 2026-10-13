// One timeline order for hand-written events, recap items and time jump items (IMPLEMENTATION_PLAN §5.2, PRODUCT_PLAN §7).
// Years sort as numbers, so BCE years (negative) come first. Within a year, events come first, then recap items, then
// time jump items (flashbacks, flash-forwards and time travel). Each list keeps its own order: events in their tie-break
// order, recap items and time jump items in recap order. Pure, so it can be unit tested.
export function mergeTimeline<
  E extends { year: number },
  R extends { year: number },
  J extends { year: number } = never,
>(events: E[], recaps: R[], jumps: J[] = []): (E | R | J)[] {
  // Array.sort is stable, so with the lists in this order, a year's events stay ahead of its recap items, which stay
  // ahead of its time jump items.
  return [...events, ...recaps, ...jumps].sort((a, b) => a.year - b.year);
}
