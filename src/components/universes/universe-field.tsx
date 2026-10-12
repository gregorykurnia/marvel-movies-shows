"use client";

import { useState, useTransition } from "react";

import { createUniverse } from "@/actions/universes";
import { Combobox } from "@/components/ui/combobox";

export type UniverseOption = { id: string; name: string };

// Adds a universe to a list sorted by name, unless it's already there.
export function withUniverse(list: UniverseOption[], universe: UniverseOption): UniverseOption[] {
  if (list.some((item) => item.id === universe.id)) return list;
  return [...list, universe].sort((a, b) => a.name.localeCompare(b.name));
}

// The universe designation on a movie, an episode or a recap (PRODUCT_PLAN §2.1). It sits beside the in-universe year.
// The form holds the list and the chosen id, so a universe added inline survives "Save & add another", which remounts
// the form. The chosen id travels as a hidden field. Choosing "No universe" clears it.
export function UniverseField({
  universes,
  value,
  onValueChange,
  onCreated,
  error,
  className,
}: {
  universes: UniverseOption[];
  value: string | null;
  onValueChange: (id: string | null) => void;
  onCreated: (universe: UniverseOption) => void;
  error?: string;
  className?: string;
}) {
  const [, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | undefined>();

  // Creates the universe from inside the combobox, then selects it. An existing name is selected, not duplicated.
  function addUniverse(name: string) {
    startTransition(async () => {
      const result = await createUniverse(name);
      if (!result.ok) {
        setCreateError(result.message);
        return;
      }
      setCreateError(undefined);
      onCreated(result.data);
      onValueChange(result.data.id);
    });
  }

  return (
    <>
      <Combobox
        label="Universe"
        placeholder="Type to search or add…"
        options={universes.map((universe) => ({ value: universe.id, label: universe.name, mono: true }))}
        value={value}
        onValueChange={onValueChange}
        onCreate={addUniverse}
        clearLabel="No universe"
        hint="Optional. Shown on the recap and in the list."
        error={error ?? createError}
        className={className}
      />
      <input type="hidden" name="universeId" value={value ?? ""} />
    </>
  );
}
