import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SearchResultGroups } from "@/components/search/search-results";
import { buttonVariants } from "@/components/ui/button";
import { searchDirectory, type SearchGroup } from "@/lib/data/search";
import { formatCount } from "@/lib/format";
import { toPrefixQuery } from "@/lib/search-query";

export const metadata: Metadata = { title: "Search" };

// Global search (IMPLEMENTATION_PLAN §4, DESIGN_GUIDE §8 List). ?q= is the search. ?group= shows every match in one group.
const MAX_QUERY_LENGTH = 100;
const GROUPS: SearchGroup[] = ["recaps", "events", "characters"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const query = (first(params.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const group = GROUPS.find((candidate) => candidate === first(params.group)) ?? null;
  const searchable = toPrefixQuery(query) !== null;
  const results = searchable ? await searchDirectory(query, group) : null;
  const total = results ? results.recaps.total + results.events.total + results.characters.total : 0;

  return (
    <>
      <PageHeader
        accent="red"
        eyebrow={query ? `Search · ${formatCount(total, "result")}` : "Search"}
        title={query ? `“${query}”` : "Search"}
        subtitle="Recaps, timeline events and characters, including their notes and tags. Press / from any page to jump here."
        actions={
          group && query ? (
            <Link href={`/search?q=${encodeURIComponent(query)}`} className={buttonVariants({ variant: "secondary" })}>
              All results
            </Link>
          ) : null
        }
      />

      {!query ? (
        <EmptyState icon="⌕" title="Search everything">
          Type a name, a word from a recap, a timeline event, a note or a tag.
        </EmptyState>
      ) : !results ? (
        <EmptyState icon="…" title="Type a little more">
          Search needs at least two letters or digits.
        </EmptyState>
      ) : total === 0 ? (
        <EmptyState icon="∅" title="Nothing matches">
          Try a shorter word, or check the spelling.
        </EmptyState>
      ) : (
        <SearchResultGroups query={query} results={results} showAll={group} />
      )}
    </>
  );
}
