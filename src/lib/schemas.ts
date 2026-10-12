// Validation for every write (IMPLEMENTATION_PLAN §1: the same Zod checks run on the server for every write).
// Form fields arrive as strings, so each helper treats "" as "not set" and parses numbers and dates itself.
import { z } from "zod";

import { cleanTagName } from "./tag-name";

const MINUS = "−";

// Years are whole numbers. A year before 1 AD can be typed with either "-" or "−".
const YEAR_MIN = -99999;
const YEAR_MAX = 99999;

const name = z.string().trim().min(1, "Enter a name").max(160, "Keep the name under 160 characters");

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Keep it under ${max.toLocaleString("en-GB")} characters`)
    .transform((value) => value.trim() || null);

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || z.iso.date().safeParse(value).success, "Use a date like 2021-06-09")
  .transform((value) => value || null);

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Returns the number, or the message to show.
function parseWhole(text: string, label: string, min: number, max: number): number | string {
  const normalised = text.replaceAll(MINUS, "-");
  if (!/^-?\d+$/.test(normalised)) return `${capitalise(label)} must be a whole number`;
  const value = Number(normalised);
  if (value < min || value > max) return `${capitalise(label)} must be between ${min} and ${max}`;
  return value;
}

function requiredWhole(label: string, min: number, max: number) {
  return z.string().trim().transform((text, ctx) => {
    if (text === "") {
      ctx.addIssue({ code: "custom", message: `Enter ${label}` });
      return z.NEVER;
    }
    const parsed = parseWhole(text, label, min, max);
    if (typeof parsed === "string") {
      ctx.addIssue({ code: "custom", message: parsed });
      return z.NEVER;
    }
    return parsed;
  });
}

function optionalWhole(label: string, min: number, max: number) {
  return z.string().trim().transform((text, ctx) => {
    if (text === "") return null;
    const parsed = parseWhole(text, label, min, max);
    if (typeof parsed === "string") {
      ctx.addIssue({ code: "custom", message: parsed });
      return z.NEVER;
    }
    return parsed;
  });
}

const optionalYear = optionalWhole("the in-universe year", YEAR_MIN, YEAR_MAX);

const uuid = z.uuid("That item no longer exists. Pick it again.");
const optionalUuid = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(uuid.nullable());

// Titles: a movie or a show. A movie's in-universe year lives on its single entry.
export const titleKind = z.enum(["movie", "show"], { error: "Choose movie or show" });

export const titleFormSchema = z.object({
  kind: titleKind,
  name,
  releaseDate: optionalDate,
  inUniverseYear: optionalYear,
  universeId: optionalUuid,
});

export const titleEditSchema = z.object({
  name,
  releaseDate: optionalDate,
  notes: optionalText(10_000),
});

// Episodes. Season 0 is allowed for specials. Episode numbers start at 1.
export const episodeFormSchema = z.object({
  season: requiredWhole("a season number", 0, 99),
  episode: requiredWhole("an episode number", 1, 999),
  name: optionalText(160),
  releaseDate: optionalDate,
  inUniverseYear: optionalYear,
  universeId: optionalUuid,
});

export const MAX_EPISODES_PER_BLOCK = 100;

export const episodeRangeSchema = z
  .object({
    season: requiredWhole("a season number", 0, 99),
    fromEpisode: requiredWhole("the first episode number", 1, 999),
    toEpisode: requiredWhole("the last episode number", 1, 999),
    inUniverseYear: optionalYear,
    // One universe for the whole block (PRODUCT_PLAN §2.1).
    universeId: optionalUuid,
  })
  .superRefine((value, context) => {
    if (value.toEpisode < value.fromEpisode) {
      context.addIssue({
        code: "custom",
        path: ["toEpisode"],
        message: "The last episode comes before the first",
      });
    } else if (value.toEpisode - value.fromEpisode + 1 > MAX_EPISODES_PER_BLOCK) {
      context.addIssue({
        code: "custom",
        path: ["toEpisode"],
        message: `Add at most ${MAX_EPISODES_PER_BLOCK} episodes at a time`,
      });
    }
  });

// The recap is stored exactly as pasted (PRODUCT_PLAN §2.1), so it is not trimmed. Blank becomes null.
export const RECAP_MAX_LENGTH = 100_000;
export const recapSchema = z
  .string()
  .max(RECAP_MAX_LENGTH, "The recap is too long to save")
  .transform((value) => (value.trim() === "" ? null : value));

// Notes on a recap are stored on its entry (PRODUCT_PLAN §2.6). Tags are read separately with tagNamesSchema.
export const episodeEditSchema = episodeFormSchema.extend({
  recap: recapSchema,
  notes: optionalText(10_000),
});

export const movieEditSchema = z.object({
  name,
  releaseDate: optionalDate,
  inUniverseYear: optionalYear,
  universeId: optionalUuid,
  recap: recapSchema,
  notes: optionalText(10_000),
});

// Tags (PRODUCT_PLAN §2.6). A name is cleaned the same way as in the form (no "#", single spaces, 40 characters
// at most). A list drops blanks and repeats, ignoring case, and keeps the first spelling.
export const tagNameSchema = z
  .string()
  .transform((value) => cleanTagName(value))
  .pipe(z.string().min(1, "Enter a tag name"));

export const tagNamesSchema = z
  .array(z.string())
  .max(50, "Use at most 50 tags")
  .transform((names) => {
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const raw of names) {
      const name = cleanTagName(raw);
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      kept.push(name);
    }
    return kept;
  });

export const uuidSchema = z.uuid("That item no longer exists.");

// Characters. Each variant is its own row (PRODUCT_PLAN §2.3).
export const importanceSchema = z.enum(["major", "minor"], { error: "Choose major or minor" });
export const statusSchema = z.enum(["alive", "deceased", "unknown"], { error: "Choose a status" });

export const characterFormSchema = z.object({
  name,
  importance: importanceSchema,
  status: statusSchema,
  universeId: optionalUuid,
  predominantTitleId: optionalUuid,
  firstEntryId: optionalUuid,
  lastEntryId: optionalUuid,
  notes: optionalText(10_000),
  entryIds: z.array(uuid).max(500).transform((ids) => [...new Set(ids)]),
});

export const universeNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a universe name")
  .max(60, "Keep the name under 60 characters");

// The recap page's appearances editor: the characters that appear in this recap.
export const recapCharactersSchema = z.array(uuid).max(500).transform((ids) => [...new Set(ids)]);

export const moveEntrySchema = z.object({
  entryId: uuid,
  afterId: z.uuid().nullable(),
});

export const watchedSchema = z.object({
  entryId: uuid,
  watched: z.boolean(),
});

// Timeline events (PRODUCT_PLAN §2.2). The year is any whole number, and the text is a short label. Placement says
// where the event goes within its year: "auto" (last), "first", "keep" (edit only, same year), or the id of the
// event it follows.
export const eventFormSchema = z.object({
  year: requiredWhole("the year", YEAR_MIN, YEAR_MAX),
  text: z.string().trim().min(1, "Enter what happened").max(200, "Keep it under 200 characters"),
  details: optionalText(2000),
  notes: optionalText(10_000),
  titleId: optionalUuid,
  entryId: optionalUuid,
  placement: z
    .string()
    .trim()
    .refine(
      (value) => ["auto", "keep", "first"].includes(value) || z.uuid().safeParse(value).success,
      "Choose where it goes in its year",
    ),
});

export const eventMoveSchema = z.object({
  eventId: uuid,
  afterId: z.uuid().nullable(),
});

// Deleting needs the typed word on the server too, not just in the danger zone's button.
export const deleteConfirmSchema = z.literal("DELETE", { error: "Type DELETE to confirm" });

export type TitleFormInput = z.infer<typeof titleFormSchema>;
export type EpisodeFormInput = z.infer<typeof episodeFormSchema>;
export type EpisodeRangeInput = z.infer<typeof episodeRangeSchema>;
export type CharacterFormInput = z.infer<typeof characterFormSchema>;
