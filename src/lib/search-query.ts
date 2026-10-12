// Turns what someone types into a Postgres tsquery in which every word is a prefix match, so "avenge" finds
// "Avengers" while the word is still being typed. Only letters and digits get through, so the result is always safe
// to pass to to_tsquery. Returns null when there is nothing to search for, or only one letter.
export function toPrefixQuery(input: string): string | null {
  const words = input.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.join("").length < 2) return null;
  return words.map((word) => `${word}:*`).join(" & ");
}
