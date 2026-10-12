import { describe, expect, it } from "vitest";

import { fieldErrorsFrom } from "@/lib/action-result";
import {
  characterFormSchema,
  deleteConfirmSchema,
  episodeFormSchema,
  episodeRangeSchema,
  movieEditSchema,
  recapSchema,
  titleFormSchema,
  universeNameSchema,
  watchedSchema,
} from "@/lib/schemas";

const VALID_UUID = "9b2c6a4e-1f3d-4c8a-9e7b-2d5f6a7b8c9d";
const OTHER_UUID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

// The errors of a failed parse, keyed by field: the same shape the forms display.
function errorsFor(result: { success: boolean; error?: unknown }) {
  if (result.success) return {};
  return fieldErrorsFrom(result.error as Parameters<typeof fieldErrorsFrom>[0]);
}

describe("titleFormSchema", () => {
  const base = { kind: "movie", name: "Thor", releaseDate: "2011-05-06", inUniverseYear: "" };

  it("accepts a movie and turns blanks into null", () => {
    const parsed = titleFormSchema.parse(base);
    expect(parsed).toEqual({ kind: "movie", name: "Thor", releaseDate: "2011-05-06", inUniverseYear: null });
  });

  it("requires a name", () => {
    expect(errorsFor(titleFormSchema.safeParse({ ...base, name: "   " }))).toEqual({ name: "Enter a name" });
  });

  it("accepts a year before 1 AD typed with either minus sign", () => {
    expect(titleFormSchema.parse({ ...base, inUniverseYear: "-5000" }).inUniverseYear).toBe(-5000);
    expect(titleFormSchema.parse({ ...base, inUniverseYear: "−5000" }).inUniverseYear).toBe(-5000);
  });

  it("rejects a year that is not a whole number", () => {
    expect(errorsFor(titleFormSchema.safeParse({ ...base, inUniverseYear: "20x8" }))).toEqual({
      inUniverseYear: "The in-universe year must be a whole number",
    });
  });

  it("rejects an impossible date", () => {
    expect(errorsFor(titleFormSchema.safeParse({ ...base, releaseDate: "2021-13-40" }))).toEqual({
      releaseDate: "Use a date like 2021-06-09",
    });
  });

  it("only accepts movie or show as a kind", () => {
    expect(errorsFor(titleFormSchema.safeParse({ ...base, kind: "comic" }))).toHaveProperty("kind");
  });
});

describe("episodeFormSchema", () => {
  const base = { season: "1", episode: "1", name: "Glorious Purpose", releaseDate: "", inUniverseYear: "2012" };

  it("accepts season 0 for specials", () => {
    expect(episodeFormSchema.parse({ ...base, season: "0" }).season).toBe(0);
  });

  it("asks for a season and an episode number", () => {
    expect(errorsFor(episodeFormSchema.safeParse({ ...base, season: "" }))).toEqual({
      season: "Enter a season number",
    });
    expect(errorsFor(episodeFormSchema.safeParse({ ...base, episode: "" }))).toEqual({
      episode: "Enter an episode number",
    });
  });

  it("starts episode numbers at 1", () => {
    expect(errorsFor(episodeFormSchema.safeParse({ ...base, episode: "0" }))).toEqual({
      episode: "An episode number must be between 1 and 999",
    });
  });

  it("returns a plain number for the season and episode", () => {
    const parsed = episodeFormSchema.parse(base);
    expect(parsed.season).toBe(1);
    expect(parsed.episode).toBe(1);
    expect(parsed.name).toBe("Glorious Purpose");
  });
});

describe("episodeRangeSchema (bulk add)", () => {
  const base = { season: "1", fromEpisode: "1", toEpisode: "9", inUniverseYear: "1950" };

  it("accepts a normal block", () => {
    expect(episodeRangeSchema.parse(base)).toEqual({ season: 1, fromEpisode: 1, toEpisode: 9, inUniverseYear: 1950 });
  });

  it("rejects a last episode before the first", () => {
    expect(errorsFor(episodeRangeSchema.safeParse({ ...base, fromEpisode: "5", toEpisode: "3" }))).toEqual({
      toEpisode: "The last episode comes before the first",
    });
  });

  it("caps a block so one save can't add hundreds of rows", () => {
    expect(errorsFor(episodeRangeSchema.safeParse({ ...base, fromEpisode: "1", toEpisode: "200" }))).toEqual({
      toEpisode: "Add at most 100 episodes at a time",
    });
  });
});

describe("recapSchema", () => {
  it("keeps the pasted text exactly, including its line breaks and spaces", () => {
    const pasted = "  Loki wakes up.\n\n- first point\n";
    expect(recapSchema.parse(pasted)).toBe(pasted);
  });

  it("stores a blank recap as null", () => {
    expect(recapSchema.parse("   \n  ")).toBeNull();
  });

  it("refuses an oversized recap", () => {
    expect(recapSchema.safeParse("x".repeat(100_001)).success).toBe(false);
  });
});

describe("movieEditSchema", () => {
  it("needs a name and keeps the recap", () => {
    const parsed = movieEditSchema.parse({ name: "Thor", releaseDate: "", inUniverseYear: "", recap: "Text" });
    expect(parsed).toEqual({ name: "Thor", releaseDate: null, inUniverseYear: null, recap: "Text" });
    expect(errorsFor(movieEditSchema.safeParse({ name: "", releaseDate: "", inUniverseYear: "", recap: "" }))).toHaveProperty(
      "name",
    );
  });
});

describe("characterFormSchema", () => {
  const base = {
    name: "Loki",
    importance: "major",
    status: "alive",
    universeId: VALID_UUID,
    predominantTitleId: "",
    firstEntryId: "",
    lastEntryId: "",
    notes: "",
    entryIds: [VALID_UUID, VALID_UUID, OTHER_UUID],
  };

  it("removes duplicate appearances", () => {
    expect(characterFormSchema.parse(base).entryIds).toEqual([VALID_UUID, OTHER_UUID]);
  });

  it("treats blank dropdowns as no value", () => {
    const parsed = characterFormSchema.parse(base);
    expect(parsed.predominantTitleId).toBeNull();
    expect(parsed.firstEntryId).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("only allows the three statuses", () => {
    expect(errorsFor(characterFormSchema.safeParse({ ...base, status: "maybe" }))).toHaveProperty("status");
  });

  it("only allows major or minor", () => {
    expect(errorsFor(characterFormSchema.safeParse({ ...base, importance: "huge" }))).toHaveProperty("importance");
  });

  it("rejects a dropdown value that isn't an id", () => {
    expect(errorsFor(characterFormSchema.safeParse({ ...base, universeId: "Earth-616" }))).toHaveProperty(
      "universeId",
    );
  });
});

describe("universeNameSchema", () => {
  it("trims and requires a name", () => {
    expect(universeNameSchema.parse("  Earth-616 ")).toBe("Earth-616");
    expect(universeNameSchema.safeParse("   ").success).toBe(false);
  });
});

describe("watchedSchema and deleteConfirmSchema", () => {
  it("accepts a watched flag for an entry", () => {
    expect(watchedSchema.parse({ entryId: VALID_UUID, watched: true })).toEqual({ entryId: VALID_UUID, watched: true });
  });

  it("requires the typed word DELETE, in capitals", () => {
    expect(deleteConfirmSchema.safeParse("DELETE").success).toBe(true);
    expect(deleteConfirmSchema.safeParse("delete").success).toBe(false);
  });
});
