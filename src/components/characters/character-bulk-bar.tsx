"use client";

import { useState, useTransition, type ReactNode } from "react";

import {
  bulkDeleteCharacters,
  bulkEditCharacterTags,
  bulkUpdateCharacters,
} from "@/actions/characters";
import { FirstAppearanceDialog, type CreatedEntry } from "@/components/characters/first-appearance-dialog";
import { TagInput } from "@/components/tags/tag-input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-layout";
import { RadioPills } from "@/components/ui/radio-pills";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/action-result";
import type { BulkEditOptions, CharacterTableRow } from "@/lib/data/characters";
import type { BulkResult } from "@/lib/data/bulk-characters";
import type { BulkCharacterPatch } from "@/lib/schemas";
import { formatCount } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Mode = "importance" | "status" | "universe" | "predominant" | "first" | "last" | "tags";

const MODES: { id: Mode; label: string }[] = [
  { id: "importance", label: "Importance" },
  { id: "status", label: "Status" },
  { id: "universe", label: "Universe" },
  { id: "predominant", label: "Predominant title" },
  { id: "first", label: "First appearance" },
  { id: "last", label: "Last appearance" },
  { id: "tags", label: "Tags" },
];

// The "None" choice in a picker. It clears the field on every selected character.
const NONE = "none";
const NONE_OPTION = { value: NONE, label: "None" };

type Run = (action: () => Promise<ActionResult<BulkResult>>, verb: string) => void;

// The bulk action bar of the character directory (Phase 12, IMPLEMENTATION_PLAN §5.3). It shows while characters are
// ticked. Pick what to change, choose the value, then confirm once. Every action runs in one transaction on the server
// and the selection is kept, so another change can follow. It sticks to the top of the screen while the table scrolls,
// because the pickers open downwards.
export function CharacterBulkBar({
  selected,
  hiddenCount,
  options,
  entries,
  onClear,
  onDeleted,
}: {
  selected: CharacterTableRow[];
  hiddenCount: number;
  options: BulkEditOptions;
  entries: { id: string; label: string }[];
  onClear: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const count = selected.length;
  const noun = formatCount(count, "character");

  function choose(next: Mode | null) {
    setMode((current) => (current === next ? null : next));
    setMessage(null);
  }

  // Runs one bulk action, then reports it. Nothing the user picked is lost on an error.
  const run: Run = (action, verb) => {
    startTransition(async () => {
      setMessage(null);
      try {
        const result = await action();
        if (!result.ok) {
          setMessage(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.message);
          return;
        }
        const { updated, missing } = result.data;
        toast(
          `${verb} ${formatCount(updated, "character")}.${missing > 0 ? ` ${formatCount(missing, "other")} no longer ${missing === 1 ? "exists" : "exist"}.` : ""}`,
        );
        setMode(null);
      } catch {
        setMessage("Couldn't save. Nothing was lost. Check your connection and try again.");
      }
    });
  };

  const ids = selected.map((row) => row.id);
  const update = (patch: BulkCharacterPatch) => run(() => bulkUpdateCharacters(ids, patch), "Updated");
  const shared = { noun, pending, onCancel: () => setMode(null) };

  return (
    <section
      aria-label="Bulk edit"
      className="sticky top-3 z-30 grid gap-3 rounded-panel border-2 border-line bg-surface p-4 shadow-pop"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="font-display text-lg font-bold" aria-live="polite">
          {count} selected
          {hiddenCount > 0 ? <span className="ml-2 font-body text-sm font-medium text-ink-3">({hiddenCount} hidden by filters)</span> : null}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="h-[34px] cursor-pointer rounded-pill bg-transparent px-3 text-[13px] font-bold text-ink hover:bg-surface-2"
        >
          Clear selection
        </button>
      </div>

      <div role="group" aria-label="Change the selected characters" className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <Button
            key={item.id}
            size="sm"
            aria-pressed={mode === item.id}
            onClick={() => choose(item.id)}
            className={cn(mode === item.id && "border-violet bg-violet-soft text-violet-ink")}
          >
            {item.label}
          </Button>
        ))}
        <Button size="sm" variant="danger" onClick={() => setDeleting(true)}>
          Delete…
        </Button>
      </div>

      {message ? <FormAlert>{message}</FormAlert> : null}

      {mode ? (
        <div className="grid gap-3 border-t-[1.5px] border-dashed border-line-soft pt-3">
          {mode === "importance" ? (
            <ChoiceEditor
              key={mode}
              label="Importance"
              options={[
                { value: "major", label: "★ Major", tone: "violet" },
                { value: "minor", label: "Minor", tone: "neutral" },
              ]}
              summary={(value) => `Set importance to ${value === "major" ? "Major" : "Minor"} for ${noun}?`}
              onConfirm={(value) => update({ importance: value as "major" | "minor" })}
              {...shared}
            />
          ) : null}
          {mode === "status" ? (
            <ChoiceEditor
              key={mode}
              label="Status"
              options={[
                { value: "alive", label: "● Alive", tone: "green" },
                { value: "deceased", label: "Deceased", tone: "neutral" },
                { value: "unknown", label: "Unknown", tone: "yellow" },
              ]}
              summary={(value) => `Set status to ${statusLabel(value as "alive" | "deceased" | "unknown")} for ${noun}?`}
              onConfirm={(value) => update({ status: value as "alive" | "deceased" | "unknown" })}
              {...shared}
            />
          ) : null}
          {mode === "universe" ? (
            <UniverseEditor key={mode} universes={options.universes} update={update} {...shared} />
          ) : null}
          {mode === "predominant" ? (
            <PickEditor
              key={mode}
              label="Predominant title"
              options={options.titles.map((title) => ({ value: title.id, label: title.name }))}
              summary={(choice, label) =>
                choice === NONE ? `Clear the predominant title for ${noun}?` : `Set the predominant title to ${label} for ${noun}?`
              }
              onConfirm={(choice) => update({ predominantTitleId: choice === NONE ? null : choice })}
              {...shared}
            />
          ) : null}
          {mode === "first" || mode === "last" ? (
            <AppearanceEditor
              key={mode}
              which={mode === "first" ? "First" : "Last"}
              entries={entries}
              shows={options.titles.filter((title) => title.kind === "show")}
              update={update}
              {...shared}
            />
          ) : null}
          {mode === "tags" ? (
            <TagsEditor
              key={mode}
              allTags={options.tags}
              selectedTags={[...new Set(selected.flatMap((row) => row.tags))].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))}
              onConfirm={(add, remove) => run(() => bulkEditCharacterTags(ids, add, remove), "Updated")}
              {...shared}
            />
          ) : null}
        </div>
      ) : null}

      {deleting ? (
        <DeleteDialog
          noun={noun}
          onOpenChange={setDeleting}
          onDelete={(confirm) =>
            bulkDeleteCharacters(ids, confirm).then((result) => {
              if (result.ok) {
                toast(
                  `Deleted ${formatCount(result.data.updated, "character")}.${result.data.missing > 0 ? ` ${formatCount(result.data.missing, "other")} no longer ${result.data.missing === 1 ? "exists" : "exist"}.` : ""}`,
                );
                setDeleting(false);
                setMode(null);
                onDeleted();
              }
              return result;
            })
          }
        />
      ) : null}
    </section>
  );
}

// The confirm step every editor ends with: what will happen, then one click to do it.
function ConfirmRow({
  summary,
  pending,
  onConfirm,
  onCancel,
}: {
  summary: ReactNode;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="min-w-0 text-sm font-bold" aria-live="polite">
        {summary}
      </p>
      <div className="flex gap-2">
        <Button variant="blue" disabled={pending} onClick={onConfirm}>
          {pending ? "Saving…" : "Confirm"}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

type EditorBase = { noun: string; pending: boolean; onCancel: () => void };

// A short fixed choice (importance, status) as pills.
function ChoiceEditor({
  label,
  options,
  summary,
  onConfirm,
  pending,
  onCancel,
}: EditorBase & {
  label: string;
  options: { value: string; label: string; tone: "violet" | "neutral" | "green" | "yellow" }[];
  summary: (value: string) => string;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <>
      <div className="grid gap-1.5">
        <span className="text-sm font-bold">{label}</span>
        <RadioPills name={`bulk-${label}`} label={label} value={value} onValueChange={setValue} options={options} />
      </div>
      {value ? <ConfirmRow summary={summary(value)} pending={pending} onConfirm={() => onConfirm(value)} onCancel={onCancel} /> : null}
    </>
  );
}

// A pick from a list, with a "None" choice that clears the field.
function PickEditor({
  label,
  options,
  summary,
  onConfirm,
  pending,
  onCancel,
}: EditorBase & {
  label: string;
  options: { value: string; label: string }[];
  summary: (choice: string, label: string) => string;
  onConfirm: (choice: string) => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const all = [NONE_OPTION, ...options];
  const chosen = all.find((option) => option.value === choice);
  return (
    <>
      <Combobox
        label={label}
        placeholder="Type to search…"
        options={all}
        value={choice}
        onValueChange={setChoice}
        className="max-w-[420px]"
      />
      {choice && chosen ? (
        <ConfirmRow summary={summary(choice, chosen.label)} pending={pending} onConfirm={() => onConfirm(choice)} onCancel={onCancel} />
      ) : null}
    </>
  );
}

// A universe is picked, cleared, or typed. A typed name goes in through the "＋ Add universe" row, which also closes
// the list so it can't sit over the confirm button. The server finds it by name (ignoring case) or adds it on save, as
// on the character form.
function UniverseEditor({
  universes,
  update,
  noun,
  pending,
  onCancel,
}: EditorBase & { universes: { id: string; name: string }[]; update: (patch: BulkCharacterPatch) => void }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [created, setCreated] = useState("");
  const chosen = universes.find((universe) => universe.id === choice);

  const summary =
    choice === NONE
      ? `Clear the universe for ${noun}?`
      : chosen
        ? `Set the universe to ${chosen.name} for ${noun}?`
        : created
          ? `Set the universe to “${created}” for ${noun}? It's added if it's new.`
          : null;

  function confirm() {
    if (choice === NONE) update({ universe: { id: null, name: "" } });
    else if (chosen) update({ universe: { id: chosen.id, name: "" } });
    else update({ universe: { id: null, name: created } });
  }

  return (
    <>
      <Combobox
        label="Universe"
        placeholder="Type to search or add…"
        options={[NONE_OPTION, ...universes.map((universe) => ({ value: universe.id, label: universe.name, mono: true }))]}
        value={choice}
        onValueChange={(next) => {
          setChoice(next);
          setCreated("");
        }}
        onCreate={(text) => {
          setChoice(null);
          setCreated(text.trim());
        }}
        createNoun="universe"
        text={created}
        hint="Pick one, or type a new name to add it to the list when you confirm."
        className="max-w-[420px]"
      />
      {summary ? <ConfirmRow summary={summary} pending={pending} onConfirm={confirm} onCancel={onCancel} /> : null}
    </>
  );
}

// First or last appearance: an entry, None, or a movie, short or episode that isn't in the list yet.
function AppearanceEditor({
  which,
  entries,
  shows,
  update,
  noun,
  pending,
  onCancel,
}: EditorBase & {
  which: "First" | "Last";
  entries: { id: string; label: string }[];
  shows: { id: string; name: string }[];
  update: (patch: BulkCharacterPatch) => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [added, setAdded] = useState<CreatedEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const field = which === "First" ? "firstEntryId" : "lastEntryId";
  const all = [NONE_OPTION, ...[...entries, ...added.filter((entry) => !entries.some((known) => known.id === entry.id))].map((entry) => ({ value: entry.id, label: entry.label }))];
  const chosen = all.find((option) => option.value === choice);
  const word = which.toLowerCase();

  return (
    <>
      <Combobox
        label={`${which} appearance`}
        placeholder="Type to search…"
        hint="Pick one, or add a movie, short or episode that isn't here yet."
        options={all}
        value={choice}
        onValueChange={setChoice}
        onAddNew={() => setAdding(true)}
        className="max-w-[420px]"
      />
      {choice && chosen ? (
        <ConfirmRow
          summary={choice === NONE ? `Clear the ${word} appearance for ${noun}?` : `Set the ${word} appearance to ${chosen.label} for ${noun}?`}
          pending={pending}
          onConfirm={() => update({ [field]: choice === NONE ? null : choice })}
          onCancel={onCancel}
        />
      ) : null}
      {adding ? (
        <FirstAppearanceDialog
          which={which}
          shows={shows}
          description={`It's added when you save, and picked as the ${word} appearance. Confirm to apply it to ${noun}.`}
          onCreated={(entry) => {
            setAdded((list) => [...list, entry]);
            setChoice(entry.id);
          }}
          onOpenChange={setAdding}
        />
      ) : null}
    </>
  );
}

// Tags to add and tags to take off. Whatever else each character has stays.
function TagsEditor({
  allTags,
  selectedTags,
  onConfirm,
  noun,
  pending,
  onCancel,
}: EditorBase & { allTags: string[]; selectedTags: string[]; onConfirm: (add: string[], remove: string[]) => void }) {
  const [add, setAdd] = useState<string[]>([]);
  const [remove, setRemove] = useState<string[]>([]);
  const tagList = (names: string[]) => names.map((name) => `#${name}`).join(", ");
  const parts = [
    add.length > 0 ? `add ${tagList(add)}` : null,
    remove.length > 0 ? `remove ${tagList(remove)}` : null,
  ].filter(Boolean);
  const overlap = add.some((name) => remove.some((other) => other.toLowerCase() === name.toLowerCase()));

  return (
    <>
      <div className="grid gap-4 min-[720px]:grid-cols-2">
        <TagInput label="Tags to add" value={add} onChange={setAdd} options={allTags} hint="A tag that doesn't exist yet is created." />
        <TagInput
          label="Tags to remove"
          value={remove}
          onChange={setRemove}
          options={selectedTags}
          hint="Only tags the selected characters have are listed."
          error={overlap ? "A tag can't be both added and removed." : undefined}
        />
      </div>
      {parts.length > 0 && !overlap ? (
        <ConfirmRow
          summary={`${parts.join(" and ").replace(/^./, (letter) => letter.toUpperCase())} on ${noun}?`}
          pending={pending}
          onConfirm={() => onConfirm(add, remove)}
          onCancel={onCancel}
        />
      ) : null}
    </>
  );
}

// Deleting asks for the typed word, like deleting one character. The dialog stays open on an error.
function DeleteDialog({
  noun,
  onOpenChange,
  onDelete,
}: {
  noun: string;
  onOpenChange: (open: boolean) => void;
  onDelete: (confirm: string) => Promise<ActionResult<BulkResult>>;
}) {
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      eyebrow="Characters · Delete"
      accent="red"
      title={`Delete ${noun}?`}
      description="Their tags go with them. Recaps and titles are not touched. This can't be undone."
    >
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            setMessage(null);
            try {
              const result = await onDelete(typed);
              if (!result.ok) setMessage(result.message);
            } catch {
              setMessage("Couldn't delete. Nothing was lost. Check your connection and try again.");
            }
          });
        }}
      >
        {message ? <FormAlert>{message}</FormAlert> : null}
        <Input
          name="confirm"
          label="Type DELETE to confirm"
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={typed !== "DELETE" || pending}>
            {pending ? "Deleting…" : `Delete ${noun}`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
