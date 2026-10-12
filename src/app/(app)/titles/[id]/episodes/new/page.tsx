import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/layout/page-skeleton";
import { EpisodeForm } from "@/components/titles/episode-form";
import { loadMovieEntryId, loadTitle } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Add episodes" };

export default function AddEpisodesPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <AddEpisodesContent params={params} />
    </Suspense>
  );
}

async function AddEpisodesContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const title = await loadTitle(id);
  if (!title) notFound();
  if (title.kind === "movie") {
    const entryId = await loadMovieEntryId(id);
    if (entryId) redirect(`/recaps/${entryId}/edit`);
    notFound();
  }

  return (
    <>
      <PageHeader
        accent="blue"
        eyebrow="Show · Episodes · New"
        title="Add episodes"
        subtitle={`For ${title.name}. A run keeps its episode order, and it's placed by its year.`}
      />
      <EpisodeForm titleId={id} showName={title.name} />
    </>
  );
}
