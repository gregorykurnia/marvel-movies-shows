import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/layout/page-skeleton";
import { CharacterForm, blankCharacter } from "@/components/characters/character-form";
import { loadCharacterFormOptions } from "@/lib/data/characters";

export const metadata: Metadata = { title: "Add a character" };

export default function NewCharacterPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewCharacterContent />
    </Suspense>
  );
}

async function NewCharacterContent() {
  await connection();
  const options = await loadCharacterFormOptions();

  return (
    <>
      <PageHeader
        accent="violet"
        eyebrow="Characters · New"
        title="Add a character"
        subtitle="Each variant is its own character."
      />
      <CharacterForm mode="new" initial={blankCharacter} {...options} />
    </>
  );
}
