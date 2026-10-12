import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

// Custom order (IMPLEMENTATION_PLAN §3.2). Every row has a fractional sort_key. Moving an item writes only
// that one row, with a key between its new neighbours. Lists passed in must be sorted by sortKey, ascending.
// The keys use digits 0-9, A-Z, a-z, so their order is the same in JavaScript and under COLLATE "C" in Postgres.
export type Placeable = {
  id: string;
  sortKey: string;
  inUniverseYear: number | null;
};

// `before` and `after` are the neighbouring keys. null means the open end of the list.
export function keyBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}

export function keysBetween(before: string | null, after: string | null, count: number): string[] {
  return generateNKeysBetween(before, after, count);
}

// Where a new entry lands. Year-seeded placement (§3.2): right after the last entry in the current custom order
// whose year is less than or equal to the new year. An entry with no year goes to the end. If no earlier entry
// qualifies, it goes to the start. The manual order is never rewritten, so this only chooses a starting place.
export function seededNeighbours(
  items: Placeable[],
  year: number | null,
): { before: string | null; after: string | null } {
  if (year === null) {
    return { before: items.at(-1)?.sortKey ?? null, after: null };
  }
  let index = -1;
  items.forEach((item, position) => {
    if (item.inUniverseYear !== null && item.inUniverseYear <= year) {
      index = position;
    }
  });
  return {
    before: index >= 0 ? items[index].sortKey : null,
    after: items[index + 1]?.sortKey ?? null,
  };
}

// The key for one new entry, placed by its year.
export function seededKey(items: Placeable[], year: number | null): string {
  const { before, after } = seededNeighbours(items, year);
  return keyBetween(before, after);
}

// Keys for a block added together, such as episodes 1 to 9 of a season (§3.2). They sit as one run,
// in the order given, at the position the year chooses.
export function seededKeys(items: Placeable[], year: number | null, count: number): string[] {
  const { before, after } = seededNeighbours(items, year);
  return keysBetween(before, after, count);
}

// The new key for `movingId` when it is dropped directly after `afterId` (null: at the very start).
// The moving item is ignored when finding neighbours, so dropping it where it already is gives a fresh key.
export function keyForMove(items: Placeable[], movingId: string, afterId: string | null): string {
  const others = items.filter((item) => item.id !== movingId);
  if (afterId === null) {
    return keyBetween(null, others[0]?.sortKey ?? null);
  }
  const index = others.findIndex((item) => item.id === afterId);
  if (index === -1) {
    throw new Error("The item to place after is not in the list");
  }
  return keyBetween(others[index].sortKey, others[index + 1]?.sortKey ?? null);
}

// Timeline events sort by year first, then by sort_key (IMPLEMENTATION_PLAN §3.2). So a key must stay inside its
// year's block. `items` is every other event, sorted by key. `afterId` undefined puts the event last in its year,
// null puts it first, and an id puts it directly after that event (which must be in the same year).
export type YearPlaceable = { id: string; sortKey: string; year: number };

export function keyInYear(items: YearPlaceable[], year: number, afterId: string | null | undefined): string {
  let before: string | null;
  let after: string | null;
  if (afterId === undefined) {
    const last = items.findLastIndex((item) => item.year <= year);
    before = items[last]?.sortKey ?? null;
    after = items[last + 1]?.sortKey ?? null;
  } else if (afterId === null) {
    const below = items.findLastIndex((item) => item.year < year);
    const first = items.findIndex((item) => item.year >= year);
    before = items[below]?.sortKey ?? null;
    after = first === -1 ? null : items[first].sortKey;
  } else {
    const index = items.findIndex((item) => item.id === afterId);
    if (index === -1) throw new Error("The event to place after is not in the list");
    before = items[index].sortKey;
    after = items[index + 1]?.sortKey ?? null;
  }
  return keyBetween(before, after);
}

// The order the list would have after one move, without touching any keys. The UI uses this to update
// immediately, before the server confirms.
export function reorderAfter<T extends { id: string }>(items: T[], movingId: string, afterId: string | null): T[] {
  const moving = items.find((item) => item.id === movingId);
  if (!moving) return items;
  const others = items.filter((item) => item.id !== movingId);
  const index = afterId === null ? -1 : others.findIndex((item) => item.id === afterId);
  if (afterId !== null && index === -1) return items;
  return [...others.slice(0, index + 1), moving, ...others.slice(index + 1)];
}
