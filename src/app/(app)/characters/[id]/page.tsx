import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { PrevNext } from "@/components/layout/prev-next";
import { RecapMarkdown } from "@/components/recaps/recap-markdown";
import { buttonVariants } from "@/components/ui/button";
import { Chip, EpisodeCode } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { loadCharacterDetail, loadNeighbouringCharacters } from "@/lib/data/characters";
import { formatCount } from "@/lib/format";
import { importanceLabel, statusLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Character" };

// One character variant (DESIGN_GUIDE §8, Detail): the fields, notes and tags, and the recaps it appears in.
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
  const [character, neighbours] = await Promise.all([loadCharacterDetail(id), loadNeighbouringCharacters(id)]);
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
          {character.universeName ? <Chip tone="universe">{character.universeName}</Chip> : null}
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

          <section aria-labelledby="appearances" className="grid gap-3">
            <h2 id="appearances" className="font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em]">
              Appearances{" "}
              <span className="font-mono text-base tabular-nums text-ink-3">{character.appearances.length}</span>
            </h2>
            {character.appearances.length === 0 ? (
              <EmptyState icon="★" title="No appearances yet">
                Link the movies and episodes this variant appears in, from its edit page.
              </EmptyState>
            ) : (
              <Panel className="overflow-hidden">
                <ol>
                  {character.appearances.map((appearance) => (
                    <li
                      key={appearance.id}
                      className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b-[1.5px] border-line-soft px-3.5 py-3 last:border-b-0"
                    >
                      {appearance.isMovie ? (
                        <Chip tone="movie" dot>
                          Movie
                        </Chip>
                      ) : (
                        <EpisodeCode>{appearance.code}</EpisodeCode>
                      )}
                      <Link
                        href={appearance.href}
                        className="min-w-0 flex-1 font-semibold no-underline hover:underline hover:underline-offset-4"
                      >
                        {appearance.label}
                      </Link>
                      <Chip tone={appearance.watched ? "watched" : "unwatched"}>
                        {appearance.watched ? "✓ Watched" : "Not watched"}
                      </Chip>
                    </li>
                  ))}
                </ol>
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
              <dt className="font-semibold text-ink-3">First</dt>
              <dd className="text-right font-semibold">
                {character.firstEntry ? (
                  <Link href={`/recaps/${character.firstEntry.id}`} className="underline underline-offset-[3px]">
                    {character.firstEntry.label}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="font-semibold text-ink-3">Last</dt>
              <dd className="text-right font-semibold">
                {character.lastEntry ? (
                  <Link href={`/recaps/${character.lastEntry.id}`} className="underline underline-offset-[3px]">
                    {character.lastEntry.label}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </dl>
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-3 font-display text-[15px] font-bold">Tags</h2>
            {character.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {character.tags.map((tag) => (
                  <Chip key={tag} tone="tag">
                    {tag}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-3">No tags yet.</p>
            )}
          </Panel>
          <p className="text-[13px] text-ink-3">{formatCount(character.appearances.length, "appearance")}</p>
        </aside>
      </div>

      <PrevNext
        previous={neighbours.previous ? { href: `/characters/${neighbours.previous.id}`, title: nameWithUniverse(neighbours.previous) } : null}
        next={neighbours.next ? { href: `/characters/${neighbours.next.id}`, title: nameWithUniverse(neighbours.next) } : null}
      />
    </>
  );
}
