"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. A 42px pill with a magnifier and a ⌘K hint (the hint is hidden on phones). Submitting goes to
// /search. ⌘K (or Ctrl+K) and "/" focus the box from any page. "/" is ignored while typing in another field.
export function SearchBox({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const input = inputRef.current;
      if (!input) return;
      const commandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target);
      if (!commandK && !slash) return;
      event.preventDefault();
      input.focus();
      input.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      role="search"
      action="/search"
      className={cn(
        "flex h-[42px] min-w-0 items-center gap-2.5 rounded-pill border-2 border-line bg-surface py-0 pr-2 pl-3.5 transition-[box-shadow,border-color] duration-token ease-token focus-within:border-blue focus-within:shadow-[0_0_0_4px_var(--blue-soft),3px_3px_0_var(--blue)]",
        className,
      )}
    >
      <Search aria-hidden strokeWidth={2.5} className="size-[18px] shrink-0 text-ink-2" />
      <label htmlFor="site-search" className="sr-only">
        Search
      </label>
      <input
        ref={inputRef}
        id="site-search"
        name="q"
        type="search"
        placeholder="Search…"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent font-body text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none"
      />
      <kbd className="shrink-0 rounded-md border-[1.5px] border-line-soft bg-surface-2 px-1.5 py-1.5 font-mono text-[11px] leading-none font-bold text-ink-3 max-[860px]:hidden">
        ⌘K
      </kbd>
    </form>
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
