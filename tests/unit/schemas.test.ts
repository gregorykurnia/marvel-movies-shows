import { describe, expect, it } from "vitest";

import { fieldErrorsFrom } from "@/lib/action-result";
import {
  characterFormSchema,
  deleteConfirmSchema,
  episodeEditSchema,
  episodeFormSchema,
  episodeRangeSchema,
  firstAppearanceSchema,
  inlineCharacterSchema,
  movieEditSchema,
  recapSchema,
  titleFormSchema,
  universeNameSchema,
  watchedSchema,
} from "@/lib/schemas";

const VALID_UUID = "9b2c6a4e-1f3d-4c8a-9e7b-2d5f6a7b8c9d";

// The errors of a failed parse, keyed by field: the same shape the forms display.
function errorsFor(result: { success: boolean; error?: unknown }) {
  if (result.success) return {};
  return fieldErrorsFrom(result.error as Parameters<typeof fieldErrorsFrom>[0]);
}

describe("titleFormSchema", () => {
  // The forms always send every field, including the universe (an empty string when none is picked).
  const base = { kind: "movie", name: "Thor", releaseDate: "2011-05-06", inUniverseYear: "", universeId: "" };

  it("accepts a movie and turns blanks into null", () => {
    const parsed = titleFormSchema.parse(base);
    expect(parsed).toEqual({
      kind: "movie",
      name: "Thor",
      releaseDate: "2011-05-06",
      inUniverseYear: null,
      universeId: null,
      universeName: null,
    });
  });

  it("accepts a universe id, and refuses one that isn't an id", () => {
    expect(titleFormSchema.parse({ ...base, universeId: VALID_UUID }).universeId).toBe(VALID_UUID);
    expect(errorsFor(titleFormSchema.safeParse({ ...base, universeId: "Earth-616" }))).toHaveProperty("universeId");
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

  it("accepts a short as a kind", () => {
    expect(titleFormSchema.parse({ ...base, kind: "short" }).kind).toBe("short");
  });

  it("only accepts movie, show or short as a kind", () => {
    expect(errorsFor(titleFormSchema.safeParse({ ...base, kind: "comic" }))).toHaveProperty("kind");
  });
});

describe("episodeFormSchema", () => {
  const base = {
    season: "1",
    episode: "1",
    name: "Glorious Purpose",
    releaseDate: "",
    inUniverseYear: "2012",
    universeId: "",
  };

  it("accepts a universe for the episode, or none", () => {
    expect(episodeFormSchema.parse({ ...base, universeId: VALID_UUID }).universeId).toBe(VALID_UUID);
    expect(episodeFormSchema.parse(base).universeId).toBeNull();
  });

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
  const base = { season: "1", fromEpisode: "1", toEpisode: "9", inUniverseYear: "1950", universeId: "" };

  it("accepts a normal block", () => {
    expect(episodeRangeSchema.parse(base)).toEqual({
      season: 1,
      fromEpisode: 1,
      toEpisode: 9,
      inUniverseYear: 1950,
      universeId: null,
      universeName: null,
    });
  });

  it("gives the whole block the one universe that is picked", () => {
    expect(episodeRangeSchema.parse({ ...base, universeId: VALID_UUID }).universeId).toBe(VALID_UUID);
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
    const parsed = movieEditSchema.parse({
      name: "Thor",
      releaseDate: "",
      inUniverseYear: "",
      universeId: "",
      recap: "Text",
      notes: "",
      timeJumps: [],
    });
    expect(parsed).toEqual({
      name: "Thor",
      releaseDate: null,
      inUniverseYear: null,
      universeId: null,
      universeName: null,
      recap: "Text",
      notes: null,
      timeJumps: [],
    });
    expect(
      errorsFor(
        movieEditSchema.safeParse({
          name: "",
          releaseDate: "",
          inUniverseYear: "",
          universeId: "",
          recap: "",
          notes: "",
          timeJumps: [],
        }),
      ),
    ).toHaveProperty("name");
  });

  it("keeps the recap's universe, and clears it when none is picked", () => {
    const base = { name: "Thor", releaseDate: "", inUniverseYear: "", recap: "", notes: "", timeJumps: [] };
    expect(movieEditSchema.parse({ ...base, universeId: VALID_UUID }).universeId).toBe(VALID_UUID);
    expect(movieEditSchema.parse({ ...base, universeId: "" }).universeId).toBeNull();
  });
});

// Other years (Phase 8). The form sends one row per position, so each test builds the rows the same way.
describe("time jumps on a recap", () => {
  const base = { name: "Thor", releaseDate: "", inUniverseYear: "2011", universeId: "", recap: "", notes: "" };
  const row = (year: string, kind = "flashback", note = "") => ({ year, kind, note });

  it("keeps the rows in order, with the year as a number and a blank note as null", () => {
    const parsed = movieEditSchema.parse({
      ...base,
      timeJumps: [row("1988", "flashback", " Young Peter at his mother's bedside "), row("2014", "time_travel", "")],
    });
    expect(parsed.timeJumps).toEqual([
      { year: 1988, kind: "flashback", note: "Young Peter at his mother's bedside", universeId: null },
      { year: 2014, kind: "time_travel", note: null, universeId: null },
    ]);
  });

  it("accepts a flash-forward and a BCE year typed with a real minus sign", () => {
    const parsed = movieEditSchema.parse({ ...base, timeJumps: [row("−5000", "flash_forward")] });
    expect(parsed.timeJumps).toEqual([{ year: -5000, kind: "flash_forward", note: null, universeId: null }]);
  });

  it("drops a row with no year and no note, so an empty added row doesn't block the save", () => {
    const parsed = movieEditSchema.parse({ ...base, timeJumps: [row(""), row("1988", "flashback", "x"), row("", "flashback", "")] });
    expect(parsed.timeJumps).toEqual([{ year: 1988, kind: "flashback", note: "x", universeId: null }]);
  });

  it("puts a bad year on its own row", () => {
    const result = movieEditSchema.safeParse({ ...base, timeJumps: [row("1988"), row("soon")] });
    expect(errorsFor(result)).toHaveProperty("timeJumps.1.year");
    expect(errorsFor(result)).not.toHaveProperty("timeJumps.0.year");
  });

  it("refuses a row with a note but no year", () => {
    expect(errorsFor(movieEditSchema.safeParse({ ...base, timeJumps: [row("", "flashback", "Young Peter")] }))).toHaveProperty(
      "timeJumps.0.year",
    );
  });

  it("refuses an unknown kind, and a note over 200 characters", () => {
    expect(errorsFor(movieEditSchema.safeParse({ ...base, timeJumps: [row("1988", "dream")] }))).toHaveProperty(
      "timeJumps.0.kind",
    );
    expect(
      errorsFor(movieEditSchema.safeParse({ ...base, timeJumps: [row("1988", "flashback", "x".repeat(201))] })),
    ).toHaveProperty("timeJumps.0.note");
  });

  it("refuses other years when the main in-universe year is empty", () => {
    const result = movieEditSchema.safeParse({ ...base, inUniverseYear: "", timeJumps: [row("1988")] });
    expect(errorsFor(result)).toHaveProperty("inUniverseYear");
  });

  it("allows an empty main year when there are no other years", () => {
    expect(movieEditSchema.safeParse({ ...base, inUniverseYear: "", timeJumps: [] }).success).toBe(true);
  });

  it("applies the same rules to an episode", () => {
    const episode = {
      season: "1",
      episode: "2",
      name: "",
      releaseDate: "",
      inUniverseYear: "2012",
      universeId: "",
      recap: "",
      notes: "",
    };
    expect(episodeEditSchema.parse({ ...episode, timeJumps: [row("1988", "flashback", "Peter")] }).timeJumps).toEqual([
      { year: 1988, kind: "flashback", note: "Peter", universeId: null },
    ]);
    expect(errorsFor(episodeEditSchema.safeParse({ ...episode, inUniverseYear: "", timeJumps: [row("1988")] }))).toHaveProperty(
      "inUniverseYear",
    );
  });
});

describe("firstAppearanceSchema", () => {
  const movie = { kind: "movie", name: "Thor", showTitleId: null, showName: "", season: "", episode: "", episodeName: "" };
  const show = { kind: "show", name: "", showTitleId: null, showName: "Loki", season: "1", episode: "2", episodeName: "" };

  it("needs a title name for a movie or a short", () => {
    expect(firstAppearanceSchema.parse(movie).name).toBe("Thor");
    expect(errorsFor(firstAppearanceSchema.safeParse({ ...movie, name: "  " }))).toHaveProperty("name");
    expect(firstAppearanceSchema.parse({ ...movie, kind: "short", name: "Item 47" }).kind).toBe("short");
  });

  it("takes a picked show, or a typed one, and needs a season and an episode", () => {
    expect(firstAppearanceSchema.parse({ ...show, showName: "" , showTitleId: VALID_UUID }).showTitleId).toBe(VALID_UUID);
    expect(firstAppearanceSchema.parse(show).showName).toBe("Loki");
    expect(errorsFor(firstAppearanceSchema.safeParse({ ...show, showName: "" }))).toHaveProperty("showName");
    expect(errorsFor(firstAppearanceSchema.safeParse({ ...show, season: "" }))).toHaveProperty("season");
    expect(errorsFor(firstAppearanceSchema.safeParse({ ...show, episode: "" }))).toHaveProperty("episode");
  });

  it("makes the episode name optional", () => {
    expect(firstAppearanceSchema.parse({ ...show, episodeName: "" }).episodeName).toBeNull();
  });
});

describe("inlineCharacterSchema", () => {
  it("needs a name, and takes the universe as an id or nothing", () => {
    expect(inlineCharacterSchema.parse({ name: " Loki ", universeId: null })).toEqual({ name: "Loki", universeId: null });
    expect(errorsFor(inlineCharacterSchema.safeParse({ name: "", universeId: null }))).toHaveProperty("name");
    expect(() => inlineCharacterSchema.parse({ name: "Loki", universeId: "not-an-id" })).toThrow();
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
  };

  it("keeps a universe typed but not picked, and drops a blank one", () => {
    expect(characterFormSchema.parse({ ...base, universeId: "", universeName: "  Earth-199999 " }).universeName).toBe(
      "Earth-199999",
    );
    expect(characterFormSchema.parse({ ...base, universeName: "   " }).universeName).toBeNull();
  });

  it("refuses a universe name over 60 characters", () => {
    expect(errorsFor(characterFormSchema.safeParse({ ...base, universeName: "x".repeat(61) }))).toHaveProperty(
      "universeName",
    );
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

// The universe of each other year (Phase 9). A year with no universe uses the recap's universe, so it's stored as null.
describe("universes on other years", () => {
  const base = { name: "Thor", releaseDate: "", inUniverseYear: "2011", universeId: "", recap: "", notes: "", timeJumps: [] };
  const row = (year: string, kind = "time_travel", note = "", universeId = "") => ({ year, kind, note, universeId });

  it("keeps each row's universe, and stores a blank one as null", () => {
    const parsed = movieEditSchema.parse({
      ...base,
      timeJumps: [row("2014", "time_travel", "", VALID_UUID), row("1988", "flashback", "", "")],
    });
    expect(parsed.timeJumps).toEqual([
      { year: 2014, kind: "time_travel", note: null, universeId: VALID_UUID },
      { year: 1988, kind: "flashback", note: null, universeId: null },
    ]);
  });

  it("accepts rows from a form that doesn't send a universe at all", () => {
    const parsed = episodeEditSchema.parse({
      season: "1",
      episode: "1",
      name: "",
      releaseDate: "",
      inUniverseYear: "2012",
      universeId: "",
      recap: "",
      notes: "",
      timeJumps: [{ year: "1988", kind: "flashback", note: "" }],
    });
    expect(parsed.timeJumps).toEqual([{ year: 1988, kind: "flashback", note: null, universeId: null }]);
  });

  it("keeps a row that has only a universe, so the missing year is named rather than the row dropped", () => {
    const result = movieEditSchema.safeParse({ ...base, timeJumps: [row("", "flashback", "", VALID_UUID)] });
    expect(errorsFor(result)).toHaveProperty("timeJumps.0.year");
  });

  it("refuses a universe that isn't an id, on its own row", () => {
    const result = movieEditSchema.safeParse({ ...base, timeJumps: [row("1988"), row("2014", "time_travel", "", "not-an-id")] });
    expect(errorsFor(result)).toHaveProperty("timeJumps.1.universeId");
    expect(errorsFor(result)).not.toHaveProperty("timeJumps.0.universeId");
  });

  it("still drops a row that is empty in every field, universe included", () => {
    const parsed = movieEditSchema.parse({ ...base, timeJumps: [row("", "flashback", "", ""), row("1988")] });
    expect(parsed.timeJumps).toEqual([{ year: 1988, kind: "time_travel", note: null, universeId: null }]);
  });
});
