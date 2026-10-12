// Display helpers. Years, codes and counts are set in mono by the components (DESIGN_GUIDE §4).

// Negative years use a real minus sign (U+2212), as DESIGN_GUIDE §4 asks.
const MINUS = "−";

// "2012", or "−5000" for a year before 1 AD. Null means no year has been set.
export function formatYear(year: number | null): string {
  if (year === null) return "—";
  return year < 0 ? `${MINUS}${Math.abs(year)}` : String(year);
}

// "S01·E01", with a middle dot. Null for a movie (no season or episode).
export function formatEpisodeCode(season: number | null, episode: number | null): string | null {
  if (season === null || episode === null) return null;
  return `S${pad2(season)}·E${pad2(episode)}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

// The decade a year falls in: 1945 → 1940, −5003 → −5010.
export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

// Group label for the recap list, e.g. "1940S". Entries with no year go under "NO YEAR".
export function decadeLabel(year: number | null): string {
  if (year === null) return "NO YEAR";
  const decade = decadeOf(year);
  return `${decade < 0 ? MINUS : ""}${Math.abs(decade)}S`;
}

// "9 Jun 2021" from a Postgres date string (YYYY-MM-DD). It's formatted in UTC so the day never shifts.
export function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}
