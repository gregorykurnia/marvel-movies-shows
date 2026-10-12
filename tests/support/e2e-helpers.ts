import type { Page } from "@playwright/test";

// After a client navigation, Next keeps the previous page mounted but hidden, so going back is instant. Lookups by
// label match the hidden copy too, so each one keeps only the visible match.
export function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}
