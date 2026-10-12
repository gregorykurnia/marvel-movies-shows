"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { createCharacter, updateCharacter } from "@/actions/characters";
import { createUniverse } from "@/actions/universes";
import { AppearancesPicker } from "@/components/characters/appearances-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input, Textarea } from "@/components/ui/field";
import { FormAlert, FormFooter, FormGrid, FormPanel, wide } from "@/components/ui/form-layout";
import { RadioPills } from "@/components/ui/radio-pills";
import { useToast } from "@/components/ui/toast";

export type CharacterFormValues = {
  name: string;
  importance: "major" | "minor";
  status: "alive" | "deceased" | "unknown";
  universeId: string | null;
  predominantTitleId: string | null;
  firstEntryId: string | null;
  lastEntryId: string | null;
  notes: string;
  entryIds: string[];
};

export const blankCharacter: CharacterFormValues = {
  name: "",
  importance: "minor",
  status: "alive",
  universeId: null,
  predominantTitleId: null,
  firstEntryId: null,
  lastEntryId: null,
  notes: "",
  entryIds: [],
};

type Option = { value: string; label: string; mono?: boolean };

// The character form (DESIGN_GUIDE §8, Form). Every dropdown is a searchable combobox. Universe has an inline
// "+ Add universe". Status and importance are radio pills. Appearances are a multi-select. Each variant is saved
// as its own character. Every field is controlled, so "Save & add another" can clear the right ones.
export function CharacterForm({
  mode,
  characterId,
  initial,
  universes,
  titles,
  entries,
}: {
  mode: "new" | "edit";
  characterId?: string;
  initial: CharacterFormValues;
  universes: { id: string; name: string }[];
  titles: { id: string; name: string }[];
  entries: { id: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<CharacterFormValues>(initial);
  const [universeList, setUniverseList] = useState(universes);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  function set<K extends keyof CharacterFormValues>(key: K, value: CharacterFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const universeOptions: Option[] = universeList.map((universe) => ({ value: universe.id, label: universe.name, mono: true }));
  const titleOptions: Option[] = titles.map((title) => ({ value: title.id, label: title.name }));
  const entryOptions: Option[] = entries.map((entry) => ({ value: entry.id, label: entry.label }));

  // Adds a universe from inside the universe combobox, then selects it. An existing name is selected, not duplicated.
  function addUniverse(name: string) {
    startTransition(async () => {
      const result = await createUniverse(name);
      if (!result.ok) {
        setErrors((current) => ({ ...current, universeId: result.message }));
        return;
      }
      setUniverseList((current) =>
        current.some((universe) => universe.id === result.data.id)
          ? current
          : [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      set("universeId", result.data.id);
      setErrors((current) => ({ ...current, universeId: "" }));
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const another = (event.nativeEvent as SubmitEvent).submitter?.dataset.intent === "another";
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setErrors({});
      setMessage(null);
      try {
        const result =
          mode === "new" ? await createCharacter(formData) : await updateCharacter(characterId ?? "", formData);
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          setMessage(result.message);
          return;
        }
        if (another) {
          // Keep what repeats between variants (importance, status, universe). Clear what is specific to one.
          toast(`Added “${values.name.trim()}”. Add the next variant.`);
          setValues((current) => ({
            ...current,
            name: "",
            notes: "",
            predominantTitleId: null,
            firstEntryId: null,
            lastEntryId: null,
            entryIds: [],
          }));
          return;
        }
        const savedId = mode === "new" ? (result.data as { id: string }).id : (characterId ?? "");
        toast(mode === "new" ? "Character added." : "Character saved.");
        router.push(`/characters/${savedId}`);
      } catch {
        setMessage("Couldn't save. Nothing was lost. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormPanel>
        {message ? <FormAlert>{message}</FormAlert> : null}
        <FormGrid>
          <Input
            name="name"
            label="Name"
            placeholder="e.g. Loki"
            autoComplete="off"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            hint="Each variant is its own character, so name them the same and set their universe."
            error={errors.name}
            className={wide}
          />

          <div className="grid content-start gap-1.5">
            <span className="text-sm font-bold">Importance</span>
            <RadioPills
              name="importance"
              label="Importance"
              value={values.importance}
              onValueChange={(value) => set("importance", value as "major" | "minor")}
              options={[
                { value: "major", label: "★ Major", tone: "violet" },
                { value: "minor", label: "Minor", tone: "neutral" },
              ]}
            />
            {errors.importance ? <p className="text-[13px] font-semibold text-red-ink">{errors.importance}</p> : null}
          </div>

          <div className="grid content-start gap-1.5">
            <span className="text-sm font-bold">Status</span>
            <RadioPills
              name="status"
              label="Status"
              value={values.status}
              onValueChange={(value) => set("status", value as "alive" | "deceased" | "unknown")}
              options={[
                { value: "alive", label: "● Alive", tone: "green" },
                { value: "deceased", label: "Deceased", tone: "neutral" },
                { value: "unknown", label: "Unknown", tone: "yellow" },
              ]}
            />
            {errors.status ? <p className="text-[13px] font-semibold text-red-ink">{errors.status}</p> : null}
          </div>

          <Combobox
            label="Universe"
            placeholder="Type to search or add…"
            options={universeOptions}
            value={values.universeId}
            onValueChange={(value) => set("universeId", value)}
            onCreate={addUniverse}
            hint="Universes are a list you maintain on the Universes page."
            error={errors.universeId}
          />
          <Combobox
            label="Predominant title"
            placeholder="Type to search…"
            options={titleOptions}
            value={values.predominantTitleId}
            onValueChange={(value) => set("predominantTitleId", value)}
            error={errors.predominantTitleId}
          />
          <Combobox
            label="First appearance"
            placeholder="Type to search…"
            options={entryOptions}
            value={values.firstEntryId}
            onValueChange={(value) => set("firstEntryId", value)}
            error={errors.firstEntryId}
          />
          <Combobox
            label="Last appearance"
            placeholder="Type to search…"
            options={entryOptions}
            value={values.lastEntryId}
            onValueChange={(value) => set("lastEntryId", value)}
            error={errors.lastEntryId}
          />

          <Textarea
            name="notes"
            label="Notes"
            rows={4}
            value={values.notes}
            onChange={(event) => set("notes", event.target.value)}
            hint="Plain text or Markdown."
            error={errors.notes}
            className={wide}
          />

          <div className={wide}>
            <AppearancesPicker
              label="Appears in"
              fieldName="entryId"
              options={entryOptions}
              selected={values.entryIds}
              onChange={(next) => set("entryIds", next)}
              hint="Every movie or episode this variant appears in."
              error={errors.entryIds}
              emptyText="No appearances yet."
            />
          </div>
        </FormGrid>

        {/* The comboboxes have no name of their own, so their chosen values travel as hidden fields. */}
        <input type="hidden" name="universeId" value={values.universeId ?? ""} />
        <input type="hidden" name="predominantTitleId" value={values.predominantTitleId ?? ""} />
        <input type="hidden" name="firstEntryId" value={values.firstEntryId ?? ""} />
        <input type="hidden" name="lastEntryId" value={values.lastEntryId ?? ""} />

        <FormFooter>
          <Link
            href={mode === "new" ? "/characters" : `/characters/${characterId}`}
            className={buttonVariants({ variant: "ghost" })}
          >
            Cancel
          </Link>
          {mode === "new" ? (
            <Button type="submit" variant="secondary" data-intent="another" disabled={pending}>
              Save &amp; add another
            </Button>
          ) : null}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save character"}
          </Button>
        </FormFooter>
      </FormPanel>
    </form>
  );
}
