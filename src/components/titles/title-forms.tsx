"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { createTitle, updateTitle } from "@/actions/titles";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { FormAlert, FormFooter, FormGrid, FormPanel, wide } from "@/components/ui/form-layout";
import { RadioPills } from "@/components/ui/radio-pills";
import { useToast } from "@/components/ui/toast";
import { UniverseField, withUniverse, type UniverseOption } from "@/components/universes/universe-field";
import { cn } from "@/lib/utils";
import { KIND_LABEL, type TitleKind } from "@/lib/title-kind";

const NAME_PLACEHOLDER: Record<TitleKind, string> = { movie: "e.g. Thor", show: "e.g. Loki", short: "e.g. Item 47" };

// Add a movie, a show or a short (IMPLEMENTATION_PLAN §4). A movie or a short is saved with its single entry, then
// the user goes on to paste its recap. A show is saved empty, then the user goes on to add its episodes.
export function TitleNewForm({ universes }: { universes: UniverseOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<TitleKind>("movie");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  // Changing the key clears the typed fields after "Save & add another". The kind and the universe stay chosen,
  // so a run of movies from one universe doesn't need it picked each time.
  const [version, setVersion] = useState(0);
  const [universeList, setUniverseList] = useState(universes);
  const [universeId, setUniverseId] = useState<string | null>(null);
  const [universeName, setUniverseName] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const another = (event.nativeEvent as SubmitEvent).submitter?.dataset.intent === "another";
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();

    startTransition(async () => {
      setErrors({});
      setMessage(null);
      try {
        const result = await createTitle(formData);
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          setMessage(result.message);
          return;
        }
        if (another) {
          toast(`Added “${name}”.`);
          setVersion((current) => current + 1);
          return;
        }
        if (result.data.kind === "show") {
          toast(`Added “${name}”. Now add its episodes.`);
          router.push(`/titles/${result.data.id}`);
        } else {
          toast(`Added “${name}”. Now paste its recap.`);
          router.push(`/recaps/${result.data.entryId}/edit`);
        }
      } catch {
        setMessage("Couldn't save. Nothing was lost. Check your connection and try again.");
      }
    });
  }

  return (
    <form key={version} onSubmit={onSubmit} noValidate>
      <FormPanel>
        {message ? <FormAlert>{message}</FormAlert> : null}
        <FormGrid>
          <div className={wide}>
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
            {errors.kind ? <p className="mt-1.5 text-[13px] font-semibold text-red-ink">{errors.kind}</p> : null}
          </div>
          <Input
            name="name"
            label={kind === "show" ? "Show title" : `${KIND_LABEL[kind]} title`}
            placeholder={NAME_PLACEHOLDER[kind]}
            autoComplete="off"
            error={errors.name}
            className={wide}
          />
          <Input
            name="releaseDate"
            type="date"
            label={kind === "show" ? "Premiere date" : "Release date"}
            error={errors.releaseDate}
          />
          <div className={cn("grid gap-[18px] min-[640px]:col-span-2 min-[640px]:grid-cols-2", kind === "show" && "hidden")}>
            <Input
              name="inUniverseYear"
              label="In-universe year"
              inputMode="numeric"
              placeholder="e.g. 2011"
              hint="Seeds where it lands in the recap order. Use − for years before 1 AD."
              error={errors.inUniverseYear}
            />
            <UniverseField
              universes={universeList}
              value={universeId}
              onValueChange={setUniverseId}
              pendingName={universeName}
              onPendingNameChange={setUniverseName}
              onCreated={(universe) => setUniverseList((list) => withUniverse(list, universe))}
              error={errors.universeId ?? errors.universeName}
            />
          </div>
        </FormGrid>

        <FormFooter>
          <Link href="/titles" className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
          <Button type="submit" variant="secondary" data-intent="another" disabled={pending}>
            Save &amp; add another
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save title"}
          </Button>
        </FormFooter>
      </FormPanel>
    </form>
  );
}

// Edit a show's name and premiere date. A movie is edited on its recap page, where its year lives too.
export function TitleEditForm({
  titleId,
  defaultName,
  defaultReleaseDate,
  defaultNotes,
}: {
  titleId: string;
  defaultName: string;
  defaultReleaseDate: string | null;
  defaultNotes: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setErrors({});
      setMessage(null);
      try {
        const result = await updateTitle(titleId, formData);
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          setMessage(result.message);
          return;
        }
        toast("Show saved.");
        router.push(`/titles/${titleId}`);
      } catch {
        setMessage("Couldn't save. Your changes are still here. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormPanel>
        {message ? <FormAlert>{message}</FormAlert> : null}
        <FormGrid>
          <Input name="name" label="Show title" defaultValue={defaultName} error={errors.name} className={wide} />
          <Input
            name="releaseDate"
            type="date"
            label="Premiere date"
            defaultValue={defaultReleaseDate ?? ""}
            error={errors.releaseDate}
          />
          <Textarea
            name="notes"
            label="Notes"
            rows={4}
            defaultValue={defaultNotes ?? ""}
            hint="Your own notes on the show. Plain text or Markdown."
            error={errors.notes}
            className="min-[640px]:col-span-2"
          />
        </FormGrid>
        <FormFooter>
          <Link href={`/titles/${titleId}`} className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save show"}
          </Button>
        </FormFooter>
      </FormPanel>
    </form>
  );
}
