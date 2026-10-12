import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/layout/page-skeleton";
import { TitleNewForm } from "@/components/titles/title-forms";
import { loadUniverseOptions } from "@/lib/data/characters";

export const metadata: Metadata = { title: "Add a title" };

export default function NewTitlePage() {
  return (
    <>
      <PageHeader
        accent="red"
        eyebrow="Titles · New"
        title="Add a title"
        subtitle="A movie is one recap. A show gets its episodes on its own page next."
      />
      <Suspense fallback={<FormSkeleton />}>
        <NewTitleContent />
      </Suspense>
    </>
  );
}

async function NewTitleContent() {
  await connection();
  const universes = await loadUniverseOptions();
  return <TitleNewForm universes={universes} />;
}
