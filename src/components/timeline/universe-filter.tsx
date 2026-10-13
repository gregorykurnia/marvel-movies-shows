"use client";

import { FilterMenu } from "@/components/ui/filter-menu";
import { NO_UNIVERSE, NO_UNIVERSE_LABEL } from "@/lib/timeline-filter";

// A universe filter for the timeline (IMPLEMENTATION_PLAN §5.2, Phase 10). It lists the universes the timeline uses,
// and "No universe set" last when some item has none. The ✕ clears it. Built on the same filter chip as the tag filter.
export function UniverseFilter({
  value,
  names,
  includeNone,
  onChange,
}: {
  value: string | null;
  names: string[];
  includeNone: boolean;
  onChange: (universe: string | null) => void;
}) {
  const options = [
    ...names.map((name) => ({ value: name, label: name })),
    ...(includeNone ? [{ value: NO_UNIVERSE, label: NO_UNIVERSE_LABEL }] : []),
  ];
  return (
    <FilterMenu
      label="Universe"
      value={value}
      options={options}
      onChange={onChange}
    />
  );
}
