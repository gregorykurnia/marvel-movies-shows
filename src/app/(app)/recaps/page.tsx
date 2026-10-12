import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/layout/page-skeleton";
import { RecapList, type FilterOption } from "@/components/recaps/recap-list";
import { loadCatalog } from "@/lib/data/catalog";
import { recapsHref, type RecapFilters, type TypeFilter, type WatchedFilter } from "@/lib/recap-filters";

export const metadata: Metadata = { title: "Recaps" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
  const watched: WatchedFilter = ["watched", "unwatched"].includes(first(params.watched) ?? "")
    ? (first(params.watched) as WatchedFilter)
    : "all";
  const type: TypeFilter = ["movie", "show"].includes(first(params.type) ?? "")
    ? (first(params.type) as TypeFilter)
    : "all";

  const catalog = await loadCatalog();
  const requestedTag = first(params.tag)?.trim().toLowerCase() ?? "";
  const tag = requestedTag ? (catalog.flatMap((entry) => entry.tags).find((name) => name.toLowerCase() === requestedTag) ?? null) : null;
  const filters: RecapFilters = { watched, type, tag };

  const visible = catalog.filter(
    (entry) =>
      (watched === "all" || (watched === "watched") === entry.watched) &&
      (type === "all" || entry.titleKind === type) &&
      (tag === null || entry.tags.includes(tag)),
  );
  const tagOptions = [...new Set(catalog.flatMap((entry) => entry.tags))].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );

  const watchedOptions: FilterOption[] = [
    { href: recapsHref({ ...filters, watched: "all" }), label: "All", active: watched === "all" },
    { href: recapsHref({ ...filters, watched: "watched" }), label: "Watched", active: watched === "watched" },
    { href: recapsHref({ ...filters, watched: "unwatched" }), label: "Not watched", active: watched === "unwatched" },
  ];
  const typeOptions: FilterOption[] = [
    { href: recapsHref({ ...filters, type: "all" }), label: "All", active: type === "all" },
    { href: recapsHref({ ...filters, type: "movie" }), label: "Movies", active: type === "movie" },
    { href: recapsHref({ ...filters, type: "show" }), label: "Shows", active: type === "show" },
  ];

  return (
    <RecapList
      entries={visible}
      totals={{ total: catalog.length, watched: catalog.filter((entry) => entry.watched).length }}
      filtered={watched !== "all" || type !== "all" || tag !== null}
      filters={filters}
      tagOptions={tagOptions}
      watchedOptions={watchedOptions}
      typeOptions={typeOptions}
    />
  );
}
