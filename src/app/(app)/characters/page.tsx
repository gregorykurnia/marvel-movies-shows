import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { CharacterTable } from "@/components/characters/character-table";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { loadCharacterTable } from "@/lib/data/characters";
import { formatCount } from "@/lib/format";

export const metadata: Metadata = { title: "Characters" };

// The character directory (DESIGN_GUIDE §8, List). Search, filters and sort are in the table component.
export default function CharactersPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <CharactersContent />
    </Suspense>
  );
}

async function CharactersContent() {
  await connection();
  const { rows } = await loadCharacterTable();
  const universes = new Set(rows.flatMap((row) => (row.universeId ? [row.universeId] : [])));

  return (
    <>
      <PageHeader
        accent="violet"
        eyebrow={`${formatCount(rows.length, "character")} · ${formatCount(universes.size, "universe")}`}
        title="Characters"
        actions={
          <>
            <Link href="/universes" className={buttonVariants({ variant: "secondary" })}>
              Universes
            </Link>
            <Link href="/characters/new" className={buttonVariants({ variant: "primary" })}>
              ＋ Add character
            </Link>
          </>
        }
      />
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <CharacterTable rows={rows} />
      </Suspense>
    </>
  );
}
