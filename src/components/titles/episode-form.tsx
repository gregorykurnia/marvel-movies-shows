"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { addEpisodes, createEpisode } from "@/actions/entries";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { FormAlert, FormFooter, FormGrid, FormPanel, wide } from "@/components/ui/form-layout";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { UniverseField, withUniverse, type UniverseOption } from "@/components/universes/universe-field";
import { formatEpisodeCode } from "@/lib/format";
import { cn } from "@/lib/utils";

// Add one episode, or a run of episodes in one season (IMPLEMENTATION_PLAN §6, Phase 1). Every field stays in the
// form. The fields for the other mode are hidden, not removed, so nothing typed is lost when switching. A run gets
// one universe for all of its episodes.
type Mode = "one" | "run";

export function EpisodeForm({
  titleId,
  showName,
  universes,
}: {
  titleId: string;
  showName: string;
  universes: UniverseOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("one");
  const [universeList, setUniverseList] = useState(universes);
  const [universeId, setUniverseId] = useState<string | null>(null);
  const [season, setSeason] = useState("1");
  const [episode, setEpisode] = useState("1");
  const [name, setName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [fromEpisode, setFromEpisode] = useState("1");
  const [toEpisode, setToEpisode] = useState("9");
  const [year, setYear] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const another = (event.nativeEvent as SubmitEvent).submitter?.dataset.intent === "another";
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setErrors({});
      setMessage(null);
      try {
        if (mode === "one") {
          const result = await createEpisode(titleId, formData);
          if (!result.ok) {
            setErrors(result.fieldErrors ?? {});
            setMessage(result.message);
            return;
          }
          const code = formatEpisodeCode(Number(season), Number(episode)) ?? "";
          if (another) {
            toast(`Added ${code}.`);
            setEpisode(String(Number(episode) + 1));
            setName("");
            setReleaseDate("");
            return;
          }
          toast(`Added ${code} to ${showName}.`);
        } else {
          const result = await addEpisodes(titleId, formData);
          if (!result.ok) {
            setErrors(result.fieldErrors ?? {});
            setMessage(result.message);
            return;
          }
          const count = result.data.count;
          const label = `${count} episode${count === 1 ? "" : "s"}`;
          if (another) {
            // The next run starts right after this one, in the same season, with the same size.
            const size = Number(toEpisode) - Number(fromEpisode) + 1;
            const nextFrom = Number(toEpisode) + 1;
            setFromEpisode(String(nextFrom));
            setToEpisode(String(nextFrom + size - 1));
            toast(`Added ${label}.`);
            return;
          }
          toast(`Added ${label} to ${showName}.`);
        }
        router.push(`/titles/${titleId}`);
      } catch {
        setMessage("Couldn't save. Nothing was lost. Check your connection and try again.");
      }
    });
  }

  const runCount = Math.max(0, Number(toEpisode) - Number(fromEpisode) + 1);

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormPanel>
        {message ? <FormAlert>{message}</FormAlert> : null}

        <div className="mb-5">
          <Segmented
            label="How many episodes"
            value={mode}
            onValueChange={(value) => setMode(value as Mode)}
            options={[
              { value: "one", label: "One episode" },
              { value: "run", label: "A run of episodes" },
            ]}
          />
        </div>

        <FormGrid>
          <Input
            name="season"
            label="Season"
            inputMode="numeric"
            value={season}
            onChange={(event) => setSeason(event.target.value)}
            error={errors.season}
          />
          {mode === "one" ? (
            <Input
              name="episode"
              label="Episode number"
              inputMode="numeric"
              value={episode}
              onChange={(event) => setEpisode(event.target.value)}
              error={errors.episode}
            />
          ) : null}

          <div className={cn("grid gap-[18px] min-[640px]:col-span-2 min-[640px]:grid-cols-2", mode !== "run" && "hidden")}>
            <Input
              name="fromEpisode"
              label="First episode"
              inputMode="numeric"
              value={fromEpisode}
              onChange={(event) => setFromEpisode(event.target.value)}
              error={errors.fromEpisode}
            />
            <Input
              name="toEpisode"
              label="Last episode"
              inputMode="numeric"
              value={toEpisode}
              onChange={(event) => setToEpisode(event.target.value)}
              error={errors.toEpisode}
              hint={runCount > 0 ? `${runCount} episode${runCount === 1 ? "" : "s"} will be added, named “Episode N”.` : undefined}
            />
          </div>

          <Input
            name="name"
            label="Episode name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            hint="Optional. Leave blank to show “Episode N”."
            error={errors.name}
            className={cn(wide, mode !== "one" && "hidden")}
          />
          <Input
            name="releaseDate"
            type="date"
            label="Release date"
            value={releaseDate}
            onChange={(event) => setReleaseDate(event.target.value)}
            error={errors.releaseDate}
            className={cn(mode !== "one" && "hidden")}
          />
          <div className="grid gap-[18px] min-[640px]:col-span-2 min-[640px]:grid-cols-2">
            <Input
              name="inUniverseYear"
              label="In-universe year"
              inputMode="numeric"
              placeholder="e.g. 2012"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              hint="Seeds where these land in the recap order. Use − for years before 1 AD."
              error={errors.inUniverseYear}
            />
            <UniverseField
              universes={universeList}
              value={universeId}
              onValueChange={setUniverseId}
              onCreated={(universe) => setUniverseList((list) => withUniverse(list, universe))}
              error={errors.universeId}
            />
          </div>
        </FormGrid>

        <FormFooter>
          <Link href={`/titles/${titleId}`} className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
          <Button type="submit" variant="secondary" data-intent="another" disabled={pending}>
            Save &amp; add another
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : mode === "one" ? "Save episode" : `Add ${runCount} episodes`}
          </Button>
        </FormFooter>
      </FormPanel>
    </form>
  );
}
