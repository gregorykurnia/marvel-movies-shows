"use client";

import { useState, useTransition } from "react";

import { deleteTag, mergeTags, renameTag } from "@/actions/tags";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import type { TagRow } from "@/lib/data/tags";
import { formatCount } from "@/lib/format";

// The /tags list (IMPLEMENTATION_PLAN §4). Each tag can be renamed, merged into another tag, or deleted. Each action
// saves on its own, and the list refreshes from the server afterwards. Errors sit under the action that failed.
type Mode = "view" | "rename" | "merge" | "delete";

export function TagManager({ rows }: { rows: TagRow[] }) {
  return (
    <ol aria-label="Tags" className="grid gap-3">
      {rows.map((row) => (
        <li key={row.id} className="list-none">
          <TagItem row={row} others={rows.filter((other) => other.id !== row.id)} />
        </li>
      ))}
    </ol>
  );
}

function TagItem({ row, others }: { row: TagRow; others: TagRow[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("view");
  const [name, setName] = useState(row.name);
  const [target, setTarget] = useState(others[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: true } | { ok: false; message: string }>, done: string) {
    startTransition(async () => {
      setError(null);
      try {
        const result = await action();
        if (!result.ok) {
          setError(result.message);
          return;
        }
        toast(done);
        setMode("view");
      } catch {
        setError("Couldn't save. Check your connection and try again.");
      }
    });
  }

  const mergeInto = others.find((other) => other.id === target);

  return (
    <Panel className="grid gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Chip tone="tag">{row.name}</Chip>
        <span className="font-mono text-[13px] font-bold text-ink-2 tabular-nums">
          {formatCount(row.uses, "use")}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" aria-expanded={mode === "rename"} onClick={() => setMode(mode === "rename" ? "view" : "rename")}>
            Rename
          </Button>
          {others.length > 0 ? (
            <Button size="sm" variant="secondary" aria-expanded={mode === "merge"} onClick={() => setMode(mode === "merge" ? "view" : "merge")}>
              Merge
            </Button>
          ) : null}
          <Button size="sm" variant="danger" aria-expanded={mode === "delete"} onClick={() => setMode(mode === "delete" ? "view" : "delete")}>
            Delete
          </Button>
        </div>
      </div>

      {mode === "rename" ? (
        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData();
            form.set("name", name);
            run(() => renameTag(row.id, form), `Renamed to “${name.trim()}”.`);
          }}
          noValidate
        >
          <Input label="New name" value={name} onChange={(event) => setName(event.target.value)} error={error ?? undefined} />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save name"}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "merge" ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Select label={`Merge #${row.name} into`} value={target} onChange={(event) => setTarget(event.target.value)} hint={mergeInto ? `Every use of #${row.name} moves to #${mergeInto.name}, and #${row.name} is deleted.` : undefined} error={error ?? undefined}>
            {others.map((other) => (
              <option key={other.id} value={other.id}>
                #{other.name}
              </option>
            ))}
          </Select>
          <Button
            variant="primary"
            size="sm"
            disabled={pending || !target}
            onClick={() => run(() => mergeTags(row.id, target), `Merged #${row.name} into #${mergeInto?.name ?? ""}.`)}
          >
            {pending ? "Merging…" : "Merge tags"}
          </Button>
        </div>
      ) : null}

      {mode === "delete" ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-2">
            Delete #{row.name}? It&rsquo;s taken off {formatCount(row.uses, "item")}. The items themselves stay.
          </p>
          <Button variant="danger" size="sm" disabled={pending} onClick={() => run(() => deleteTag(row.id), `Deleted #${row.name}.`)}>
            {pending ? "Deleting…" : "Delete tag"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMode("view")}>
            Cancel
          </Button>
          {error ? <p role="alert" className="w-full text-[13px] font-semibold text-red-ink">{error}</p> : null}
        </div>
      ) : null}

      {mode === "view" && error ? (
        <p role="alert" className="text-[13px] font-semibold text-red-ink">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
