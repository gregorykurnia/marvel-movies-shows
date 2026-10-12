import { describe, expect, it } from "vitest";

import {
  keyBetween,
  keyForMove,
  keysBetween,
  reorderAfter,
  seededKey,
  seededKeys,
  seededNeighbours,
  type Placeable,
} from "@/lib/ordering";

// Builds a list already sorted by key, as the database returns it (COLLATE "C").
function list(entries: [id: string, year: number | null][]): Placeable[] {
  let key: string | null = null;
  return entries.map(([id, year]) => {
    key = keyBetween(key, null);
    return { id, sortKey: key, inUniverseYear: year };
  });
}

function idsInKeyOrder(items: Placeable[]) {
  return [...items].sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0)).map((item) => item.id);
}

describe("keyBetween", () => {
  it("returns a key strictly between two neighbours", () => {
    const low = "a0";
    const high = "a1";
    const middle = keyBetween(low, high);
    expect(middle > low).toBe(true);
    expect(middle < high).toBe(true);
  });

  it("works at either open end", () => {
    const first = keyBetween(null, null);
    expect(keyBetween(null, first) < first).toBe(true);
    expect(keyBetween(first, null) > first).toBe(true);
  });

  it("keeps repeated insertions into one gap in order", () => {
    // Worst case for fractional keys: every new item goes into the same gap, so the keys keep getting longer.
    let high = "a1";
    const low = "a0";
    const made: string[] = [];
    for (let i = 0; i < 200; i += 1) {
      const key = keyBetween(low, high);
      made.push(key);
      high = key;
    }
    const sorted = [...made].sort();
    expect(made.slice().reverse()).toEqual(sorted);
    expect(new Set(made).size).toBe(made.length);
  });
});

describe("keysBetween", () => {
  it("returns a sorted run of keys inside the gap", () => {
    const keys = keysBetween("a0", "a1", 9);
    expect(keys).toHaveLength(9);
    expect([...keys].sort()).toEqual(keys);
    expect(keys[0] > "a0").toBe(true);
    expect(keys[8] < "a1").toBe(true);
  });
});

describe("seededNeighbours (year-seeded placement)", () => {
  const items = list([
    ["movie-1940", 1940],
    ["movie-1970", 1970],
    ["undated", null],
    ["show-2010", 2010],
  ]);

  it("goes right after the last entry whose year is less than or equal to the new year", () => {
    const { before, after } = seededNeighbours(items, 1960);
    expect(before).toBe(items[0].sortKey);
    expect(after).toBe(items[1].sortKey);
  });

  it("skips entries with no year and sits before the next dated neighbour's successor", () => {
    // 2000 matches 1970 (the last dated entry at or before 2000). The undated entry is skipped.
    const { before, after } = seededNeighbours(items, 2000);
    expect(before).toBe(items[1].sortKey);
    expect(after).toBe(items[2].sortKey);
  });

  it("counts an equal year as matching, so it goes after entries from that same year", () => {
    const { before } = seededNeighbours(items, 1940);
    expect(before).toBe(items[0].sortKey);
  });

  it("goes to the start when no earlier entry qualifies", () => {
    const { before, after } = seededNeighbours(items, 1900);
    expect(before).toBeNull();
    expect(after).toBe(items[0].sortKey);
  });

  it("goes to the end when the new entry has no year", () => {
    const { before, after } = seededNeighbours(items, null);
    expect(before).toBe(items[3].sortKey);
    expect(after).toBeNull();
  });

  it("handles an empty list", () => {
    expect(seededNeighbours([], 1999)).toEqual({ before: null, after: null });
    expect(seededNeighbours([], null)).toEqual({ before: null, after: null });
  });

  it("orders years before 1 AD correctly", () => {
    const ancient = list([
      ["late-bce", -5000],
      ["early-ad", 1],
    ]);
    expect(seededNeighbours(ancient, -6000).before).toBeNull();
    expect(seededNeighbours(ancient, -5000).before).toBe(ancient[0].sortKey);
    expect(seededNeighbours(ancient, 0).before).toBe(ancient[0].sortKey);
  });

  it("does not rewrite the manual order: the year only picks where the new key starts", () => {
    const key = seededKey(items, 1960);
    const ordered = [...items, { id: "new", sortKey: key, inUniverseYear: 1960 }];
    expect(idsInKeyOrder(ordered)).toEqual(["movie-1940", "new", "movie-1970", "undated", "show-2010"]);
  });
});

describe("seededKeys (a block of episodes)", () => {
  it("places a whole block in episode order at the position its year gives", () => {
    const items = list([
      ["a", 1940],
      ["b", 1970],
    ]);
    const keys = seededKeys(items, 1950, 9);
    const combined = [...items, ...keys.map((sortKey, index) => ({ id: `ep-${index + 1}`, sortKey, inUniverseYear: 1950 }))];
    expect(idsInKeyOrder(combined)).toEqual([
      "a",
      "ep-1",
      "ep-2",
      "ep-3",
      "ep-4",
      "ep-5",
      "ep-6",
      "ep-7",
      "ep-8",
      "ep-9",
      "b",
    ]);
  });
});

describe("keyForMove", () => {
  const items = list([
    ["A", null],
    ["B", null],
    ["C", null],
    ["D", null],
  ]);

  it("places an item after the given neighbour", () => {
    const key = keyForMove(items, "A", "C");
    const moved = items.map((item) => (item.id === "A" ? { ...item, sortKey: key } : item));
    expect(idsInKeyOrder(moved)).toEqual(["B", "C", "A", "D"]);
  });

  it("moves an item to the very start when afterId is null", () => {
    const key = keyForMove(items, "C", null);
    expect(key < items[0].sortKey).toBe(true);
  });

  it("moves an item to the end when placed after the last item", () => {
    const key = keyForMove(items, "A", "D");
    expect(key > items[3].sortKey).toBe(true);
  });

  it("can move an item one place down (after the item below it)", () => {
    const key = keyForMove(items, "B", "C");
    const moved = items.map((item) => (item.id === "B" ? { ...item, sortKey: key } : item));
    expect(idsInKeyOrder(moved)).toEqual(["A", "C", "B", "D"]);
  });

  it("throws when the neighbour is not in the list", () => {
    expect(() => keyForMove(items, "A", "missing")).toThrow(/not in the list/);
  });
});

describe("reorderAfter (the optimistic order)", () => {
  const items = [{ id: "A" }, { id: "B" }, { id: "C" }];
  const ids = (list: { id: string }[]) => list.map((item) => item.id);

  it("moves an item after another", () => {
    expect(ids(reorderAfter(items, "A", "B"))).toEqual(["B", "A", "C"]);
    expect(ids(reorderAfter(items, "C", "A"))).toEqual(["A", "C", "B"]);
  });

  it("moves an item to the start", () => {
    expect(ids(reorderAfter(items, "C", null))).toEqual(["C", "A", "B"]);
  });

  it("leaves the list alone for an unknown id", () => {
    expect(reorderAfter(items, "A", "missing")).toBe(items);
    expect(reorderAfter(items, "missing", "A")).toBe(items);
  });
});
