import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { PrevNext } from "@/components/layout/prev-next";
import { WatchedControl } from "@/components/recaps/watched-control";
import { buttonVariants } from "@/components/ui/button";
import { Chip, EpisodeCode, Year } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress";
import {
  loadEpisodesForTitle,
  loadMovieEntryId,
  loadTitle,
  loadTitleRows,
  progressOf,
  type CatalogEntry,
} from "@/lib/data/catalog";
import { formatCount, formatDate, formatEpisodeCode, formatYear } from "@/lib/format";

export const metadata: Metadata = { title: "Show" };

// A show: its seasons and episodes, with progress for each season and for the whole show (§2.4).
// A movie has no episode list, so its page sends you to its recap.
export default function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <ShowContent params={params} />
    </Suspense>
  );
}

async function ShowContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const title = await loadTitle(id);
  if (!title) notFound();

  if (title.kind === "movie") {
    const entryId = await loadMovieEntryId(id);
    if (entryId) redirect(`/recaps/${entryId}`);
    notFound();
  }

  const [episodes, titleRows] = await Promise.all([loadEpisodesForTitle(id), loadTitleRows()]);
  const overall = progressOf(episodes);
  const seasons = groupBySeason(episodes);
  const position = titleRows.findIndex((row) => row.id === id);
  const previous = position > 0 ? titleRows[position - 1] : null;
  const next = position >= 0 && position < titleRows.length - 1 ? titleRows[position + 1] : null;
  const year = title.releaseDate ? Number(title.releaseDate.slice(0, 4)) : null;

  return (
    <>
      <PageHeader
        accent="blue"
        eyebrow={`Show · ${formatCount(seasons.length, "season")}`}
        title={title.name}
        actions={
          <>
            <Link href={`/titles/${id}/edit`} className={buttonVariants({ variant: "secondary" })}>
              ✎ Edit
            </Link>
            <Link href={`/titles/${id}/episodes/new`} className={buttonVariants({ variant: "primary" })}>
              ＋ Add episodes
            </Link>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone="show" dot>
            Show
          </Chip>
          {year !== null ? <Year>{formatYear(year)}</Year> : null}
        </div>
        {overall.total > 0 ? (
          <ProgressBar
            className="mt-3"
            ariaLabel={`${title.name} watched progress`}
            value={overall.percent}
            label={`${overall.watched} / ${overall.total} · ${Math.round(overall.percent)}%`}
          />
        ) : null}
      </PageHeader>

      {episodes.length === 0 ? (
        <EmptyState
          icon="▶"
          title="No episodes yet"
          action={
            <Link href={`/titles/${id}/episodes/new`} className={buttonVariants({ variant: "primary" })}>
              ＋ Add episodes
            </Link>
          }
        >
          Add one episode at a time, or a whole season at once. Each one gets its recap page.
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-7">
            {seasons.map((season) => (
              <SeasonSection key={season.number} number={season.number} episodes={season.episodes} />
            ))}
          </div>
          <aside>
            <Panel className="p-5">
              <h2 className="mb-3 font-display text-[15px] font-bold">Details</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2.5 text-sm">
                <dt className="font-semibold text-ink-3">Premiere</dt>
                <dd className="text-right font-semibold">{formatDate(title.releaseDate) ?? "—"}</dd>
                <dt className="font-semibold text-ink-3">Seasons</dt>
                <dd className="text-right font-mono font-semibold tabular-nums">{seasons.length}</dd>
                <dt className="font-semibold text-ink-3">Episodes</dt>
                <dd className="text-right font-mono font-semibold tabular-nums">{episodes.length}</dd>
                <dt className="font-semibold text-ink-3">Watched</dt>
                <dd className="text-right font-mono font-semibold tabular-nums">
                  {overall.watched} / {overall.total}
                </dd>
              </dl>
            </Panel>
          </aside>
        </div>
      )}

      <PrevNext
        previous={previous ? { href: `/titles/${previous.id}`, title: previous.name } : null}
        next={next ? { href: `/titles/${next.id}`, title: next.name } : null}
      />
    </>
  );
}

function groupBySeason(episodes: CatalogEntry[]) {
  const map = new Map<number, CatalogEntry[]>();
  for (const episode of episodes) {
    const number = episode.seasonNumber ?? 0;
    map.set(number, [...(map.get(number) ?? []), episode]);
  }
  return [...map.entries()].map(([number, list]) => ({ number, episodes: list }));
}

function SeasonSection({ number, episodes }: { number: number; episodes: CatalogEntry[] }) {
  const progress = progressOf(episodes);
  const headingId = `season-${number}`;
  return (
    <section aria-labelledby={headingId} className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id={headingId} className="font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em]">
          Season {number}
        </h2>
        <ProgressBar
          className="w-full max-w-[260px]"
          ariaLabel={`Season ${number} watched progress`}
          value={progress.percent}
          label={`${progress.watched} / ${progress.total}`}
        />
      </div>
      <Panel className="overflow-hidden">
        <ol>
          {episodes.map((episode) => (
            <EpisodeRow key={episode.id} episode={episode} />
          ))}
        </ol>
      </Panel>
    </section>
  );
}

function EpisodeRow({ episode }: { episode: CatalogEntry }) {
  const code = formatEpisodeCode(episode.seasonNumber, episode.episodeNumber);
  const name = episode.name ?? `Episode ${episode.episodeNumber}`;
  return (
    <li className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b-[1.5px] border-line-soft px-3.5 py-3 last:border-b-0">
      {code ? <EpisodeCode>{code}</EpisodeCode> : null}
      <Link
        href={`/recaps/${episode.id}`}
        className={`min-w-0 flex-1 font-semibold no-underline hover:underline hover:underline-offset-4 ${
          episode.watched ? "" : "text-ink-2"
        }`}
      >
        {name}
      </Link>
      <Year>{formatYear(episode.inUniverseYear)}</Year>
      <WatchedControl entryId={episode.id} watched={episode.watched} />
    </li>
  );
}
