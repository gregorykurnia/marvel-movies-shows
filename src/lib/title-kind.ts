// The three kinds of title (PRODUCT_PLAN §3). A movie and a short each have one entry and one recap. A show has episodes.
export type TitleKind = "movie" | "show" | "short";

export const KIND_LABEL: Record<TitleKind, string> = { movie: "Movie", show: "Show", short: "Short" };

// The section accent for a kind's recap and edit pages (DESIGN_GUIDE §2, "Section accents").
export const KIND_ACCENT = { movie: "red", show: "blue", short: "orange" } as const;

// The 6px kind bar on a row (DESIGN_GUIDE §7, "Recap row"). Spelled out in full so Tailwind finds each class.
export const KIND_BAR = { movie: "bg-movie", show: "bg-show", short: "bg-short" } as const;

// A movie or a short is one recap with no episode list. Its title page opens the recap.
export function hasOneRecap(kind: TitleKind) {
  return kind !== "show";
}
