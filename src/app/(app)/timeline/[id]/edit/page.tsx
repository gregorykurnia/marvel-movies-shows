import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { deleteEvent } from "@/actions/events";
import { DangerZone } from "@/components/layout/danger-zone";
import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/layout/page-skeleton";
import { EventForm, type EventFormValues } from "@/components/timeline/event-form";
import { loadEventDetail, loadEventFormOptions } from "@/lib/data/timeline";
import { formatYear } from "@/lib/format";

export const metadata: Metadata = { title: "Edit event" };

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditEventContent params={params} />
    </Suspense>
  );
}

async function EditEventContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const [event, options] = await Promise.all([loadEventDetail(id), loadEventFormOptions()]);
  if (!event) notFound();

  const initial: EventFormValues = {
    year: String(event.year),
    text: event.text,
    details: event.details ?? "",
    titleId: event.titleId,
    entryId: event.entryId,
    placement: "keep",
  };

  return (
    <>
      <PageHeader
        accent="orange"
        eyebrow={`Timeline · ${formatYear(event.year)} · Edit`}
        title={event.text}
        subtitle="Changing the year moves the event to the end of its new year, unless you choose an order."
      />
      <EventForm mode="edit" eventId={id} initial={initial} options={options} />

      <div className="mt-8">
        <DangerZone
          title={`Delete “${event.text}”`}
          confirmWord="DELETE"
          actionLabel="Delete event"
          action={deleteEvent.bind(null, id, "/timeline")}
        >
          Removes this event from the timeline. Its recap is not affected. This can&rsquo;t be undone.
        </DangerZone>
      </div>
    </>
  );
}
