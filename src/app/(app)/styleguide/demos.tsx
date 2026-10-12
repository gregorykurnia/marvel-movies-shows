"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { FilterChip } from "@/components/ui/filter-chip";
import { useToast } from "@/components/ui/toast";

const universeOptions: ComboOption[] = [
  { value: "earth-199999", label: "Earth-199999", mono: true },
  { value: "earth-10005", label: "Earth-10005", mono: true },
  { value: "earth-838", label: "Earth-838", mono: true },
];

// Interactive combobox: type to filter, arrows to move, Enter to pick, "Add" creates a new value inline.
export function InteractiveComboboxDemo() {
  const [options, setOptions] = useState(universeOptions);
  const [value, setValue] = useState<string | null>("earth-199999");

  return (
    <Combobox
      label="Universe"
      placeholder="Search universes"
      hint="Type to filter, or add one inline."
      options={options}
      value={value}
      onValueChange={setValue}
      onCreate={(text) => {
        const created: ComboOption = { value: text.toLowerCase(), label: text, mono: true };
        setOptions((current) => [...current, created]);
        setValue(created.value);
      }}
    />
  );
}

// The open state from the design preview, held open for the styleguide.
export function OpenComboboxDemo() {
  const [value, setValue] = useState<string | null>("earth-10005");

  return (
    <Combobox
      label="Universe"
      open
      options={universeOptions}
      value={value}
      onValueChange={setValue}
      onCreate={() => {}}
    />
  );
}

export function ToastDemo() {
  const toast = useToast();

  return (
    <Button
      variant="blue"
      size="sm"
      onClick={() =>
        toast(
          <>
            <span aria-hidden>✓</span>
            <span>
              Moved <b className="text-yellow">Loki · S01·E01</b> after Avengers: Endgame
            </span>
          </>,
        )
      }
    >
      Show a toast
    </Button>
  );
}

// Active filter chip with a working ✕. Lives in a client file because it passes a handler.
export function FilterChipDemo() {
  const [active, setActive] = useState(true);

  return (
    <>
      <FilterChip active={active} onRemove={() => setActive(false)}>
        {active ? "Status: Alive" : "Status"}
      </FilterChip>
      <FilterChip>Importance ▾</FilterChip>
      <FilterChip>Universe ▾</FilterChip>
    </>
  );
}
