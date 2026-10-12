import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { deleteCharacter } from "@/actions/characters";
import { DangerZone } from "@/components/layout/danger-zone";
import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/layout/page-skeleton";
import { CharacterForm } from "@/components/characters/character-form";
import { loadAppearanceIds, loadCharacterFormOptions, loadCharacterRecord } from "@/lib/data/characters";

export const metadata: Metadata = { title: "Edit character" };

export default function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditCharacterContent params={params} />
    </Suspense>
  );
}

async function EditCharacterContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const [character, appearanceIds, options] = await Promise.all([
    loadCharacterRecord(id),
    loadAppearanceIds(id),
    loadCharacterFormOptions(),
  ]);
  if (!character) notFound();

  return (
    <>
      <PageHeader
        accent="violet"
        eyebrow="Characters · Edit"
        title={character.name}
        subtitle="Changing a variant’s universe or status leaves its other variants alone."
      />
      <CharacterForm
        mode="edit"
        characterId={id}
        initial={{
          name: character.name,
          importance: character.importance,
          status: character.status,
          universeId: character.universeId,
          predominantTitleId: character.predominantTitleId,
          firstEntryId: character.firstEntryId,
          lastEntryId: character.lastEntryId,
          notes: character.notes ?? "",
          entryIds: appearanceIds,
        }}
        {...options}
      />

      <div className="mt-8">
        <DangerZone
          title={`Delete “${character.name}”`}
          confirmWord="DELETE"
          actionLabel="Delete character"
          action={deleteCharacter.bind(null, id, "/characters")}
        >
          Removes this variant, its tags and its appearances. The recaps it appeared in stay as they are. This can&rsquo;t
          be undone.
        </DangerZone>
      </div>
    </>
  );
}
