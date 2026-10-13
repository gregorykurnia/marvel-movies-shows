import { describe, expect, it } from "vitest";

import {
  hasUnsetUniverse,
  matchesUniverse,
  NO_UNIVERSE,
  resolveUniverse,
  universeOptions,
} from "@/lib/timeline-filter";

// Every timeline item carries the universe it shows (IMPLEMENTATION_PLAN §5.2, Phase 10). A recap item has its recap's
// universe, a time jump its own or the recap's, and a hand-written event its linked recap's, so one rule covers them all.
const EARTH_616 = { universeName: "Earth-616" };
const EARTH_838 = { universeName: "Earth-838" };
const NONE = { universeName: null };

describe("matchesUniverse", () => {
  it("lets every item through when no filter is set", () => {
    expect(matchesUniverse(EARTH_616, null)).toBe(true);
    expect(matchesUniverse(NONE, null)).toBe(true);
  });

  it("matches a recap item by its recap's universe, and leaves out other universes", () => {
    expect(matchesUniverse(EARTH_616, "Earth-616")).toBe(true);
    expect(matchesUniverse(EARTH_838, "Earth-616")).toBe(false);
  });

  it("matches a time jump by the universe it shows, its own or the recap's", () => {
    // A jump in its own universe (Earth-838) is shown under Earth-838, not under its recap's Earth-616.
    const ownUniverse = { universeName: "Earth-838" };
    expect(matchesUniverse(ownUniverse, "Earth-838")).toBe(true);
    expect(matchesUniverse(ownUniverse, "Earth-616")).toBe(false);
    // A jump with no universe of its own shows the recap's, so it matches the recap's universe.
    const fallsBack = { universeName: "Earth-616" };
    expect(matchesUniverse(fallsBack, "Earth-616")).toBe(true);
  });

  it("matches a linked event by its recap's universe, and an unlinked event by none", () => {
    const linkedEvent = { universeName: "Earth-616" };
    const unlinkedEvent = { universeName: null };
    expect(matchesUniverse(linkedEvent, "Earth-616")).toBe(true);
    expect(matchesUniverse(unlinkedEvent, "Earth-616")).toBe(false);
    expect(matchesUniverse(unlinkedEvent, NO_UNIVERSE)).toBe(true);
    expect(matchesUniverse(linkedEvent, NO_UNIVERSE)).toBe(false);
  });

  it("matches the no-universe choice only for items with no universe", () => {
    expect(matchesUniverse(NONE, NO_UNIVERSE)).toBe(true);
    expect(matchesUniverse(EARTH_616, NO_UNIVERSE)).toBe(false);
  });

  it("matches names case-insensitively, like tags", () => {
    expect(matchesUniverse(EARTH_616, "earth-616")).toBe(true);
    expect(matchesUniverse(EARTH_616, "EARTH-616")).toBe(true);
    expect(matchesUniverse(EARTH_838, "earth-616")).toBe(false);
  });
});

describe("universeOptions", () => {
  it("lists each universe once, sorted by name, and leaves out items with none", () => {
    const items = [EARTH_838, NONE, EARTH_616, { universeName: "Earth-616" }];
    expect(universeOptions(items)).toEqual(["Earth-616", "Earth-838"]);
  });

  it("is empty when no item has a universe", () => {
    expect(universeOptions([NONE])).toEqual([]);
  });
});

describe("hasUnsetUniverse", () => {
  it("is true only when some item has no universe", () => {
    expect(hasUnsetUniverse([EARTH_616, NONE])).toBe(true);
    expect(hasUnsetUniverse([EARTH_616, EARTH_838])).toBe(false);
  });
});

describe("resolveUniverse", () => {
  const names = ["Earth-616", "Earth-838"];

  it("is no filter when nothing was asked for", () => {
    expect(resolveUniverse(null, names, true)).toBeNull();
  });

  it("resolves a name to the spelling on the timeline, case-insensitively", () => {
    expect(resolveUniverse("earth-838", names, true)).toBe("Earth-838");
    expect(resolveUniverse("EARTH-616", names, true)).toBe("Earth-616");
  });

  it("treats an unknown name as no filter", () => {
    expect(resolveUniverse("Earth-1610", names, true)).toBeNull();
  });

  it("accepts the no-universe choice only when the timeline has an item without a universe", () => {
    expect(resolveUniverse(NO_UNIVERSE, names, true)).toBe(NO_UNIVERSE);
    expect(resolveUniverse(NO_UNIVERSE, names, false)).toBeNull();
  });
});
