import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/layout/page-skeleton";
import { TimelineView, type TypeFilter } from "@/components/timeline/timeline-view";
import { loadTimelineEvents } from "@/lib/data/timeline";

export const metadata: Metadata = { title: "Timeline" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The grand timeline (DESIGN_GUIDE §8, Canvas). The type filter starts from the URL, so a filtered view can be bookmarked.
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
  const type: TypeFilter = requested === "movie" || requested === "show" ? requested : "all";
  const events = await loadTimelineEvents();
  return <TimelineView events={events} initialType={type} />;
}
