import { describe, expect, it } from "vitest";

import { mergeTimeline } from "@/lib/timeline-merge";

// Events are already in year order, then tie-break order (as loadTimelineEvents returns them). Recap items are in
// recap order. The merge must keep both orders, and put a year's events ahead of its recap items.
type Item = { id: string; year: number };

const ids = (items: Item[]) => items.map((item) => item.id);

describe("mergeTimeline", () => {
  it("sorts BCE years before AD years", () => {
    const events: Item[] = [
      { id: "e-bce", year: -5000 },
      { id: "e-1943", year: 1943 },
    ];
    const recaps: Item[] = [
      { id: "r-bce", year: -700 },
      { id: "r-2011", year: 2011 },
    ];
    expect(ids(mergeTimeline(events, recaps))).toEqual(["e-bce", "r-bce", "e-1943", "r-2011"]);
  });

  it("puts a year's events first, then its recap items, even when the recap comes first in recap order", () => {
    const events: Item[] = [
      { id: "event-a", year: 2011 },
      { id: "event-b", year: 2011 },
    ];
    const recaps: Item[] = [{ id: "recap-first", year: 2011 }, { id: "recap-second", year: 2011 }];
    expect(ids(mergeTimeline(events, recaps))).toEqual(["event-a", "event-b", "recap-first", "recap-second"]);
  });

  it("keeps each list's own order inside a year", () => {
    // Events are not re-sorted by id or anything else: their given order holds, and so does the recap order.
    const events: Item[] = [
      { id: "later-event", year: 1945 },
      { id: "earlier-event", year: 1945 },
    ];
    const recaps: Item[] = [
      { id: "recap-z", year: 1945 },
      { id: "recap-a", year: 1945 },
    ];
    expect(ids(mergeTimeline(events, recaps))).toEqual(["later-event", "earlier-event", "recap-z", "recap-a"]);
  });

  it("shows a year that has only recap items, in its place on the timeline", () => {
    const events: Item[] = [
      { id: "event-1943", year: 1943 },
      { id: "event-2012", year: 2012 },
    ];
    const recaps: Item[] = [{ id: "recap-1950", year: 1950 }, { id: "recap-1990", year: 1990 }];
    expect(ids(mergeTimeline(events, recaps))).toEqual(["event-1943", "recap-1950", "recap-1990", "event-2012"]);
  });

  it("returns only recap items when there are no events", () => {
    const recaps: Item[] = [{ id: "recap-2011", year: 2011 }, { id: "recap-2012", year: 2012 }];
    expect(ids(mergeTimeline([], recaps))).toEqual(["recap-2011", "recap-2012"]);
  });

  it("returns only events when there are no recap items", () => {
    const events: Item[] = [{ id: "event-1943", year: 1943 }];
    expect(ids(mergeTimeline(events, []))).toEqual(["event-1943"]);
  });

  it("returns an empty list when there is nothing", () => {
    expect(mergeTimeline([], [])).toEqual([]);
  });

  it("does not change the lists it is given", () => {
    const events: Item[] = [{ id: "event", year: 2000 }];
    const recaps: Item[] = [{ id: "recap", year: 1999 }];
    mergeTimeline(events, recaps);
    expect(ids(events)).toEqual(["event"]);
    expect(ids(recaps)).toEqual(["recap"]);
  });
});

// Time jump items (Phase 8) come after the recap items in each year, and a year can hold all three kinds.
describe("mergeTimeline with time jump items", () => {
  it("puts a year's events, then its recap items, then its time jump items", () => {
    const events: Item[] = [{ id: "event-1986", year: 1986 }];
    const recaps: Item[] = [{ id: "recap-1986", year: 1986 }];
    const jumps: Item[] = [{ id: "jump-1986", year: 1986 }, { id: "jump-1990", year: 1990 }];
    expect(ids(mergeTimeline(events, recaps, jumps))).toEqual(["event-1986", "recap-1986", "jump-1986", "jump-1990"]);
  });

  it("places BCE time jumps before AD years", () => {
    const jumps: Item[] = [{ id: "jump-2014", year: 2014 }, { id: "jump-bce", year: -700 }];
    expect(ids(mergeTimeline([], [], jumps))).toEqual(["jump-bce", "jump-2014"]);
  });

  it("keeps two jumps from one entry in the order they were given, when they share a year", () => {
    // loadTimeJumpItems gives one entry's jumps in sort_key order, so the same-year pair keeps that order.
    const jumps: Item[] = [
      { id: "jump-first-of-entry", year: 1988 },
      { id: "jump-second-of-entry", year: 1988 },
    ];
    expect(ids(mergeTimeline([], [], jumps))).toEqual(["jump-first-of-entry", "jump-second-of-entry"]);
  });

  it("is unchanged when no time jump items are given", () => {
    const events: Item[] = [{ id: "event", year: 2000 }];
    const recaps: Item[] = [{ id: "recap", year: 2000 }];
    expect(ids(mergeTimeline(events, recaps, []))).toEqual(ids(mergeTimeline(events, recaps)));
  });
});
