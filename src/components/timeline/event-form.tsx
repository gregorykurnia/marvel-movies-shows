"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { createEvent, updateEvent } from "@/actions/events";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { Input, Textarea } from "@/components/ui/field";
import { FormAlert, FormFooter, FormGrid, FormPanel, wide } from "@/components/ui/form-layout";
import { useToast } from "@/components/ui/toast";
import { formatYear } from "@/lib/format";

export type EventFormValues = {
  year: string;
  text: string;
  details: string;
  titleId: string | null;
  entryId: string | null;
  // "auto", "first", "keep" (edit only), or the id of the event this one follows.
  placement: string;
};

export const blankEvent: EventFormValues = {
  year: "",
  text: "",
  details: "",
  titleId: null,
  entryId: null,
  placement: "auto",
};

export type EventFormOptions = {
  titles: { id: string; name: string; kind: "movie" | "show" }[];
  entries: { id: string; titleId: string; label: string }[];
  events: { id: string; year: number; text: string }[];
};

// Parses the typed year. "−" is a real minus sign, so it's accepted as well as "-". Null while the text isn't a year.
function parseYear(text: string): number | null {
  const normalised = text.trim().replaceAll("−", "-");
  return /^-?\d+$/.test(normalised) ? Number(normalised) : null;
}

const NO_TITLE = "none";
const NO_LINK = "none";

// The timeline event form (DESIGN_GUIDE §8, Form). Year and text are required. The title and recap link are optional
// comboboxes. Picking a recap sets the title too. The order choice lists the events in the typed year, so the tie-break
// is always one that exists. Each message sits next to its field, and nothing typed is lost on error.
export function EventForm({
  mode,
  eventId,
  initial,
  options,
}: {
  mode: "new" | "edit";
  eventId?: string;
  initial: EventFormValues;
  options: EventFormOptions;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<EventFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const year = parseYear(values.year);

  // Only the events in the typed year, not this one, are offered as "after" choices.
  const sameYear = year === null ? [] : options.events.filter((event) => event.year === year && event.id !== eventId);

  const titleOptions: ComboOption[] = [
    { value: NO_TITLE, label: "No title (a general event)" },
    ...options.titles.map((title) => ({
      value: title.id,
      label: `${title.name} · ${title.kind === "movie" ? "Movie" : "Show"}`,
    })),
  ];

  // With a title chosen, only that title's recaps are offered.
  const linkable = values.titleId ? options.entries.filter((entry) => entry.titleId === values.titleId) : options.entries;
  const linkOptions: ComboOption[] = [
    { value: NO_LINK, label: "No recap link" },
    ...linkable.map((entry) => ({ value: entry.id, label: entry.label })),
  ];

  const placementOptions: ComboOption[] = [
    ...(mode === "edit" ? [{ value: "keep", label: "Keep its current place" }] : []),
    { value: "auto", label: "Automatic: last in the year" },
    { value: "first", label: "First in the year" },
    ...sameYear.map((event) => ({ value: event.id, label: `After “${event.text}”` })),
  ];

  // A recap always belongs to its title. So choosing no title, or a title the recap isn't part of, clears the recap.
  function chooseTitle(value: string | null) {
    const titleId = value === NO_TITLE || value === null ? null : value;
    setValues((current) => {
      const entryTitle = current.entryId ? options.entries.find((entry) => entry.id === current.entryId)?.titleId : null;
      const keepEntry = titleId !== null && entryTitle === titleId;
      return { ...current, titleId, entryId: keepEntry ? current.entryId : null };
    });
  }

  // Picking a recap sets the title too, so the two always agree.
  function chooseEntry(value: string | null) {
    if (value === NO_LINK || value === null) {
      set("entryId", null);
      return;
    }
    const entry = options.entries.find((candidate) => candidate.id === value);
    setValues((current) => ({ ...current, entryId: value, titleId: entry?.titleId ?? current.titleId }));
  }

  // The year decides which events the order choice lists. If the chosen event falls outside the year, go back to auto.
  function changeYear(text: string) {
    const next = parseYear(text);
    setValues((current) => {
      const isEventChoice = !["auto", "first", "keep"].includes(current.placement);
      const stillInYear = options.events.some(
        (event) => event.id === current.placement && event.year === next && event.id !== eventId,
      );
      const placement = isEventChoice && !stillInYear ? "auto" : current.placement;
      return { ...current, year: text, placement };
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const another = (event.nativeEvent as SubmitEvent).submitter?.dataset.intent === "another";
    const formData = new FormData(event.currentTarget);
    const text = values.text.trim();

    startTransition(async () => {
      setErrors({});
      setMessage(null);
      try {
        const result = mode === "new" ? await createEvent(formData) : await updateEvent(eventId ?? "", formData);
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          setMessage(result.message);
          return;
        }
        if (another) {
          // Keep the year, title and recap, which often repeat. Clear what is specific to this event.
          toast(`Added “${text}”. Add the next event.`);
          setValues((current) => ({ ...current, text: "", details: "", placement: "auto" }));
          return;
        }
        toast(mode === "new" ? `Added “${text}”.` : "Event saved.");
        router.push("/timeline");
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
            name="year"
            label="Year"
            inputMode="numeric"
            placeholder="e.g. 2012 or −5000"
            value={values.year}
            onChange={(event) => changeYear(event.target.value)}
            hint={year === null ? "A whole year. Use − for years before 1 AD." : `Shown as ${formatYear(year)} on the axis.`}
            error={errors.year}
          />
          <Input
            name="text"
            label="What happened"
            placeholder="e.g. Captain America wakes up from the ice"
            autoComplete="off"
            value={values.text}
            onChange={(event) => set("text", event.target.value)}
            hint="Short. This is the label on the axis."
            error={errors.text}
            className={wide}
          />
          <Textarea
            name="details"
            label="Details"
            rows={3}
            value={values.details}
            onChange={(event) => set("details", event.target.value)}
            hint="Shown when the event is opened. Optional."
            error={errors.details}
            className={wide}
          />
          <Combobox
            label="Title"
            placeholder="Type to search…"
            options={titleOptions}
            value={values.titleId ?? NO_TITLE}
            onValueChange={chooseTitle}
            hint="The movie or show the event belongs to. It sets the dot's colour."
            error={errors.titleId}
          />
          <Combobox
            label="Recap link"
            placeholder="Type to search…"
            options={linkOptions}
            value={values.entryId ?? NO_LINK}
            onValueChange={chooseEntry}
            hint="Optional. Adds a “Read recap” link to the event."
            error={errors.entryId}
          />
          <div className={wide}>
            <Combobox
              label="Order within the year"
              placeholder="Automatic: last in the year"
              options={placementOptions}
              value={values.placement}
              onValueChange={(value) => set("placement", value ?? "auto")}
              hint={
                mode === "edit"
                  ? "Changing the year puts the event last in its new year, unless you pick an order here."
                  : "Events in the same year are listed in this order. Pick one to sort it among them."
              }
              error={errors.placement}
            />
          </div>
        </FormGrid>

        <input type="hidden" name="titleId" value={values.titleId ?? ""} />
        <input type="hidden" name="entryId" value={values.entryId ?? ""} />
        <input type="hidden" name="placement" value={values.placement} />

        <FormFooter>
          <Link href="/timeline" className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
          {mode === "new" ? (
            <Button type="submit" variant="secondary" data-intent="another" disabled={pending}>
              Save &amp; add another
            </Button>
          ) : null}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save event"}
          </Button>
        </FormFooter>
      </FormPanel>
    </form>
  );
}
