import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { PrevNext } from "@/components/layout/prev-next";
import { CharacterTagsCard } from "@/components/characters/character-tags-card";
import { RecapMarkdown } from "@/components/recaps/recap-markdown";
import { buttonVariants } from "@/components/ui/button";
import { Chip, EpisodeCode } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { loadCharacterDetail, loadNeighbouringCharacters, type AppearanceLink } from "@/lib/data/characters";
import { loadTagNames } from "@/lib/data/tags";
import { importanceLabel, statusLabel } from "@/lib/labels";
import { KIND_LABEL } from "@/lib/title-kind";

export const metadata: Metadata = { title: "Character" };

// One character variant (DESIGN_GUIDE §8, Detail): the fields, notes and tags, and its first and last appearance.
export default function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <CharacterContent params={params} />
    </Suspense>
  );
}

async function CharacterContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const [character, neighbours, tagOptions] = await Promise.all([
    loadCharacterDetail(id),
    loadNeighbouringCharacters(id),
    loadTagNames(),
  ]);
  if (!character) notFound();

  const universeText = character.universeName ?? "No universe";
  const nameWithUniverse = (row: { name: string; universeName: string | null }) =>
    row.universeName ? `${row.name} · ${row.universeName}` : row.name;

  return (
    <>
      <PageHeader
        accent="violet"
        eyebrow={`Characters · ${universeText}`}
        title={character.name}
        actions={
          <Link href={`/characters/${id}/edit`} className={buttonVariants({ variant: "primary" })}>
            ✎ Edit
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone={character.importance}>{importanceLabel(character.importance)}</Chip>
          <Chip tone={character.status} dot>
            {statusLabel(character.status)}
          </Chip>
          {character.universeName ? (
            // Long universe names are cut short here so they stay clear of the Edit button. The Details card has the full name.
            <Chip tone="universe" className="min-w-0 max-w-full" title={character.universeName}>
              <span className="min-w-0 truncate">{character.universeName}</span>
            </Chip>
          ) : null}
        </div>
      </PageHeader>

      <div className="grid items-start gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-6">
          <Panel className="p-5 min-[640px]:p-7">
            <h2 className="mb-3 font-display text-2xl leading-[1.15] font-bold tracking-[-0.02em]">Notes</h2>
            {character.notes ? (
              <RecapMarkdown text={character.notes} />
            ) : (
              <p className="text-ink-3">No notes yet.</p>
            )}
          </Panel>

          <section aria-labelledby="first-last-appearance" className="grid gap-3">
            <h2
              id="first-last-appearance"
              className="font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em]"
            >
              First and last appearance
            </h2>
            {character.firstAppearance === null && character.lastAppearance === null ? (
              <EmptyState icon="★" title="No appearances yet">
                Set the first and last appearance from this variant&rsquo;s edit page, or from the recap it first appears in.
              </EmptyState>
            ) : (
              <Panel className="overflow-hidden">
                <dl>
                  <AppearanceRow label="First" appearance={character.firstAppearance} />
                  <AppearanceRow label="Last" appearance={character.lastAppearance} />
                </dl>
              </Panel>
            )}
          </section>
        </div>

        <aside className="grid gap-4">
          <Panel className="p-5">
            <h2 className="mb-3 font-display text-[15px] font-bold">Details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2.5 text-sm">
              <dt className="font-semibold text-ink-3">Importance</dt>
              <dd className="text-right font-semibold">{importanceLabel(character.importance)}</dd>
              <dt className="font-semibold text-ink-3">Status</dt>
              <dd className="text-right font-semibold">{statusLabel(character.status)}</dd>
              <dt className="font-semibold text-ink-3">Universe</dt>
              <dd className="text-right font-mono font-semibold">{character.universeName ?? "—"}</dd>
              <dt className="font-semibold text-ink-3">Predominant</dt>
              <dd className="text-right font-semibold">
                {character.predominantTitleId ? (
                  <Link href={`/titles/${character.predominantTitleId}`} className="underline underline-offset-[3px]">
                    {character.predominantTitleName}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </dl>
          </Panel>

          <CharacterTagsCard characterId={id} initial={character.tags} options={tagOptions} />
        </aside>
      </div>

      <PrevNext
        previous={neighbours.previous ? { href: `/characters/${neighbours.previous.id}`, title: nameWithUniverse(neighbours.previous) } : null}
        next={neighbours.next ? { href: `/characters/${neighbours.next.id}`, title: nameWithUniverse(neighbours.next) } : null}
      />
    </>
  );
}

// One row of the first and last appearance list: the label, the entry's kind or code, a link, and its watched state.
function AppearanceRow({ label, appearance }: { label: string; appearance: AppearanceLink | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b-[1.5px] border-line-soft px-3.5 py-3 last:border-b-0">
      <dt className="w-12 shrink-0 font-mono text-xs font-bold tracking-[0.06em] text-ink-3 uppercase">{label}</dt>
      {appearance ? (
        <>
          {appearance.titleKind !== "show" ? (
            <Chip tone={appearance.titleKind} dot>
              {KIND_LABEL[appearance.titleKind]}
            </Chip>
          ) : (
            <EpisodeCode>{appearance.code}</EpisodeCode>
          )}
          {/* On a phone the title takes a line of its own, under the kind and the watched chip. */}
          <dd className="order-3 min-w-0 basis-full font-semibold min-[640px]:order-none min-[640px]:flex-1 min-[640px]:basis-auto">
            <Link href={appearance.href} className="no-underline hover:underline hover:underline-offset-4">
              {appearance.label}
            </Link>
          </dd>
          <Chip tone={appearance.watched ? "watched" : "unwatched"} className="ml-auto min-[640px]:ml-0">
            {appearance.watched ? "✓ Watched" : "Not watched"}
          </Chip>
        </>
      ) : (
        <dd className="order-3 basis-full text-ink-3 min-[640px]:order-none min-[640px]:flex-1 min-[640px]:basis-auto">Not set</dd>
      )}
    </div>
  );
}
