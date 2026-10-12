// The theme choice is remembered in localStorage (DESIGN_GUIDE §11). Every read and write is wrapped in try/catch,
// because storage can be blocked (private windows) and then the page simply follows the system setting.
export const THEME_STORAGE_KEY = "marvel-directory-theme";

export type Theme = "light" | "dark";

export function readSavedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function applySavedTheme() {
  const saved = readSavedTheme();
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
  }
}

// Runs before first paint, as a plain inline script, so a saved dark or light theme never flashes.
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
