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
import { WatchedControl } from "@/components/recaps/watched-control";
import { buttonVariants } from "@/components/ui/button";
import { Chip, EpisodeCode, Year } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { CharacterAvatar } from "@/components/characters/character-avatar";
import { loadRecapCharacters } from "@/lib/data/characters";
import { loadCatalog, loadEntryDetail } from "@/lib/data/catalog";
import { formatDate, formatEpisodeCode, formatYear } from "@/lib/format";

export const metadata: Metadata = { title: "Recap" };

// One recap (DESIGN_GUIDE §8, Detail). The recap is read in a 68ch column, and the facts sit in a side card.
// Previous and next follow the custom order.
export default function RecapPage({ params }: { params: Promise<{ entryId: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <RecapContent params={params} />
    </Suspense>
  );
}

async function RecapContent({ params }: { params: Promise<{ entryId: string }> }) {
  await connection();
  const { entryId } = await params;
  const [entry, catalog, recapCharacters] = await Promise.all([
    loadEntryDetail(entryId),
    loadCatalog(),
    loadRecapCharacters(entryId),
  ]);
  if (!entry) notFound();

  const isMovie = entry.titleKind === "movie";
  const episodeName = entry.name ?? `Episode ${entry.episodeNumber}`;
  const heading = isMovie ? entry.titleName : episodeName;
  const code = formatEpisodeCode(entry.seasonNumber, entry.episodeNumber);
  const position = catalog.findIndex((item) => item.id === entry.id);
  const previous = position > 0 ? catalog[position - 1] : null;
  const next = position >= 0 && position < catalog.length - 1 ? catalog[position + 1] : null;
  const label = (item: (typeof catalog)[number]) =>
    item.titleKind === "movie" ? item.titleName : `${item.titleName} — ${item.name ?? `Episode ${item.episodeNumber}`}`;
  const releaseDate = isMovie ? entry.titleReleaseDate : entry.releaseDate;

  return (
    <>
      <PageHeader
        accent={isMovie ? "red" : "blue"}
        eyebrow={
          isMovie
            ? "Movie"
            : `${entry.titleName} · Season ${entry.seasonNumber} · Episode ${entry.episodeNumber}`
        }
        title={heading}
        actions={
          <Link href={`/recaps/${entry.id}/edit`} className={buttonVariants({ variant: "secondary" })}>
            ✎ Edit
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone={isMovie ? "movie" : "show"} dot>
            {isMovie ? "Movie" : "Show"}
          </Chip>
          {code ? <EpisodeCode>{code}</EpisodeCode> : null}
          <Year>{formatYear(entry.inUniverseYear)}</Year>
          {entry.universeName ? <Chip tone="universe">{entry.universeName}</Chip> : null}
          <WatchedControl entryId={entry.id} watched={entry.watched} />
        </div>
      </PageHeader>

      <div className="grid items-start gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-6">
          <Panel className="p-5 min-[640px]:p-7">
            {entry.recap ? (
              <RecapMarkdown text={entry.recap} />
            ) : (
              <EmptyState
                icon="✎"
                title="No recap yet"
                action={
                  <Link href={`/recaps/${entry.id}/edit`} className={buttonVariants({ variant: "primary" })}>
                    Paste recap
                  </Link>
                }
              >
                Paste the recap as plain text or Markdown. It will be shown here exactly as written.
              </EmptyState>
            )}
          </Panel>
          {entry.notes ? (
            <Panel className="p-5 min-[640px]:p-7">
              <h2 className="mb-3 font-display text-2xl leading-[1.15] font-bold tracking-[-0.02em]">Notes</h2>
              <RecapMarkdown text={entry.notes} />
            </Panel>
          ) : null}
        </div>

        <aside className="grid gap-4">
          <Panel className="p-5">
            <h2 className="mb-3 font-display text-[15px] font-bold">Characters</h2>
            {recapCharacters.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {recapCharacters.map((character) => (
                  <li key={character.id} className="list-none">
                    <Link
                      href={`/characters/${character.id}`}
                      className="inline-flex items-center gap-2 rounded-pill border-[1.5px] border-line-soft py-1 pr-2.5 pl-1 text-[13px] font-semibold no-underline hover:border-line"
                    >
                      <CharacterAvatar name={character.name} />
                      {character.name}
                      {character.universeName ? (
                        <span className="font-mono text-xs text-ink-3">{character.universeName}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">No characters linked to this recap yet.</p>
            )}
          </Panel>
          <Panel className="p-5">
            <h2 className="mb-3 font-display text-[15px] font-bold">Tags</h2>
            {entry.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag) => (
                  <Chip key={tag} tone="tag">
                    {tag}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-3">No tags yet.</p>
            )}
          </Panel>
          <Panel className="p-5">
            <h2 className="mb-3 font-display text-[15px] font-bold">Details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2.5 text-sm">
              <dt className="font-semibold text-ink-3">Released</dt>
              <dd className="text-right font-semibold">{formatDate(releaseDate) ?? "—"}</dd>
              <dt className="font-semibold text-ink-3">Year in universe</dt>
              <dd className="text-right font-mono font-semibold tabular-nums">{formatYear(entry.inUniverseYear)}</dd>
              <dt className="font-semibold text-ink-3">Universe</dt>
              {entry.universeName ? (
                <dd className="text-right font-mono font-semibold">{entry.universeName}</dd>
              ) : (
                <dd className="text-right text-ink-3">No universe set</dd>
              )}
              <dt className="font-semibold text-ink-3">Position</dt>
              <dd className="text-right font-mono font-semibold tabular-nums">
                {position + 1} / {catalog.length}
              </dd>
            </dl>
          </Panel>
        </aside>
      </div>

      <PrevNext
        previous={previous ? { href: `/recaps/${previous.id}`, title: label(previous) } : null}
        next={next ? { href: `/recaps/${next.id}`, title: label(next) } : null}
      />
    </>
  );
}
