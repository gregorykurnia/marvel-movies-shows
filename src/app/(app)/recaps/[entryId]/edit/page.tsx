import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { deleteEpisode } from "@/actions/entries";
import { deleteTitle } from "@/actions/titles";
import { DangerZone } from "@/components/layout/danger-zone";
import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/layout/page-skeleton";
import { RecapEditForm } from "@/components/recaps/recap-edit-form";
import { loadCharacterPickerOptions, loadRecapCharacterIds, loadUniverseOptions } from "@/lib/data/characters";
import { loadEntryDetail } from "@/lib/data/catalog";
import { loadEntryTimeJumps } from "@/lib/data/time-jumps";
import { loadTagNames } from "@/lib/data/tags";
import { formatEpisodeCode } from "@/lib/format";
import { KIND_ACCENT, KIND_LABEL, hasOneRecap } from "@/lib/title-kind";

export const metadata: Metadata = { title: "Edit recap" };

export default function EditRecapPage({ params }: { params: Promise<{ entryId: string }> }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditRecapContent params={params} />
    </Suspense>
  );
}

async function EditRecapContent({ params }: { params: Promise<{ entryId: string }> }) {
  await connection();
  const { entryId } = await params;
  const [entry, characterOptions, characterIds, tagOptions, universeOptions, timeJumps] = await Promise.all([
    loadEntryDetail(entryId),
    loadCharacterPickerOptions(),
    loadRecapCharacterIds(entryId),
    loadTagNames(),
    loadUniverseOptions(),
    loadEntryTimeJumps(entryId),
  ]);
  if (!entry) notFound();

  const oneRecap = hasOneRecap(entry.titleKind);
  const kindWord = KIND_LABEL[entry.titleKind].toLowerCase();
  const code = formatEpisodeCode(entry.seasonNumber, entry.episodeNumber);

  return (
    <>
      <PageHeader
        accent={KIND_ACCENT[entry.titleKind]}
        eyebrow={oneRecap ? `Recaps · ${KIND_LABEL[entry.titleKind]} · Edit` : `Recaps · ${code} · Edit`}
        title={oneRecap ? entry.titleName : `${entry.titleName} — ${entry.name ?? `Episode ${entry.episodeNumber}`}`}
        subtitle="Paste the recap on the left. The preview shows how it will look on the recap page."
      />
      <RecapEditForm
        entry={entry}
        characterOptions={characterOptions}
        initialCharacterIds={characterIds}
        tagOptions={tagOptions}
        universeOptions={universeOptions}
        timeJumps={timeJumps}
      />

      {oneRecap ? (
        <div className="mt-8">
          <DangerZone
            title={`Delete “${entry.titleName}”`}
            confirmWord="DELETE"
            actionLabel={`Delete ${kindWord}`}
            action={deleteTitle.bind(null, entry.titleId, "/recaps")}
          >
            Deletes the {kindWord} and its recap. Its appearances on characters are removed too. This can&rsquo;t be undone.
          </DangerZone>
        </div>
      ) : (
        <div className="mt-8">
          <DangerZone
            title={`Delete “${entry.name ?? `Episode ${entry.episodeNumber}`}”`}
            confirmWord="DELETE"
            actionLabel="Delete episode"
            action={deleteEpisode.bind(null, entry.id, `/titles/${entry.titleId}`)}
          >
            Deletes this episode and its recap. Its appearances and tags are removed too. Timeline events that link to it
            keep their place and lose the link. This can&rsquo;t be undone.
          </DangerZone>
        </div>
      )}
    </>
  );
}
