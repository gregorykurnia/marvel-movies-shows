"use client";

import { useState, useTransition, type FormEvent } from "react";

import { createUniverse, deleteUniverse, renameUniverse } from "@/actions/universes";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { FormPanel } from "@/components/ui/form-layout";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import type { UniverseRow } from "@/lib/data/characters";
import { formatCount } from "@/lib/format";

// Add, rename and delete universes (IMPLEMENTATION_PLAN §6, Phase 2). A universe can only be deleted when no
// character or recap uses it. The button says so, and the server checks it again.
export function UniverseManager({ universes }: { universes: UniverseRow[] }) {
  return (
    <div className="grid gap-6">
      <AddUniverse />
      {universes.length === 0 ? (
        <EmptyState icon="◎" title="No universes yet">
          Add the universes your characters belong to, such as Earth-616 or Earth-199999.
        </EmptyState>
      ) : (
        <ul aria-label="Universes" className="grid gap-3">
          {universes.map((universe) => (
            <UniverseRowItem key={universe.id} universe={universe} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddUniverse() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(undefined);
      const result = await createUniverse(formData);
      if (!result.ok) {
        setError(result.fieldErrors?.name ?? result.message);
        return;
      }
      toast(`Added ${result.data.name}.`);
      setName("");
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Add a universe">
      <FormPanel className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <Input
            name="name"
            label="New universe"
            placeholder="e.g. Earth-199999"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={error}
          />
        </div>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Adding…" : "＋ Add universe"}
        </Button>
      </FormPanel>
    </form>
  );
}

function UniverseRowItem({ universe }: { universe: UniverseRow }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(universe.name);
  const [error, setError] = useState<string | undefined>();
  const inUse = universe.characters > 0 || universe.recaps > 0;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(undefined);
      const result = await renameUniverse(universe.id, formData);
      if (!result.ok) {
        setError(result.fieldErrors?.name ?? result.message);
        return;
      }
      toast(`Renamed to ${draft.trim()}.`);
      setEditing(false);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteUniverse(universe.id);
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(`Deleted ${universe.name}.`);
    });
  }

  return (
    <li className="list-none">
      <Panel className="grid gap-3 p-4 min-[640px]:flex min-[640px]:items-center min-[640px]:justify-between">
        {editing ? (
          <form onSubmit={save} noValidate className="flex w-full flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <Input
                name="name"
                label={`Rename ${universe.name}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                error={error}
                autoComplete="off"
              />
            </div>
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(universe.name);
                setError(undefined);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Chip tone="universe">{universe.name}</Chip>
              <span className="font-mono text-[13px] font-bold tabular-nums text-ink-2">
                {formatCount(universe.characters, "character")} · {formatCount(universe.recaps, "recap")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
                Rename
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={remove}
                disabled={inUse || pending}
                aria-describedby={inUse ? `in-use-${universe.id}` : undefined}
              >
                Delete
              </Button>
              {inUse ? (
                <span id={`in-use-${universe.id}`} className="text-[13px] text-ink-3">
                  In use. Clear it from its characters and recaps first.
                </span>
              ) : null}
            </div>
          </>
        )}
      </Panel>
    </li>
  );
}
