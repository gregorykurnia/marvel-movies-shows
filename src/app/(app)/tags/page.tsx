import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { TagManager } from "@/components/tags/tag-manager";
import { buttonVariants } from "@/components/ui/button";
import { loadTagRows } from "@/lib/data/tags";
import { formatCount } from "@/lib/format";
import Link from "next/link";

export const metadata: Metadata = { title: "Tags" };

// Tag management (DESIGN_GUIDE §8, List). Tags are made on the recap, event and character forms.
export default function TagsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <TagsContent />
    </Suspense>
  );
}

async function TagsContent() {
  await connection();
  const rows = await loadTagRows();

  return (
    <>
      <PageHeader
        accent="red"
        eyebrow={`Tags · ${formatCount(rows.length, "tag")}`}
        title="Tags"
        subtitle="Rename a tag, merge two that mean the same thing, or delete one. Names match ignoring case."
        actions={
          <Link href="/recaps" className={buttonVariants({ variant: "secondary" })}>
            Recaps
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState icon="#" title="No tags yet">
          Add a tag on a recap, a timeline event or a character. It will show up here.
        </EmptyState>
      ) : (
        <TagManager rows={rows} />
      )}
    </>
  );
}
