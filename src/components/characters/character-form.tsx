"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { createCharacter, updateCharacter } from "@/actions/characters";
import { FirstAppearanceDialog, type CreatedEntry } from "@/components/characters/first-appearance-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input, Textarea } from "@/components/ui/field";
import { FormAlert, FormFooter, FormGrid, FormPanel, wide } from "@/components/ui/form-layout";
import { RadioPills } from "@/components/ui/radio-pills";
import { useToast } from "@/components/ui/toast";
import { UniverseField, withUniverse, type UniverseOption } from "@/components/universes/universe-field";

export type CharacterFormValues = {
  name: string;
  importance: "major" | "minor";
  status: "alive" | "deceased" | "unknown";
  universeId: string | null;
  predominantTitleId: string | null;
  firstEntryId: string | null;
  lastEntryId: string | null;
  notes: string;
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
};

type Option = { value: string; label: string };

// The character form (DESIGN_GUIDE §8, Form). Every dropdown is a searchable combobox. Universe has an inline
// "+ Add universe", and a typed name is added on save. First and Last appearance have "＋ Add new…", which opens a
// dialog for a movie, short or show episode that isn't in the list yet (Phase 11). Status and importance are radio
// pills. Each variant is saved as its own character. Every field is controlled, so "Save & add another" can clear
// the right ones.
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
  universes: UniverseOption[];
  titles: { id: string; name: string; kind: "movie" | "show" | "short" }[];
  entries: { id: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<CharacterFormValues>(initial);
  const [universeList, setUniverseList] = useState(universes);
  const [universeName, setUniverseName] = useState("");
  const [entryList, setEntryList] = useState(entries);
  // Which appearance the "Add new…" dialog is for. Null while it's closed.
  const [appearanceTarget, setAppearanceTarget] = useState<"firstEntryId" | "lastEntryId" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  function set<K extends keyof CharacterFormValues>(key: K, value: CharacterFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const titleOptions: Option[] = titles.map((title) => ({ value: title.id, label: title.name }));
  const entryOptions: Option[] = entryList.map((entry) => ({ value: entry.id, label: entry.label }));
  const shows = titles.filter((title) => title.kind === "show").map((title) => ({ id: title.id, name: title.name }));

  // A movie, short or episode the dialog just added. It joins the list, and is picked for the appearance it was made for.
  function addedEntry(entry: CreatedEntry) {
    setEntryList((list) => [...list.filter((item) => item.id !== entry.id), entry]);
    if (appearanceTarget) set(appearanceTarget, entry.id);
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

  // The dialog sits outside the form. Its submit would otherwise bubble up through the portal and save the character.
  return (
    <>
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

            <UniverseField
              universes={universeList}
              value={values.universeId}
              onValueChange={(value) => set("universeId", value)}
              onCreated={(universe) => setUniverseList((list) => withUniverse(list, universe))}
              clearLabel={null}
              hint="Pick one, or type a new name. A new one is added to the list when you save."
              error={errors.universeId ?? errors.universeName}
              pendingName={universeName}
              onPendingNameChange={setUniverseName}
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
              hint="Pick one, or add a movie, short or episode that isn't here yet."
              options={entryOptions}
              value={values.firstEntryId}
              onValueChange={(value) => set("firstEntryId", value)}
              onAddNew={() => setAppearanceTarget("firstEntryId")}
              error={errors.firstEntryId}
            />
            <Combobox
              label="Last appearance"
              placeholder="Type to search…"
              hint="Pick one, or add a movie, short or episode that isn't here yet."
              options={entryOptions}
              value={values.lastEntryId}
              onValueChange={(value) => set("lastEntryId", value)}
              onAddNew={() => setAppearanceTarget("lastEntryId")}
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
          </FormGrid>

          {/* The comboboxes have no name of their own, so their chosen values travel as hidden fields. The universe
              field sends its own universeId and universeName. */}
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

      {appearanceTarget ? (
        <FirstAppearanceDialog
          which={appearanceTarget === "firstEntryId" ? "First" : "Last"}
          shows={shows}
          onCreated={addedEntry}
          onOpenChange={(open) => {
            if (!open) setAppearanceTarget(null);
          }}
        />
      ) : null}
    </>
  );
}
