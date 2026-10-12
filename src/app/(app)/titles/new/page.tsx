import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { TitleNewForm } from "@/components/titles/title-forms";

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
      <TitleNewForm />
    </>
  );
}
