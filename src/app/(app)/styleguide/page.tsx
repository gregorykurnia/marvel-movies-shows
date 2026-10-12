import { Clapperboard, Compass, Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { DangerZone } from "@/components/layout/danger-zone";
import { EmptyState } from "@/components/layout/empty-state";
import { MessagePanel } from "@/components/layout/message-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Chip, EpisodeCode, Year } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress";
import { RadioPills } from "@/components/ui/radio-pills";
import { SearchBox } from "@/components/ui/search-box";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { ToastView } from "@/components/ui/toast";

import { demoConfirmAction } from "./actions";
import {
  FilterChipDemo,
  InteractiveComboboxDemo,
  OpenComboboxDemo,
  ToastDemo,
} from "./demos";

export const metadata: Metadata = { title: "Styleguide" };

// Every component and state, for comparing against design-preview.html. Development only.
// In production this route is a 404, so the rendering is never published.
export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <>
      <PageHeader
        accent="red"
        eyebrow="Dev only · design system"
        title="Styleguide"
        subtitle="Every component and state in one place. Compare with design-preview.html."
      />

      <Section number="01" title="Colour">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
          {heroes.map((hero) => (
            <Panel key={hero.token} className="overflow-hidden">
              <div className={`flex h-21 items-end border-b-2 border-line p-2.5 font-display text-[13px] font-extrabold ${hero.fill}`}>
                Aa
              </div>
              <div className="flex h-[22px]">
                <span className={`flex-1 ${hero.soft}`} />
                <span className={`flex-1 ${hero.ink}`} />
              </div>
              <div className="px-3 pt-2.5 pb-3">
                <b className="block font-display text-base">{hero.name}</b>
                <code className="font-mono text-xs text-ink-3">{hero.token}</code>
                <p className="mt-1 text-xs leading-snug text-ink-2">{hero.use}</p>
              </div>
            </Panel>
          ))}
        </div>
        <SubLabel>Neutrals</SubLabel>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
          {neutrals.map((neutral) => (
            <Panel key={neutral.name} className="overflow-hidden">
              <div className={`flex h-21 items-end border-b-2 border-line p-2.5 font-display text-[13px] font-extrabold ${neutral.fill}`}>
                Aa
              </div>
              <div className="px-3 pt-2.5 pb-3">
                <b className="block font-display text-base">{neutral.name}</b>
                <code className="font-mono text-xs text-ink-3">{neutral.token}</code>
              </div>
            </Panel>
          ))}
        </div>
      </Section>

      <Section number="02" title="Typography">
        <Panel className="divide-y-[1.5px] divide-line-soft px-5">
          <TypeRow spec="Display · Bricolage 800 · 56–88 / 0.95">
            <p className="font-display text-[clamp(40px,6vw,64px)] leading-[0.95] font-extrabold tracking-[-0.035em]">
              Avengers Assemble
            </p>
          </TypeRow>
          <TypeRow spec="H1 · Bricolage 800 · 40 / 1.05">
            <p className="font-display text-[40px] leading-[1.05] font-extrabold tracking-[-0.02em]">The Recaps</p>
          </TypeRow>
          <TypeRow spec="H2 · Bricolage 700 · 28 / 1.15">
            <p className="font-display text-[28px] leading-[1.15] font-bold tracking-[-0.02em]">Season 1</p>
          </TypeRow>
          <TypeRow spec="H3 · Bricolage 700 · 20 / 1.25">
            <p className="font-display text-xl leading-[1.25] font-bold">Glorious Purpose</p>
          </TypeRow>
          <TypeRow spec="Body · Jakarta 400 · 16 / 1.6">
            <p className="leading-[1.6]">
              Loki is arrested by the Time Variance Authority and given a choice: help hunt a dangerous variant, or be erased from existence.
            </p>
          </TypeRow>
          <TypeRow spec="Reading · Jakarta 400 · 17 / 1.75 · max 68ch">
            <p className="max-w-[68ch] text-[17px] leading-[1.75]">
              Recap text is pasted in and shown exactly as written, at a size that reads comfortably for longer passages.
            </p>
          </TypeRow>
          <TypeRow spec="Small · Jakarta 500 · 14 / 1.5">
            <p className="text-sm leading-normal font-medium text-ink-2">Released 9 June 2021 · 6 episodes</p>
          </TypeRow>
          <TypeRow spec="Eyebrow · Mono 700 · 12 / caps / +10%">
            <Eyebrow accent="blue" className="mb-0">Show · Season 1</Eyebrow>
          </TypeRow>
          <TypeRow spec="Data · Mono 700 · 13–15, tabular">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[15px] font-bold tabular-nums text-ink-2">−5000</span>
              <span className="font-mono text-[15px] font-bold tabular-nums text-ink-2">1943–1945</span>
              <EpisodeCode>S01·E01</EpisodeCode>
              <span className="font-mono text-[15px] font-bold tabular-nums text-ink-2">4 / 6</span>
            </div>
          </TypeRow>
        </Panel>
      </Section>

      <Section number="03" title="Buttons">
        <Panel className="grid gap-5 p-5">
          <Row>
            <Button variant="primary">＋ Add title</Button>
            <Button>Save &amp; add another</Button>
            <Button variant="ghost">Cancel</Button>
          </Row>
          <Row>
            <Button variant="blue" size="sm">Reorder</Button>
            <Button variant="yellow" size="sm">⬇ Download backup</Button>
            <Button variant="danger" size="sm">Restore…</Button>
            <Button size="sm" disabled>Disabled</Button>
            <Button variant="secondary" size="icon" aria-label="More options">⋯</Button>
          </Row>
          <Row>
            <Button variant="primary" size="sm">Small primary</Button>
            <Button variant="ghost" size="sm">Clear all</Button>
            <Button variant="primary" disabled>Disabled primary</Button>
          </Row>
        </Panel>
      </Section>

      <Section number="04" title="Chips · one meaning each">
        <Panel className="grid gap-3.5 p-5">
          <Row>
            <Chip tone="movie" dot>Movie</Chip>
            <Chip tone="show" dot>Show</Chip>
          </Row>
          <Row>
            <Chip tone="watched">✓ Watched</Chip>
            <Chip tone="unwatched">Not watched</Chip>
          </Row>
          <Row>
            <Chip tone="alive" dot>Alive</Chip>
            <Chip tone="deceased" dot>Deceased</Chip>
            <Chip tone="unknown" dot>Unknown</Chip>
          </Row>
          <Row>
            <Chip tone="major">★ Major</Chip>
            <Chip tone="minor">Minor</Chip>
          </Row>
          <Row>
            <Chip tone="universe">Earth-199999</Chip>
            <Chip tone="universe">Earth-838</Chip>
          </Row>
          <Row>
            <Chip tone="tag">rewatch</Chip>
            <Chip tone="tag">favourite</Chip>
            <Chip tone="tag">key-event</Chip>
          </Row>
          <Row>
            <EpisodeCode>S02·E04</EpisodeCode>
            <Year>2012</Year>
            <Year>−5000</Year>
          </Row>
        </Panel>
      </Section>

      <Section number="05" title="Inputs and selects">
        <div className="grid gap-5 md:grid-cols-2">
          <Panel className="grid content-start gap-4 p-5">
            <Input label="Name" defaultValue="Sylvie" hint="Each variant is its own character." />
            <Input label="In-universe year" defaultValue="20x8" error="Year must be a whole number (use − for BCE)" />
            <Select label="First appearance" defaultValue="loki-2">
              <option value="loki-2">Loki · S01·E02 — The Variant</option>
              <option value="loki-3">Loki · S01·E03 — Lamentis</option>
            </Select>
            <Textarea label="Recap (pasted text)" mono defaultValue={"# Glorious Purpose\n\nLoki lands in the Gobi Desert."} hint="Plain text or Markdown." />
          </Panel>
          <Panel className="grid content-start gap-4 p-5">
            <div>
              <p className="mb-2 text-sm font-bold">Universe, open list</p>
              <OpenComboboxDemo />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Universe, interactive</p>
              <InteractiveComboboxDemo />
            </div>
          </Panel>
        </div>
      </Section>

      <Section number="06" title="Choices and filters">
        <Panel className="grid gap-5 p-5">
          <Row>
            <Segmented label="Watched filter" defaultValue="all" options={[
              { value: "all", label: "All" },
              { value: "watched", label: "Watched" },
              { value: "unwatched", label: "Not watched" },
            ]} />
            <Segmented label="Type filter" defaultValue="movies" options={[
              { value: "all", label: "All" },
              { value: "movies", label: "Movies" },
              { value: "shows", label: "Shows" },
            ]} />
          </Row>
          <Row>
            <RadioPills label="Importance" defaultValue="major" tone="violet" options={[
              { value: "major", label: "★ Major" },
              { value: "minor", label: "Minor" },
            ]} />
          </Row>
          <Row>
            <RadioPills label="Status" defaultValue="alive" options={[
              { value: "alive", label: "● Alive", tone: "green" },
              { value: "deceased", label: "Deceased" },
              { value: "unknown", label: "Unknown" },
            ]} />
          </Row>
          <Row>
            <FilterChipDemo />
          </Row>
        </Panel>
      </Section>

      <Section number="07" title="Search, progress and toasts">
        <div className="grid gap-5 md:grid-cols-2">
          <Panel className="grid content-start gap-5 p-5">
            <SearchBox />
            <ProgressBar value={67} label="4 / 6" ariaLabel="Loki season 1 watched" />
            <ProgressBar value={23} label="23%" ariaLabel="Overall watched" />
          </Panel>
          <Panel className="grid content-start gap-4 p-5">
            <ToastView>
              <span aria-hidden>✓</span>
              <span>
                Moved <b className="text-yellow">Loki · S01·E01</b> after Avengers: Endgame
              </span>
            </ToastView>
            <div>
              <ToastDemo />
            </div>
          </Panel>
        </div>
      </Section>

      <Section number="08" title="Panels">
        <div className="grid gap-5 md:grid-cols-2">
          <Panel interactive className="p-5">
            <h3 className="mb-1.5 font-display text-xl font-bold">Panel (hover me)</h3>
            <p className="text-sm text-ink-2">2px ink outline, 14px radius, 4px offset shadow. Lifts on hover when clickable.</p>
          </Panel>
          <Panel className="halftone p-5">
            <h3 className="mb-1.5 font-display text-xl font-bold">Halftone panel</h3>
            <p className="text-sm text-ink-2">Dots are decoration only: page headers, empty states, hero. Never behind body text that needs reading.</p>
          </Panel>
        </div>
      </Section>

      <Section number="09" title="Page headers">
        <div className="grid gap-5">
          {accents.map((accent) => (
            <PageHeader
              key={accent}
              accent={accent}
              eyebrow={`${accent} · section`}
              title={`${accent[0].toUpperCase()}${accent.slice(1)} page`}
              actions={<Button variant="secondary" size="sm">Secondary action</Button>}
            />
          ))}
        </div>
      </Section>

      <Section number="10" title="Table">
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th sorted sortDirection="asc">Name</Th>
                <Th>Importance</Th>
                <Th>Universe</Th>
                <Th>Predominant</Th>
                <Th>First appearance</Th>
                <Th>Last appearance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><span className="font-bold">Loki</span><span className="block text-xs text-ink-3">Variant L1130</span></Td>
                <Td><Chip tone="major">★ Major</Chip></Td>
                <Td><Chip tone="universe">Earth-199999</Chip></Td>
                <Td>Loki</Td>
                <Td><span className="cursor-pointer font-semibold underline decoration-line-soft decoration-2 underline-offset-[3px]">Thor</span></Td>
                <Td><span className="cursor-pointer font-semibold underline decoration-line-soft decoration-2 underline-offset-[3px]">Loki · S02·E06</span></Td>
                <Td><Chip tone="alive" dot>Alive</Chip></Td>
              </Tr>
              <Tr>
                <Td><span className="font-bold">Classic Loki</span><span className="block text-xs text-ink-3">Variant</span></Td>
                <Td><Chip tone="minor">Minor</Chip></Td>
                <Td><Chip tone="universe">Earth-199999</Chip></Td>
                <Td>Loki</Td>
                <Td><span className="font-semibold underline decoration-line-soft decoration-2 underline-offset-[3px]">Loki · S01·E04</span></Td>
                <Td><span className="font-semibold underline decoration-line-soft decoration-2 underline-offset-[3px]">Loki · S01·E05</span></Td>
                <Td><Chip tone="unknown" dot>Unknown</Chip></Td>
              </Tr>
            </tbody>
          </Table>
        </TableWrap>
      </Section>

      <Section number="11" title="Empty, message and loading states">
        <div className="grid gap-5 md:grid-cols-2">
          <EmptyState
            icon={<Star aria-hidden strokeWidth={2.25} className="size-9" />}
            title="No timeline events yet"
            action={<Button variant="primary">＋ Add event</Button>}
          >
            Add your first event, like “2011: Captain America wakes up from the ice”.
          </EmptyState>
          <Panel className="grid content-start gap-3.5 p-5">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-14 w-full" />
          </Panel>
        </div>
        <div className="mt-6">
          <MessagePanel
            icon={<Compass aria-hidden strokeWidth={2.25} className="size-9" />}
            title="Lost in the multiverse"
            actions={<Button variant="primary">← Back to Recaps</Button>}
          >
            This page doesn’t exist, or it hasn’t been built yet.
          </MessagePanel>
        </div>
      </Section>

      <Section number="12" title="Dialog and danger zone">
        <div className="grid gap-5 md:grid-cols-2">
          <Panel className="grid content-start gap-4 p-5">
            <p className="text-sm text-ink-2">Dialog, closed. Esc and the ✕ close it.</p>
            <Dialog
              trigger={<Button variant="secondary">Open dialog</Button>}
              eyebrow="Characters · Universe"
              accent="violet"
              title="Add a universe"
              description="Universes feed the character dropdown."
            >
              <div className="grid gap-4">
                <Input label="Name" defaultValue="Earth-838" hint="For example Earth-616 or Earth-199999." />
                <div className="flex flex-wrap justify-end gap-2.5">
                  <Button variant="ghost">Cancel</Button>
                  <Button variant="primary">Save universe</Button>
                </div>
              </div>
            </Dialog>
          </Panel>
          <DangerZone
            title="Restore from file"
            confirmWord="RESTORE"
            actionLabel="Restore…"
            action={demoConfirmAction}
          >
            Replaces <b>all</b> current data. A safety backup is saved first. Demo only: nothing is changed here.
          </DangerZone>
        </div>
      </Section>

      <Section number="13" title="Recap row and timeline pin (preview)">
        <div className="grid gap-3">
          <Panel interactive className="grid grid-cols-[auto_6px_1fr_auto] items-center gap-3.5 py-3.5 pr-4 pl-2.5">
            <span aria-hidden className="cursor-grab text-lg text-ink-3">⋮⋮</span>
            <span aria-hidden className="self-stretch rounded-sm bg-red" />
            <div>
              <h3 className="font-display text-lg font-bold">Captain Marvel</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Chip tone="movie" dot>Movie</Chip>
                <Year>1995</Year>
              </div>
            </div>
            <Chip tone="watched">✓ Watched</Chip>
          </Panel>
          <Panel className="grid grid-cols-[auto_6px_1fr_auto] items-center gap-3.5 border-dashed py-3.5 pr-4 pl-2.5 opacity-100 shadow-none">
            <span aria-hidden className="cursor-grab text-lg text-ink-3">⋮⋮</span>
            <span aria-hidden className="self-stretch rounded-sm bg-show" />
            <div>
              <h3 className="font-display text-lg font-bold text-ink-2">Loki — The Variant</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Chip tone="show" dot>Show</Chip>
                <EpisodeCode>S01·E02</EpisodeCode>
              </div>
            </div>
            <Chip tone="unwatched">Not watched</Chip>
          </Panel>
          <Panel className="p-4">
            <Eyebrow accent="orange" className="mb-2">Timeline pin</Eyebrow>
            <p className="text-sm text-ink-2">
              The pin and its popover (with the recap link) are built in Phase 3. Their colours and shadows come from the movie and show tokens.
            </p>
          </Panel>
          <Panel className="flex items-center gap-2.5 p-4 text-sm text-ink-2">
            <Clapperboard aria-hidden className="size-[18px] shrink-0 text-movie-ink" />
            Movie red and show blue are used the same way everywhere (kind bars, chips, pins).
          </Panel>
        </div>
      </Section>
    </>
  );
}

const accents = ["red", "blue", "violet", "green", "orange"] as const;

const heroes = [
  { name: "Hero Red", token: "--red", fill: "bg-red text-on-red", soft: "bg-red-soft", ink: "bg-red-ink", use: "Primary actions, movies, brand." },
  { name: "Shield Blue", token: "--blue", fill: "bg-blue text-on-blue", soft: "bg-blue-soft", ink: "bg-blue-ink", use: "Shows, focus rings, active inputs." },
  { name: "Infinity Gold", token: "--yellow", fill: "bg-yellow text-on-yellow", soft: "bg-yellow-soft", ink: "bg-yellow-ink", use: "Highlights, logo, empty states, unknown." },
  { name: "Gamma Green", token: "--green", fill: "bg-green text-on-green", soft: "bg-green-soft", ink: "bg-green-ink", use: "Watched, progress, alive, success." },
  { name: "Cosmic Violet", token: "--violet", fill: "bg-violet text-on-violet", soft: "bg-violet-soft", ink: "bg-violet-ink", use: "Characters, importance, active filters." },
  { name: "Quantum Cyan", token: "--cyan", fill: "bg-cyan text-on-cyan", soft: "bg-cyan-soft", ink: "bg-cyan-ink", use: "Universe designations only." },
  { name: "Repulsor Orange", token: "--orange", fill: "bg-orange text-on-orange", soft: "bg-orange-soft", ink: "bg-orange-ink", use: "Timeline accent, warnings." },
];

const neutrals = [
  { name: "Paper", token: "--paper", fill: "bg-paper text-ink" },
  { name: "Surface", token: "--surface", fill: "bg-surface text-ink" },
  { name: "Surface 2", token: "--surface-2", fill: "bg-surface-2 text-ink" },
  { name: "Ink", token: "--ink", fill: "bg-ink text-paper" },
  { name: "Ink 2", token: "--ink-2", fill: "bg-ink-2 text-paper" },
  { name: "Ink 3", token: "--ink-3", fill: "bg-ink-3 text-paper" },
];

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="mb-12 scroll-mt-6">
      <div className="mb-5 flex flex-wrap items-baseline gap-3.5">
        <span className="font-mono text-sm font-bold text-ink-3">{number}</span>
        <h2 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.15] font-bold tracking-[-0.02em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-8 mb-3 font-mono text-xs font-bold tracking-[.08em] text-ink-3 uppercase">{children}</p>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
}

function TypeRow({ spec, children }: { spec: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 border-b-[1.5px] border-line-soft py-4.5 last:border-b-0 md:grid-cols-[170px_1fr] md:items-baseline md:gap-5">
      <p className="font-mono text-xs leading-normal font-medium text-ink-3">{spec}</p>
      <div>{children}</div>
    </div>
  );
}
