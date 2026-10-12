"use client";

import { Combobox } from "@/components/ui/combobox";
import { RemovableChip } from "@/components/ui/removable-chip";
import { cleanTagName } from "@/lib/tag-name";
import { cn } from "@/lib/utils";

// Tags for a form (DESIGN_GUIDE §7 and IMPLEMENTATION_PLAN §5.4). A combobox adds an existing tag, or creates one on
// the fly with "＋ Add “…”". Chosen tags show as chips with a ✕. They're sent as repeated hidden fields, named
// `tagName`. A tag matches case-insensitively, so a new one that differs only in case is the existing one.
export function TagInput({
  label,
  value,
  onChange,
  options,
  hint,
  error,
  className,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: string[];
  hint?: string;
  error?: string;
  className?: string;
}) {
  const chosen = new Set(value.map((tag) => tag.toLowerCase()));
  const remaining = options.filter((name) => !chosen.has(name.toLowerCase()));

  function add(text: string) {
    const name = cleanTagName(text);
    if (!name || chosen.has(name.toLowerCase())) return;
    onChange([...value, name]);
  }

  return (
    <div className={cn("grid min-w-0 gap-3", className)}>
      <Combobox
        label={label}
        placeholder="Type a tag…"
        options={remaining.map((name) => ({ value: name, label: `#${name}`, mono: true }))}
        value={null}
        onValueChange={(next) => {
          if (next) add(next);
        }}
        onCreate={add}
        hint={hint}
        error={error}
      />
      {value.length > 0 ? (
        <ul aria-label={`${label}, chosen`} className="flex min-w-0 flex-wrap gap-2">
          {value.map((tag) => (
            <li key={tag} className="min-w-0 max-w-full list-none">
              <RemovableChip
                removeLabel={`Remove tag ${tag}`}
                onRemove={() => onChange(value.filter((candidate) => candidate !== tag))}
              >
                <span className="font-mono text-xs">#{tag}</span>
              </RemovableChip>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-3">No tags yet.</p>
      )}
      {value.map((tag) => (
        <input key={tag} type="hidden" name="tagName" value={tag} />
      ))}
    </div>
  );
}
