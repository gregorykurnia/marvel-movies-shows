// Words shown for the fixed choices, so the chip, the form and the table always agree (PRODUCT_PLAN §2.3).
export function importanceLabel(importance: "major" | "minor"): string {
  return importance === "major" ? "★ Major" : "Minor";
}

export function statusLabel(status: "alive" | "deceased" | "unknown"): string {
  if (status === "alive") return "Alive";
  if (status === "deceased") return "Deceased";
  return "Unknown";
}
