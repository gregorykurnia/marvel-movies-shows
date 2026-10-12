// A tag's name as it is stored: no leading "#", single spaces, at most 40 characters. Shared by the form (so the chip
// shows what will be saved) and the server (so every write is cleaned the same way). Empty means nothing to add.
export const TAG_MAX_LENGTH = 40;

export function cleanTagName(text: string): string {
  return text.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim().slice(0, TAG_MAX_LENGTH).trim();
}
