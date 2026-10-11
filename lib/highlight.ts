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
  return text
    .split(pattern)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, match: part.toLowerCase() === q.toLowerCase() }));
}

/** Rough Markdown → plain text, good enough for a search snippet (not for rendering). */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/\[![A-Z]+\]/g, "")
    .replace(/[*_~]+/g, "")
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
