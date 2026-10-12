import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/layout/page-skeleton";
import { blankEvent, EventForm } from "@/components/timeline/event-form";
import { loadEventFormOptions } from "@/lib/data/timeline";

export const metadata: Metadata = { title: "Add event" };

export default function NewEventPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewEventContent />
    </Suspense>
  );
}

async function NewEventContent() {
  await connection();
  const options = await loadEventFormOptions();
  return (
    <>
      <PageHeader
        accent="orange"
        eyebrow="Timeline · New"
        title="Add an event"
        subtitle="Give it a year and a short line. Events are placed by year, so the order you type them in doesn’t matter."
      />
      <EventForm mode="new" initial={blankEvent} options={options} />
    </>
  );
}
