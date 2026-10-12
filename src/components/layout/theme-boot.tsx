"use client";

import { useEffect } from "react";

import { applySavedTheme, themeInitScript } from "@/lib/theme";

// Applies the saved theme twice. The inline script paints in the right theme on first load. The effect covers
// pages that hydrate or re-render without running the script again. The script uses the type trick from the
// Next guide "Preventing flash before hydration", so React doesn't run a client-created script.
export function ThemeBoot() {
  useEffect(() => {
    applySavedTheme();
  }, []);

  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  );
}
