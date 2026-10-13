"use client";

import { useState, useTransition, type FormEvent } from "react";

import { createFirstAppearanceEntry } from "@/actions/entries";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { FormAlert, FormFooter } from "@/components/ui/form-layout";
import { RadioPills } from "@/components/ui/radio-pills";
import { KIND_LABEL, type TitleKind } from "@/lib/title-kind";

export type ShowOption = { id: string; name: string };
export type CreatedEntry = { id: string; label: string };

const NAME_PLACEHOLDER: Record<"movie" | "short", string> = { movie: "e.g. Thor", short: "e.g. Item 47" };

// Adds a movie, a short or a show episode from a character's First or Last appearance, without leaving the character
// form (Phase 11). The entry is added on save, then picked for the character. Nothing typed is lost on error. The
// form is mounted only while open, so each open starts clean.
export function FirstAppearanceDialog({
  which,
  shows,
  description = "It's added when you save, and picked for this character.",
  onCreated,
  onOpenChange,
}: {
  which: "First" | "Last";
  shows: ShowOption[];
  description?: string;
  onCreated: (entry: CreatedEntry) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<TitleKind>("movie");
  const [name, setName] = useState("");
  const [showId, setShowId] = useState<string | null>(null);
  const [showName, setShowName] = useState("");
  const [season, setSeason] = useState("");
  const [episode, setEpisode] = useState("");
  const [episodeName, setEpisodeName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setErrors({});
      setMessage(null);
      try {
        const result = await createFirstAppearanceEntry({
          kind,
          name,
          showTitleId: showId,
          showName,
          season,
          episode,
          episodeName,
        });
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          setMessage(result.message);
          return;
        }
        onCreated(result.data);
        onOpenChange(false);
      } catch {
        setMessage("Couldn't save. Nothing was lost. Check your connection and try again.");
      }
    });
  }

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      eyebrow="Characters · New entry"
      accent="violet"
      title={`Add a ${which.toLowerCase()} appearance`}
      description={description}
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {message ? <FormAlert>{message}</FormAlert> : null}

        <div className="grid gap-1.5">
          <span className="text-sm font-bold">Movie, show or short</span>
          <RadioPills
            name="kind"
            label="Movie, show or short"
            value={kind}
            onValueChange={(value) => setKind(value as TitleKind)}
            options={[
              { value: "movie", label: "Movie", tone: "red" },
              { value: "show", label: "Show", tone: "blue" },
              { value: "short", label: "Short", tone: "orange" },
            ]}
          />
          {errors.kind ? <p className="text-[13px] font-semibold text-red-ink">{errors.kind}</p> : null}
        </div>

        {kind === "show" ? (
          <>
            <Combobox
              label="Show"
              placeholder="Type to search or add…"
              options={shows.map((show) => ({ value: show.id, label: show.name }))}
              value={showId}
              onValueChange={setShowId}
              text={showName}
              onTextChange={setShowName}
              hint="Pick a show you've entered, or type a new one."
              error={errors.showName ?? errors.showTitleId}
            />
            <div className="grid gap-4 min-[480px]:grid-cols-2">
              <Input
                name="season"
                label="Season"
                inputMode="numeric"
                placeholder="e.g. 1"
                value={season}
                onChange={(event) => setSeason(event.target.value)}
                error={errors.season}
              />
              <Input
                name="episode"
                label="Episode number"
                inputMode="numeric"
                placeholder="e.g. 1"
                value={episode}
                onChange={(event) => setEpisode(event.target.value)}
                error={errors.episode}
              />
            </div>
            <Input
              name="episodeName"
              label="Episode name"
              value={episodeName}
              onChange={(event) => setEpisodeName(event.target.value)}
              hint="Optional."
              error={errors.episodeName}
            />
          </>
        ) : (
          <Input
            name="name"
            label={`${KIND_LABEL[kind]} title`}
            placeholder={NAME_PLACEHOLDER[kind]}
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
          />
        )}

        <FormFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Adding…" : "Add and pick"}
          </Button>
        </FormFooter>
      </form>
    </Dialog>
  );
}
