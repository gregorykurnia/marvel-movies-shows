// Reads FormData as plain strings. For repeated fields (multi-selects), use formData.getAll instead.
export function formStrings(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}
