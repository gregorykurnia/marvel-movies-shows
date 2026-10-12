import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/layout/page-skeleton";
import { TimelineView, type TypeFilter } from "@/components/timeline/timeline-view";
import { loadRecapItems, loadTimelineEvents } from "@/lib/data/timeline";

export const metadata: Metadata = { title: "Timeline" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The grand timeline (DESIGN_GUIDE §8, Canvas). The filters start from the URL, so a filtered view can be bookmarked.
// Hand-written events and recap items are loaded separately, so only events can be reordered.
export default function TimelinePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <TimelineContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TimelineContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const requested = Array.isArray(params.type) ? params.type[0] : params.type;
  const type: TypeFilter = requested === "movie" || requested === "show" || requested === "short" ? requested : "all";
  const tagParam = Array.isArray(params.tag) ? params.tag[0] : params.tag;
  const tag = tagParam?.trim() ? tagParam.trim() : null;
  const [events, recaps] = await Promise.all([loadTimelineEvents(), loadRecapItems()]);
  return <TimelineView events={events} recaps={recaps} initialType={type} initialTag={tag} />;
}
