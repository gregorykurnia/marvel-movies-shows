"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";

import { saveEpisode, saveMovie } from "@/actions/entries";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { FormAlert, FormFooter, FormGrid, FormPanel, wide } from "@/components/ui/form-layout";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { UniverseField, withUniverse, type UniverseOption } from "@/components/universes/universe-field";
import type { EntryDetail } from "@/lib/data/catalog";
import { TIME_JUMP_KINDS, TIME_JUMP_LABEL, type TimeJump, type TimeJumpKind } from "@/lib/time-jump";
import { cn } from "@/lib/utils";
import { KIND_ACCENT, KIND_LABEL, hasOneRecap } from "@/lib/title-kind";
import Link from "next/link";

import { AppearancesPicker } from "@/components/characters/appearances-picker";
import { TagInput } from "@/components/tags/tag-input";

import { RecapMarkdown } from "./recap-markdown";

// The recap editor (IMPLEMENTATION_PLAN §5.5). A monospace paste area with a live preview, next to the
// facts about the entry. Nothing typed is lost when a save fails: the fields are not reset, and each
// message sits next to its field.
export function RecapEditForm({
  entry,
  characterOptions,
  initialCharacterIds,
  tagOptions,
  universeOptions,
  timeJumps,
}: {
  entry: EntryDetail;
  characterOptions: { value: string; label: string }[];
  initialCharacterIds: string[];
  tagOptions: string[];
  universeOptions: UniverseOption[];
  timeJumps: TimeJump[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [recap, setRecap] = useState(entry.recap ?? "");
  const [characterIds, setCharacterIds] = useState(initialCharacterIds);
  const [tagNames, setTagNames] = useState(entry.tags);
  const [universeList, setUniverseList] = useState(universeOptions);
  const [universeId, setUniverseId] = useState<string | null>(entry.universeId);
  const [jumpRows, setJumpRows] = useState<JumpRow[]>(() =>
    timeJumps.map((jump) => ({ key: jump.id, year: String(jump.year), kind: jump.kind, note: jump.note ?? "" })),
  );
  const nextJumpKey = useRef(0);
  const oneRecap = hasOneRecap(entry.titleKind);

  function addJumpRow() {
    nextJumpKey.current += 1;
    const key = `new-${nextJumpKey.current}`;
    setJumpRows((rows) => [...rows, { key, year: "", kind: "flashback", note: "" }]);
  }

  function changeJumpRow(key: string, change: Partial<Omit<JumpRow, "key">>) {
    setJumpRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }

  function removeJumpRow(key: string) {
    setJumpRows((rows) => rows.filter((row) => row.key !== key));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setErrors({});
      setMessage(null);
      try {
        const result = oneRecap ? await saveMovie(entry.id, formData) : await saveEpisode(entry.id, formData);
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          setMessage(result.message);
          return;
        }
        toast("Recap saved.");
        router.push(`/recaps/${entry.id}`);
      } catch {
        setMessage("Couldn't save. Your text is still here. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormPanel>
        {message ? <FormAlert>{message}</FormAlert> : null}
        <FormGrid>
          {oneRecap ? (
            <>
              <Input
                name="name"
                label={`${KIND_LABEL[entry.titleKind]} title`}
                defaultValue={entry.titleName}
                error={errors.name}
                className={wide}
              />
              <Input
                name="releaseDate"
                type="date"
                label="Release date"
                defaultValue={entry.titleReleaseDate ?? ""}
                error={errors.releaseDate}
              />
              <YearAndUniverse
                defaultYear={entry.inUniverseYear}
                universes={universeList}
                universeId={universeId}
                onUniverseId={setUniverseId}
                onCreated={(universe) => setUniverseList((list) => withUniverse(list, universe))}
                errors={errors}
              />
            </>
          ) : (
            <>
              <Input
                name="name"
                label="Episode name"
                defaultValue={entry.name ?? ""}
                hint={`Leave blank to show “Episode ${entry.episodeNumber}”.`}
                error={errors.name}
                className={wide}
              />
              <Input
                name="season"
                label="Season"
                inputMode="numeric"
                defaultValue={entry.seasonNumber ?? ""}
                error={errors.season}
              />
              <Input
                name="episode"
                label="Episode number"
                inputMode="numeric"
                defaultValue={entry.episodeNumber ?? ""}
                error={errors.episode}
              />
              <Input
                name="releaseDate"
                type="date"
                label="Release date"
                defaultValue={entry.releaseDate ?? ""}
                error={errors.releaseDate}
              />
              <YearAndUniverse
                defaultYear={entry.inUniverseYear}
                universes={universeList}
                universeId={universeId}
                onUniverseId={setUniverseId}
                onCreated={(universe) => setUniverseList((list) => withUniverse(list, universe))}
                errors={errors}
              />
            </>
          )}
          <OtherYears
            rows={jumpRows}
            errors={errors}
            onAdd={addJumpRow}
            onChange={changeJumpRow}
            onRemove={removeJumpRow}
          />
        </FormGrid>

        <div className="mt-6 grid gap-4 min-[1000px]:grid-cols-2">
          <Textarea
            name="recap"
            mono
            rows={16}
            label="Recap"
            value={recap}
            onChange={(event) => setRecap(event.target.value)}
            hint="Paste plain text or Markdown. Line breaks are kept as you pasted them."
            error={errors.recap}
          />
          <Panel aria-label="Preview" className="min-w-0 p-5">
            <Eyebrow accent={KIND_ACCENT[entry.titleKind]}>Preview</Eyebrow>
            {recap.trim() ? (
              <RecapMarkdown text={recap} />
            ) : (
              <p className="text-sm text-ink-3">Nothing to preview yet. Paste a recap on the left.</p>
            )}
          </Panel>
        </div>

        <div className="mt-6">
          <AppearancesPicker
            label="Characters in this recap"
            fieldName="characterId"
            options={characterOptions}
            selected={characterIds}
            onChange={setCharacterIds}
            hint="Every character who appears in this recap. Each variant is listed with its universe."
            emptyText="No characters linked yet."
          />
        </div>

        <div className="mt-6 grid gap-4">
          <Textarea
            name="notes"
            label="Notes"
            rows={4}
            defaultValue={entry.notes ?? ""}
            hint="Your own notes on this recap. Plain text or Markdown. Only you see them here, and search finds them."
            error={errors.notes}
          />
          <TagInput
            label="Add a tag"
            value={tagNames}
            onChange={setTagNames}
            options={tagOptions}
            hint="Tags filter the recap list. Pick an existing one, or type a new one."
          />
        </div>

        <FormFooter>
          <Link href={`/recaps/${entry.id}`} className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save recap"}
          </Button>
        </FormFooter>
      </FormPanel>
    </form>
  );
}

// The in-universe year and the universe, side by side on a row of their own (PRODUCT_PLAN §2.1).
function YearAndUniverse({
  defaultYear,
  universes,
  universeId,
  onUniverseId,
  onCreated,
  errors,
}: {
  defaultYear: number | null;
  universes: UniverseOption[];
  universeId: string | null;
  onUniverseId: (id: string | null) => void;
  onCreated: (universe: UniverseOption) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-[18px] min-[640px]:col-span-2 min-[640px]:grid-cols-2">
      <Input
        name="inUniverseYear"
        label="In-universe year"
        inputMode="numeric"
        defaultValue={defaultYear ?? ""}
        hint="Seeds where a new entry lands. Use − for years before 1 AD."
        error={errors.inUniverseYear}
      />
      <UniverseField
        universes={universes}
        value={universeId}
        onValueChange={onUniverseId}
        onCreated={onCreated}
        error={errors.universeId}
      />
    </div>
  );
}

// One Other years row, as the form holds it. `key` is only for React.
type JumpRow = { key: string; year: string; kind: TimeJumpKind; note: string };

// Other years (PRODUCT_PLAN §2.1, Phase 8): flashbacks, flash-forwards and time travel, under the in-universe year.
// Each row is a year, a kind and a note, labelled like every other field. A row with no year and no note is dropped
// on save. An error sits on its own row, under the field it belongs to.
function OtherYears({
  rows,
  errors,
  onAdd,
  onChange,
  onRemove,
}: {
  rows: JumpRow[];
  errors: Record<string, string>;
  onAdd: () => void;
  onChange: (key: string, change: Partial<Omit<JumpRow, "key">>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <fieldset className={cn("grid min-w-0 content-start gap-3", wide)}>
      <legend className="text-sm font-bold">Other years</legend>
      <p className="text-[13px] text-ink-3">
        Flashbacks, flash-forwards and time travel. Each one shows on the timeline in its year, marked with its kind, and
        the note (e.g. Young Peter at his mother&rsquo;s bedside) is shown there too. Needs the in-universe year above.
      </p>
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="grid gap-3 min-[640px]:grid-cols-[140px_180px_minmax(0,1fr)_auto] min-[640px]:items-start"
        >
          <Input
            name="timeJumpYear"
            label="Year"
            inputMode="numeric"
            value={row.year}
            onChange={(event) => onChange(row.key, { year: event.target.value })}
            error={errors[`timeJumps.${index}.year`]}
          />
          <Select
            name="timeJumpKind"
            label="Kind"
            value={row.kind}
            onChange={(event) => onChange(row.key, { kind: event.target.value as TimeJumpKind })}
            error={errors[`timeJumps.${index}.kind`]}
          >
            {TIME_JUMP_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {TIME_JUMP_LABEL[kind]}
              </option>
            ))}
          </Select>
          <Input
            name="timeJumpNote"
            label="Note"
            value={row.note}
            onChange={(event) => onChange(row.key, { note: event.target.value })}
            error={errors[`timeJumps.${index}.note`]}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Remove other year ${index + 1}`}
            onClick={() => onRemove(row.key)}
            className="justify-self-start min-[640px]:mt-6"
          >
            <X aria-hidden strokeWidth={2.25} className="size-4" />
            Remove
          </Button>
        </div>
      ))}
      <div>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          ＋ Add another year
        </Button>
      </div>
    </fieldset>
  );
}
