import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7, "Character avatar": a 24px circle with an ink outline, the initial in display type, on a
// hero-colour fill. The colour is picked from the name, so each character keeps the same colour.
const fills = [
  "bg-red text-on-red",
  "bg-yellow text-on-yellow",
  "bg-blue text-on-blue",
  "bg-green text-on-green",
  "bg-violet text-on-violet",
  "bg-cyan text-on-cyan",
  "bg-orange text-on-orange",
] as const;

export function CharacterAvatar({ name, className }: { name: string; className?: string }) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border-2 border-line font-display text-xs leading-none font-extrabold",
        fills[hash % fills.length],
        className,
      )}
    >
      {initial}
    </span>
  );
}
