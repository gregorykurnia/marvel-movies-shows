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
import { cn } from "@/lib/utils";

// Add a movie or a show (IMPLEMENTATION_PLAN §4). A movie is saved with its single entry, then the user goes on
// to paste its recap. A show is saved empty, then the user goes on to add its episodes.
export function TitleNewForm() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<"movie" | "show">("movie");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  // Changing the key clears the typed fields after "Save & add another". The kind stays chosen.
  const [version, setVersion] = useState(0);

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
              label="Movie or show"
              value={kind}
              onValueChange={(value) => setKind(value as "movie" | "show")}
              options={[
                { value: "movie", label: "Movie", tone: "red" },
                { value: "show", label: "Show", tone: "blue" },
              ]}
            />
            {errors.kind ? <p className="mt-1.5 text-[13px] font-semibold text-red-ink">{errors.kind}</p> : null}
          </div>
          <Input
            name="name"
            label={kind === "movie" ? "Movie title" : "Show title"}
            placeholder={kind === "movie" ? "e.g. Thor" : "e.g. Loki"}
            autoComplete="off"
            error={errors.name}
            className={wide}
          />
          <Input
            name="releaseDate"
            type="date"
            label={kind === "movie" ? "Release date" : "Premiere date"}
            error={errors.releaseDate}
          />
          <Input
            name="inUniverseYear"
            label="In-universe year"
            inputMode="numeric"
            placeholder="e.g. 2011"
            hint="Seeds where the movie lands in the recap order. Use − for years before 1 AD."
            error={errors.inUniverseYear}
            className={cn(kind !== "movie" && "hidden")}
          />
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
