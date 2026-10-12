import { describe, expect, it } from "vitest";

import { gapLabel, layoutAxis, moveWithinYear, neighbourForMove, bucketStart } from "@/lib/timeline-layout";

type Ev = { id: string; year: number };

const ev = (id: string, year: number): Ev => ({ id, year });

describe("layoutAxis at year zoom", () => {
  it("returns nothing for no events", () => {
    expect(layoutAxis([], "year")).toEqual([]);
  });

  it("gives a single event one slot and no gaps", () => {
    const axis = layoutAxis([ev("a", 2012)], "year");
    expect(axis).toHaveLength(1);
    expect(axis[0]).toMatchObject({ kind: "slot", start: 2012, label: "2012" });
  });

  it("collapses empty years into gap markers that show the years spanned", () => {
    const axis = layoutAxis(
      [ev("a", -5000), ev("b", 1943), ev("c", 1945), ev("d", 1995), ev("e", 2011), ev("f", 2012)],
      "year",
    );
    const summary = axis.map((item) => (item.kind === "gap" ? `gap:${item.years}` : `slot:${item.start}`));
    expect(summary).toEqual([
      "slot:-5000",
      "gap:6943",
      "slot:1943",
      "gap:2",
      "slot:1945",
      "gap:50",
      "slot:1995",
      "gap:16",
      "slot:2011",
      "slot:2012",
    ]);
  });

  it("puts every event of one year in a single slot, in the order given", () => {
    const axis = layoutAxis([ev("a", 1945), ev("b", 1945), ev("c", 1945), ev("d", 1950)], "year");
    expect(axis).toHaveLength(3);
    expect(axis[0]).toMatchObject({ kind: "slot", start: 1945 });
    if (axis[0].kind !== "slot") throw new Error("expected a slot");
    expect(axis[0].items.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(axis[1]).toMatchObject({ kind: "gap", years: 5 });
    expect(axis[2]).toMatchObject({ kind: "slot", start: 1950 });
  });

  it("does not put a gap between two adjacent years", () => {
    const axis = layoutAxis([ev("a", 2011), ev("b", 2012)], "year");
    expect(axis.map((item) => item.kind)).toEqual(["slot", "slot"]);
  });

  it("labels negative years with a real minus sign", () => {
    const axis = layoutAxis([ev("a", -5000), ev("b", -4999)], "year");
    expect(axis[0]).toMatchObject({ label: "−5000" });
    expect(axis[1]).toMatchObject({ label: "−4999" });
  });
});

describe("layoutAxis at decade and century zoom", () => {
  it("groups years into decades and counts them", () => {
    const axis = layoutAxis([ev("a", 1941), ev("b", 1945), ev("c", 1952)], "decade");
    expect(axis).toHaveLength(2);
    expect(axis[0]).toMatchObject({ kind: "slot", start: 1940, label: "1940–1949" });
    if (axis[0].kind !== "slot") throw new Error("expected a slot");
    expect(axis[0].items).toHaveLength(2);
    expect(axis[1]).toMatchObject({ kind: "slot", start: 1950, label: "1950–1959" });
  });

  it("does not leave a gap between adjacent decades", () => {
    const axis = layoutAxis([ev("a", 1945), ev("b", 1955)], "decade");
    expect(axis.map((item) => item.kind)).toEqual(["slot", "slot"]);
  });

  it("collapses a century into one slot", () => {
    const axis = layoutAxis([ev("a", 1945), ev("b", 1995), ev("c", 2011)], "century");
    expect(axis).toHaveLength(2);
    expect(axis[0]).toMatchObject({ start: 1900, label: "1900–1999" });
    expect(axis[1]).toMatchObject({ start: 2000, label: "2000–2099" });
  });
});

describe("bucketStart", () => {
  it("rounds negative years down to the start of their bucket", () => {
    expect(bucketStart(-5003, "year")).toBe(-5003);
    expect(bucketStart(-5003, "decade")).toBe(-5010);
    expect(bucketStart(-5003, "century")).toBe(-5100);
  });
});

describe("gapLabel", () => {
  it("uses thousands separators and the plural form", () => {
    expect(gapLabel(6943)).toBe("6,943 yrs");
    expect(gapLabel(50)).toBe("50 yrs");
  });
});

describe("moveWithinYear", () => {
  const list = [ev("a", 1943), ev("b", 1945), ev("c", 1945), ev("d", 1945), ev("e", 1995)];

  it("moves an event after a same-year event", () => {
    const next = moveWithinYear(list, "d", "b");
    expect(next.map((item) => item.id)).toEqual(["a", "b", "d", "c", "e"]);
  });

  it("moves an event to the first place in its year", () => {
    const next = moveWithinYear(list, "d", null);
    expect(next.map((item) => item.id)).toEqual(["a", "d", "b", "c", "e"]);
  });

  it("keeps the other years where they are", () => {
    const next = moveWithinYear(list, "c", "b");
    expect(next.map((item) => item.year)).toEqual([1943, 1945, 1945, 1945, 1995]);
  });

  it("leaves the list alone for an event alone in its year", () => {
    expect(moveWithinYear(list, "e", null)).toEqual(list);
  });
});

describe("neighbourForMove", () => {
  const group = [ev("a", 1945), ev("b", 1945), ev("c", 1945)];

  it("moves up two places back when there is room", () => {
    expect(neighbourForMove(group, "c", "up")).toEqual({ afterId: "a" });
  });

  it("moves to the first place when there is one place above", () => {
    expect(neighbourForMove(group, "b", "up")).toEqual({ afterId: null });
  });

  it("moves down past the next event", () => {
    expect(neighbourForMove(group, "a", "down")).toEqual({ afterId: "b" });
  });

  it("does nothing at either end of the year", () => {
    expect(neighbourForMove(group, "a", "up")).toBeUndefined();
    expect(neighbourForMove(group, "c", "down")).toBeUndefined();
  });
});
