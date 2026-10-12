import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { deleteTitle } from "@/actions/titles";
import { DangerZone } from "@/components/layout/danger-zone";
import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/layout/page-skeleton";
import { TitleEditForm } from "@/components/titles/title-forms";
import { loadMovieEntryId, loadTitle } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Edit show" };

export default function EditShowPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditShowContent params={params} />
    </Suspense>
  );
}

async function EditShowContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const title = await loadTitle(id);
  if (!title) notFound();

  // A movie is edited on its recap page, where its year lives.
  if (title.kind === "movie") {
    const entryId = await loadMovieEntryId(id);
    if (entryId) redirect(`/recaps/${entryId}/edit`);
    notFound();
  }

  return (
    <>
      <PageHeader
        accent="blue"
        eyebrow="Show · Edit"
        title={title.name}
        subtitle="Renaming a show doesn’t change its episodes or their order."
      />
      <TitleEditForm titleId={id} defaultName={title.name} defaultReleaseDate={title.releaseDate} />

      <div className="mt-8">
        <DangerZone
          title={`Delete “${title.name}”`}
          confirmWord="DELETE"
          actionLabel="Delete show"
          action={deleteTitle.bind(null, id, "/titles")}
        >
          Deletes the show, all of its episodes and their recaps. Their appearances on characters are removed too. This
          can&rsquo;t be undone.
        </DangerZone>
      </div>
    </>
  );
}
