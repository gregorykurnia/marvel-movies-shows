// The timeline's universe filter (IMPLEMENTATION_PLAN §5.2, Phase 10). Every timeline item carries the universe it
// shows, so the rules are the same for events, recap items and time jump items. Pure, so it can be unit tested.

// The filter's value for items with no universe. It's also the URL value, ?universe=none.
export const NO_UNIVERSE = "none";

// Items with no universe are named by the choice "No universe set" in the filter.
export const NO_UNIVERSE_LABEL = "No universe set";

type WithUniverse = { universeName: string | null };

// Every universe name used by the items, once each, sorted by name. Items with no universe aren't listed here.
export function universeOptions(items: WithUniverse[]): string[] {
  const names = new Set<string>();
  for (const item of items) {
    if (item.universeName) names.add(item.universeName);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

// True when at least one item has no universe, which is when "No universe set" is worth offering.
export function hasUnsetUniverse(items: WithUniverse[]): boolean {
  return items.some((item) => item.universeName === null);
}

// Turns a requested filter (from the URL or the menu) into the one that applies. A name matches case-insensitively and
// resolves to the spelling in `names`. "none" is the no-universe choice, and only applies when `allowNone` is true.
// Anything else means no filter.
export function resolveUniverse(
  requested: string | null,
  names: string[],
  allowNone: boolean,
): string | null {
  if (requested === null) return null;
  if (requested === NO_UNIVERSE) return allowNone ? NO_UNIVERSE : null;
  const match = names.find(
    (name) => name.toLowerCase() === requested.toLowerCase(),
  );
  return match ?? null;
}

// Whether an item passes the filter. `null` means no filter, so every item passes.
export function matchesUniverse(
  item: WithUniverse,
  filter: string | null,
): boolean {
  if (filter === null) return true;
  if (filter === NO_UNIVERSE) return item.universeName === null;
  return (
    item.universeName !== null &&
    item.universeName.toLowerCase() === filter.toLowerCase()
  );
}
