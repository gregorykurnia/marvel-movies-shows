import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { UniverseManager } from "@/components/universes/universe-manager";
import { loadUniverseRows } from "@/lib/data/characters";
import { formatCount } from "@/lib/format";

export const metadata: Metadata = { title: "Universes" };

// The universes list (PRODUCT_PLAN §2.3). A character's universe comes from this list.
export default function UniversesPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <UniversesContent />
    </Suspense>
  );
}

async function UniversesContent() {
  await connection();
  const universes = await loadUniverseRows();

  return (
    <>
      <PageHeader
        accent="violet"
        eyebrow={`Characters · Universes · ${universes.length}`}
        title="Universes"
        subtitle="The list the universe dropdown on each character uses. Earth numbers are fine here."
        actions={
          <Link href="/characters" className={buttonVariants({ variant: "secondary" })}>
            ← Characters
          </Link>
        }
      />
      <UniverseManager universes={universes} />
      <p className="mt-4 text-[13px] text-ink-3">
        {formatCount(universes.length, "universe")} · a universe in use by a character can&rsquo;t be deleted.
      </p>
    </>
  );
}
