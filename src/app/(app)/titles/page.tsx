import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Chip, Year } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress";
import { loadTitleRows, type TitleRow } from "@/lib/data/catalog";
import { formatCount, formatYear } from "@/lib/format";
import { KIND_BAR, KIND_LABEL, hasOneRecap } from "@/lib/title-kind";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Titles" };

export default function TitlesPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <TitlesContent />
    </Suspense>
  );
}

async function TitlesContent() {
  await connection();
  const titles = await loadTitleRows();

  return (
    <>
      <PageHeader
        accent="red"
        eyebrow={`Titles · ${formatCount(titles.length, "title")}`}
        title="Titles"
        subtitle="Movies, shows and shorts. A show’s episodes go on its own page."
        actions={
          <>
            <Link href="/recaps" className={buttonVariants({ variant: "secondary" })}>
              Recaps
            </Link>
            <Link href="/titles/new" className={buttonVariants({ variant: "primary" })}>
              ＋ Add title
            </Link>
          </>
        }
      />

      {titles.length === 0 ? (
        <EmptyState
          icon="★"
          title="No titles yet"
          action={
            <Link href="/titles/new" className={buttonVariants({ variant: "primary" })}>
              ＋ Add title
            </Link>
          }
        >
          Add a movie, a show or a short to start your directory.
        </EmptyState>
      ) : (
        <ul aria-label="Titles" className="grid gap-3">
          {titles.map((title) => (
            <TitleListItem key={title.id} title={title} />
          ))}
        </ul>
      )}
    </>
  );
}

// A movie or a short opens its recap. A show opens its episodes. Shows show their watched progress here (§2.4).
function TitleListItem({ title }: { title: TitleRow }) {
  const oneRecap = hasOneRecap(title.kind);
  const href = oneRecap && title.movieEntryId ? `/recaps/${title.movieEntryId}` : `/titles/${title.id}`;
  const year = title.releaseDate ? Number(title.releaseDate.slice(0, 4)) : null;
  const percent = title.total === 0 ? 0 : Math.round((title.watched / title.total) * 100);

  return (
    <li className="list-none">
      <Link href={href} className="block no-underline">
        <Panel interactive className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3.5 pr-4 pl-2.5">
          <span aria-hidden className={cn("min-h-[52px] w-1.5 shrink-0 self-stretch rounded-sm", KIND_BAR[title.kind])} />
          <div className="min-w-[200px] flex-1">
            <h3 className="font-display text-xl leading-tight font-bold tracking-[-0.01em]">{title.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <Chip tone={title.kind} dot>
                {KIND_LABEL[title.kind]}
              </Chip>
              {year !== null ? <Year>{formatYear(year)}</Year> : null}
              {/* One chip per universe set on the title's movie, short or episodes (Phase 11). */}
              {title.universes.map((universe) => (
                <Chip key={universe} tone="universe" className="max-w-full" title={universe}>
                  <span className="min-w-0 truncate">{universe}</span>
                </Chip>
              ))}
              {!oneRecap ? (
                <span className="font-mono text-[13px] font-bold tabular-nums text-ink-2">
                  {formatCount(title.total, "episode")}
                </span>
              ) : null}
            </div>
          </div>
          {oneRecap ? (
            // Static here: the list is a link, and the toggle lives on the recap page.
            <Chip tone={title.watched > 0 ? "watched" : "unwatched"}>
              {title.watched > 0 ? "✓ Watched" : "Not watched"}
            </Chip>
          ) : (
            <div className="w-full min-w-[200px] sm:w-[260px]">
              <ProgressBar
                ariaLabel={`${title.name} watched progress`}
                value={percent}
                label={`${title.watched} / ${title.total}`}
              />
            </div>
          )}
        </Panel>
      </Link>
    </li>
  );
}
