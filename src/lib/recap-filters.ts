// The recap list's filters, kept in the URL (?watched=…&type=…&tag=…), so a filtered view can be bookmarked. Shared by
// the page (which reads them) and the list (which builds the links), so every link and menu agrees.
export type WatchedFilter = "all" | "watched" | "unwatched";
export type TypeFilter = "all" | "movie" | "show";
export type RecapFilters = { watched: WatchedFilter; type: TypeFilter; tag: string | null };

export function recapsHref(filters: RecapFilters): string {
  const params = new URLSearchParams();
  if (filters.watched !== "all") params.set("watched", filters.watched);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.tag) params.set("tag", filters.tag);
  const query = params.toString();
  return query ? `/recaps?${query}` : "/recaps";
}
