import { describe, expect, it } from "vitest";

import { decadeLabel, decadeOf, formatCount, formatDate, formatEpisodeCode, formatYear } from "@/lib/format";

describe("formatYear", () => {
  it("writes ordinary years plainly", () => {
    expect(formatYear(2012)).toBe("2012");
    expect(formatYear(0)).toBe("0");
  });

  it("uses a real minus sign for years before 1 AD", () => {
    expect(formatYear(-5000)).toBe("−5000");
  });

  it("shows a dash when no year is set", () => {
    expect(formatYear(null)).toBe("—");
  });
});

describe("formatEpisodeCode", () => {
  it("pads to two digits with a middle dot", () => {
    expect(formatEpisodeCode(1, 1)).toBe("S01·E01");
    expect(formatEpisodeCode(12, 6)).toBe("S12·E06");
  });

  it("is null for a movie", () => {
    expect(formatEpisodeCode(null, null)).toBeNull();
  });
});

describe("decades", () => {
  it("rounds down to the decade", () => {
    expect(decadeOf(1945)).toBe(1940);
    expect(decadeOf(1940)).toBe(1940);
    expect(decadeOf(2000)).toBe(2000);
  });

  it("rounds negative years down too", () => {
    expect(decadeOf(-5003)).toBe(-5010);
  });

  it("labels each group in capitals with an S", () => {
    expect(decadeLabel(1945)).toBe("1940S");
    expect(decadeLabel(-5003)).toBe("−5010S");
    expect(decadeLabel(null)).toBe("NO YEAR");
  });
});

describe("formatDate", () => {
  it("writes a Postgres date in short form", () => {
    expect(formatDate("2021-06-09")).toBe("9 Jun 2021");
  });

  it("does not shift the day for any time zone", () => {
    expect(formatDate("2012-01-01")).toBe("1 Jan 2012");
    expect(formatDate("2012-12-31")).toBe("31 Dec 2012");
  });

  it("returns null when there is no date", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate("")).toBeNull();
  });
});

describe("formatCount", () => {
  it("uses the singular only for one", () => {
    expect(formatCount(1, "episode")).toBe("1 episode");
    expect(formatCount(0, "episode")).toBe("0 episodes");
    expect(formatCount(3, "universe")).toBe("3 universes");
  });
});
