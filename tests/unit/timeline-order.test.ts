import { describe, expect, it } from "vitest";

import { keyInYear, type YearPlaceable } from "@/lib/ordering";

// Timeline events: a key must sort inside its year's block, so the axis never shows a year out of order.
const items: YearPlaceable[] = [
  { id: "a", sortKey: "a0", year: 1943 },
  { id: "b", sortKey: "a1", year: 1945 },
  { id: "c", sortKey: "a2", year: 1945 },
  { id: "d", sortKey: "a3", year: 1995 },
];

function between(key: string, low: string | null, high: string | null) {
  return (low === null || key > low) && (high === null || key < high);
}

describe("keyInYear", () => {
  it("puts an event last in its year when no order is given", () => {
    const key = keyInYear(items, 1945, undefined);
    expect(between(key, "a2", "a3")).toBe(true);
  });

  it("puts an event first in its year when asked", () => {
    const key = keyInYear(items, 1945, null);
    expect(between(key, "a0", "a1")).toBe(true);
  });

  it("puts an event directly after a same-year event", () => {
    const key = keyInYear(items, 1945, "b");
    expect(between(key, "a1", "a2")).toBe(true);
  });

  it("keeps a new year between the years around it", () => {
    expect(between(keyInYear(items, 1944, undefined), "a0", "a1")).toBe(true);
    expect(between(keyInYear(items, 1944, null), "a0", "a1")).toBe(true);
  });

  it("puts an event after the last year and before the first", () => {
    expect(between(keyInYear(items, 2000, undefined), "a3", null)).toBe(true);
    expect(between(keyInYear(items, 1000, undefined), null, "a0")).toBe(true);
    expect(between(keyInYear(items, 1000, null), null, "a0")).toBe(true);
  });

  it("works on an empty list", () => {
    expect(keyInYear([], -5000, undefined)).toEqual(expect.any(String));
  });

  it("refuses an event that is not in the list", () => {
    expect(() => keyInYear(items, 1945, "missing")).toThrow("not in the list");
  });
});
