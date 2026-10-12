import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/layout/page-skeleton";
import { RecapList, type FilterOption } from "@/components/recaps/recap-list";
import { loadCatalog } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Recaps" };

type Watched = "all" | "watched" | "unwatched";
type TypeFilter = "all" | "movie" | "show";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// The filters are in the URL (?watched=…&type=…), so a filtered view can be bookmarked and shared.
function hrefFor(watched: Watched, type: TypeFilter) {
  const params = new URLSearchParams();
  if (watched !== "all") params.set("watched", watched);
  if (type !== "all") params.set("type", type);
  const query = params.toString();
  return query ? `/recaps?${query}` : "/recaps";
}

export default function RecapsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <RecapsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RecapsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const watched: Watched = ["watched", "unwatched"].includes(first(params.watched) ?? "")
    ? (first(params.watched) as Watched)
    : "all";
  const type: TypeFilter = ["movie", "show"].includes(first(params.type) ?? "")
    ? (first(params.type) as TypeFilter)
    : "all";

  const catalog = await loadCatalog();
  const visible = catalog.filter(
    (entry) =>
      (watched === "all" || (watched === "watched") === entry.watched) &&
      (type === "all" || entry.titleKind === type),
  );

  const watchedOptions: FilterOption[] = [
    { href: hrefFor("all", type), label: "All", active: watched === "all" },
    { href: hrefFor("watched", type), label: "Watched", active: watched === "watched" },
    { href: hrefFor("unwatched", type), label: "Not watched", active: watched === "unwatched" },
  ];
  const typeOptions: FilterOption[] = [
    { href: hrefFor(watched, "all"), label: "All", active: type === "all" },
    { href: hrefFor(watched, "movie"), label: "Movies", active: type === "movie" },
    { href: hrefFor(watched, "show"), label: "Shows", active: type === "show" },
  ];

  return (
    <RecapList
      entries={visible}
      totals={{ total: catalog.length, watched: catalog.filter((entry) => entry.watched).length }}
      filtered={watched !== "all" || type !== "all"}
      watchedOptions={watchedOptions}
      typeOptions={typeOptions}
    />
  );
}
