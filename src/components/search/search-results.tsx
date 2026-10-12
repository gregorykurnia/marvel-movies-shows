import Link from "next/link";
import { Fragment } from "react";

import { Chip, EpisodeCode, Year } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { HIGHLIGHT_START, HIGHLIGHT_STOP, type CharacterHit, type EventHit, type RecapHit, type SearchGroup, type SearchResults } from "@/lib/data/search";
import { formatEpisodeCode, formatYear } from "@/lib/format";
import { KIND_LABEL } from "@/lib/title-kind";

// The grouped results on /search (IMPLEMENTATION_PLAN §4). Each group shows its best matches, with a "Show all" link
// when there are more. A group on its own (from "Show all") lists every match. Snippets come from ts_headline, which
// wraps each match in control characters. They are split here into highlighted parts, so no HTML comes from the DB.
const GROUP_TITLES: Record<SearchGroup, string> = {
  recaps: "Recaps",
  events: "Timeline",
  characters: "Characters",
};

export function SearchResultGroups({ query, results, showAll }: { query: string; results: SearchResults; showAll: SearchGroup | null }) {
  // Groups with no matches are left out, so a search only shows the headings it has results for.
  const groups = (["recaps", "events", "characters"] as const).filter(
    (group) => results[group].total > 0 && (showAll === null || showAll === group),
  );

  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <section key={group} aria-labelledby={`group-${group}`} className="grid gap-3">
          <div className="flex items-baseline gap-3">
            <h2 id={`group-${group}`} className="font-display text-2xl font-extrabold tracking-[-0.02em]">
              {GROUP_TITLES[group]}
            </h2>
            <span className="font-mono text-[13px] font-bold text-ink-2 tabular-nums">{results[group].total}</span>
          </div>
          {group === "recaps" ? (
            <RecapHits hits={results.recaps.items} />
          ) : group === "events" ? (
            <EventHits hits={results.events.items} />
          ) : (
            <CharacterHits hits={results.characters.items} />
          )}
          {showAll === null && results[group].total > results[group].items.length ? (
            <Link href={showAllHref(query, group)} className="justify-self-start text-sm font-bold text-blue-ink">
              Show all {results[group].total}
            </Link>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export function showAllHref(query: string, group: SearchGroup) {
  return `/search?q=${encodeURIComponent(query)}&group=${group}`;
}

function RecapHits({ hits }: { hits: RecapHit[] }) {
  return (
    <ul className="grid gap-2.5">
      {hits.map((hit) => {
        const code = formatEpisodeCode(hit.seasonNumber, hit.episodeNumber);
        return (
          <li key={hit.id} className="list-none">
            <Link href={`/recaps/${hit.id}`} className="block no-underline">
              <Panel interactive className="grid gap-1.5 p-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Chip tone={hit.kind}>{KIND_LABEL[hit.kind]}</Chip>
                  <span className="font-bold text-ink">
                    {hit.kind === "show" && hit.episodeName ? `${hit.titleName} — ${hit.episodeName}` : hit.titleName}
                  </span>
                  {code ? <EpisodeCode>{code}</EpisodeCode> : null}
                  {hit.watched ? <Chip tone="watched">✓ Watched</Chip> : null}
                </div>
                <Snippet text={hit.snippet} />
              </Panel>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EventHits({ hits }: { hits: EventHit[] }) {
  return (
    <ul className="grid gap-2.5">
      {hits.map((hit) => (
        <li key={hit.id} className="list-none">
          <Link href={`/timeline/${hit.id}/edit`} className="block no-underline">
            <Panel interactive className="grid gap-1.5 p-3.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <Year>{formatYear(hit.year)}</Year>
                <span className="font-bold text-ink">{hit.text}</span>
              </div>
              <Snippet text={hit.snippet} />
            </Panel>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CharacterHits({ hits }: { hits: CharacterHit[] }) {
  return (
    <ul className="grid gap-2.5">
      {hits.map((hit) => (
        <li key={hit.id} className="list-none">
          <Link href={`/characters/${hit.id}`} className="block no-underline">
            <Panel interactive className="grid gap-1.5 p-3.5">
              <span className="font-bold text-ink">{hit.name}</span>
              <Snippet text={hit.snippet} />
            </Panel>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Shows a snippet with its matches highlighted. Odd-numbered parts are the matches.
function Snippet({ text }: { text: string | null }) {
  if (!text) return null;
  const parts = text.split(new RegExp(`[${HIGHLIGHT_START}${HIGHLIGHT_STOP}]`));
  return (
    <p className="m-0 line-clamp-2 text-sm leading-snug text-ink-2">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="rounded-sm bg-yellow px-0.5 text-on-yellow">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </p>
  );
}
