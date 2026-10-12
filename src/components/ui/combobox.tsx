"use client";

import {
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import { FieldShell } from "./field";

// DESIGN_GUIDE §7. A text input with a popover list. Used for every "pick one" field in forms.
// Follows the ARIA combobox pattern: arrows move, Enter picks, Escape closes.
// Optional "Add" row (violet, below a dashed divider) creates a new value inline.
export type ComboOption = { value: string; label: string; mono?: boolean };

type ComboboxProps = {
  label: ReactNode;
  options: ComboOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  onCreate?: (text: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  // Controls the list. Left undefined, the component manages it. The styleguide uses this to show the open state.
  open?: boolean;
  className?: string;
};

type Item =
  | { kind: "option"; option: ComboOption }
  | { kind: "create"; text: string };

export function Combobox({
  label,
  options,
  value,
  onValueChange,
  onCreate,
  placeholder,
  hint,
  error,
  open: openProp,
  className,
}: ComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [openState, setOpenState] = useState(false);
  const [active, setActive] = useState(0);

  const isOpen = openProp ?? openState;
  const selected = options.find((option) => option.value === value) ?? null;
  const shownText = editing ? query : (selected?.label ?? "");

  const needle = query.trim().toLowerCase();
  const matches = editing && needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options;
  const exact = options.some((option) => option.label.toLowerCase() === needle);
  const canCreate = Boolean(onCreate) && editing && needle.length > 0 && !exact;

  const items: Item[] = [
    ...matches.map((option): Item => ({ kind: "option", option })),
    ...(canCreate ? [{ kind: "create", text: query.trim() } as Item] : []),
  ];
  const activeIndex = items.length === 0 ? -1 : Math.min(active, items.length - 1);
  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;

  function optionId(index: number) {
    return `${id}-option-${index}`;
  }

  function choose(item: Item) {
    if (item.kind === "create") {
      onCreate?.(item.text);
    } else {
      onValueChange(item.option.value);
    }
    setEditing(false);
    setOpenState(false);
    setQuery("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpenState(true);
      setActive((current) => (items.length ? (current + 1) % items.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpenState(true);
      setActive((current) =>
        items.length ? (current - 1 + items.length) % items.length : 0,
      );
    } else if (event.key === "Enter" && isOpen && activeItem) {
      event.preventDefault();
      choose(activeItem);
    } else if (event.key === "Escape" && isOpen) {
      // Close the list only, not an enclosing dialog.
      event.stopPropagation();
      setOpenState(false);
      setEditing(false);
    }
  }

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={shownText}
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-message` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setEditing(true);
            setOpenState(true);
            setActive(0);
          }}
          onFocus={() => setOpenState(true)}
          onBlur={() => {
            // Picking an option keeps focus on the input (onMouseDown prevents blur), so blur means "done".
            setOpenState(false);
            setEditing(false);
          }}
          onKeyDown={onKeyDown}
          className="min-h-11 w-full rounded-input border-2 border-line bg-surface px-3.5 py-2.5 font-body text-[15px] font-medium text-ink transition-[box-shadow,border-color] duration-token ease-token placeholder:text-ink-3 focus:border-blue focus:shadow-[0_0_0_4px_var(--blue-soft),3px_3px_0_var(--blue)] focus:outline-none aria-[invalid=true]:border-red aria-[invalid=true]:shadow-[0_0_0_4px_var(--red-soft)]"
        />
        {isOpen ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={typeof label === "string" ? label : undefined}
            className="absolute inset-x-0 top-full z-30 mt-1.5 rounded-input border-2 border-line bg-surface p-1.5 shadow-float"
          >
            {items.length === 0 ? (
              <li className="px-2.5 py-2 text-sm text-ink-3">No matches</li>
            ) : null}
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              const isCreate = item.kind === "create";
              return (
                <li
                  key={isCreate ? "create" : item.option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm font-medium",
                    isActive && "bg-blue-soft font-bold text-blue-ink",
                    isCreate &&
                      "mt-1 rounded-none border-t-[1.5px] border-dashed border-line-soft pt-2.5 font-bold text-violet-ink",
                    isCreate && isActive && "bg-blue-soft text-violet-ink",
                  )}
                >
                  {isCreate ? (
                    <span>＋ Add “{item.text}”</span>
                  ) : (
                    <>
                      <span className={cn(item.option.mono && "font-mono")}>
                        {item.option.label}
                      </span>
                      {isActive ? <span aria-hidden>↵</span> : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </FieldShell>
  );
}
