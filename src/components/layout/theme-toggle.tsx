"use client";

import { SunMoon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function currentTheme(): "light" | "dark" {
  const attribute = document.documentElement.getAttribute("data-theme");
  if (attribute === "light" || attribute === "dark") return attribute;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Flips between light and dark, and remembers the choice. The system setting applies until the first click.
// Reads the theme from the DOM when clicked, so the icon never mismatches server markup.
export function ThemeToggle() {
  function toggle() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private window). The theme still switches for this visit.
    }
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={toggle}
      aria-label="Toggle light or dark theme"
      title="Toggle light or dark theme"
      className="shrink-0"
    >
      <SunMoon aria-hidden strokeWidth={2.25} className="size-5" />
    </Button>
  );
}
