"use client";

import { FilterMenu } from "@/components/ui/filter-menu";

// A tag filter for a list (DESIGN_GUIDE §7, "Filter chip"). Choosing a tag narrows the list. The ✕ clears it.
export function TagFilter({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: string[];
  onChange: (tag: string | null) => void;
}) {
  return (
    <FilterMenu
      label="Tag"
      value={value}
      options={options.map((name) => ({ value: name, label: `#${name}` }))}
      onChange={onChange}
    />
  );
}
