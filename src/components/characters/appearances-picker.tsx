"use client";

import { Combobox } from "@/components/ui/combobox";
import { RemovableChip } from "@/components/ui/removable-chip";
import { cn } from "@/lib/utils";

// Multi-select built from existing pieces (IMPLEMENTATION_PLAN §6, Phase 2): a searchable combobox adds a value,
// and each chosen value shows as a removable chip. Chosen values are sent as repeated hidden fields.
export function AppearancesPicker({
  label,
  options,
  selected,
  onChange,
  fieldName,
  hint,
  error,
  emptyText,
  className,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  fieldName: string;
  hint?: string;
  error?: string;
  emptyText: string;
  className?: string;
}) {
  const remaining = options.filter((option) => !selected.includes(option.value));
  const chosen = selected
    .map((value) => options.find((option) => option.value === value))
    .filter((option): option is { value: string; label: string } => Boolean(option));

  return (
    <div className={cn("grid min-w-0 gap-3", className)}>
      <Combobox
        label={label}
        placeholder="Type to search…"
        options={remaining}
        value={null}
        onValueChange={(value) => {
          if (value && !selected.includes(value)) onChange([...selected, value]);
        }}
        hint={hint}
        error={error}
      />
      {chosen.length > 0 ? (
        <ul aria-label={`${label}, chosen`} className="flex min-w-0 flex-wrap gap-2">
          {chosen.map((option) => (
            <li key={option.value} className="min-w-0 max-w-full list-none">
              <RemovableChip
                removeLabel={`Remove ${option.label}`}
                onRemove={() => onChange(selected.filter((value) => value !== option.value))}
              >
                {option.label}
              </RemovableChip>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-3">{emptyText}</p>
      )}
      {selected.map((value) => (
        <input key={value} type="hidden" name={fieldName} value={value} />
      ))}
    </div>
  );
}
