// Pure helpers for search highlighting. They return plain text segments, never HTML:
// components render matches as <mark> and React escapes the text, so a query can't inject markup.

/** Longest query /search accepts; longer input is cut before searching or highlighting. */
export const MAX_QUERY_LENGTH = 100;

export type TextSegment = { text: string; match: boolean };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits `text` into segments, flagging every case-insensitive occurrence of `query`. */
export function splitMatches(text: string, query: string): TextSegment[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const pattern = new RegExp(`(${escapeRegExp(q)})`, "gi");
  // With one capture group, split() puts the matches at the odd indexes.
  return text
    .split(pattern)
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((segment) => segment.text !== "");
}

/** Trims, drops invisible format characters (bidi overrides, zero-width marks) and caps the length. */
export function normalizeQuery(raw: string): string {
  return raw.replace(/\p{Cf}/gu, "").trim().slice(0, MAX_QUERY_LENGTH).trim();
}

/** Rough Markdown → plain text, good enough for a search snippet (not for rendering). */
export function markdownToPlainText(markdown: string): string {
  return markdown
    // Keep code content (it's searchable on a dev blog), drop only the fences.
    .replace(/^```.*$/gm, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/\[![A-Z]+\]/g, "")
    .replace(/\[\^[^\]]+\]:?/g, "")
    // Emphasis delimiters only, so snake_case and 2*3 survive.
    .replace(/(\*{1,3}|_{1,3}|~~)(\S(?:.*?\S)?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** About `radius` characters of context on each side of the first match, with ellipses; null if no match. */
export function snippetAround(text: string, query: string, radius = 80): string | null {
  const q = query.trim().toLowerCase();
  const index = q ? text.toLowerCase().indexOf(q) : -1;
  if (index === -1) return null;
  let start = Math.max(0, index - radius);
  let end = Math.min(text.length, index + q.length + radius);
  // Snap to word boundaries so the snippet doesn't start or end mid-word.
  if (start > 0) start = text.indexOf(" ", start) + 1 || start;
  if (end < text.length) end = text.lastIndexOf(" ", end) > index + q.length ? text.lastIndexOf(" ", end) : end;
  return `${start > 0 ? "… " : ""}${text.slice(start, end).trim()}${end < text.length ? " …" : ""}`;
}
