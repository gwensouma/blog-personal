// Cleaning and validation for comment input. Pure (no I/O, no React), so the Server
// Action, the form (for its maxLength and the optimistic preview) and unit tests share it.

/** Limits in UTF-16 code units (`.length`), the same unit the inputs' `maxLength` counts. */
export const COMMENT_NAME_MAX_LENGTH = 50;
export const COMMENT_BODY_MAX_LENGTH = 2000;

// C0 controls except \n, DEL, C1 controls, and the bidi/format controls that can reorder
// or disguise text (ALM, LRM, RLM, LRE/RLE/PDF/LRO/RLO, LRI/RLI/FSI/PDI).
const CONTROLS_EXCEPT_NEWLINE =
  /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

function normalize(raw: string): string {
  return raw.normalize("NFC").replace(/\r\n?/g, "\n").replace(/\t/g, " ");
}

/** NFC, newlines and tabs out, controls stripped, whitespace runs collapsed to one space, trimmed. */
export function cleanCommentName(raw: string): string {
  return (
    normalize(raw)
      // A name has no line breaks: drop them like the other controls (as a browser text input does).
      .replace(CONTROLS_EXCEPT_NEWLINE, "")
      .replace(/\n/g, "")
      // Removing a control can join a base letter and a combining mark; normalise again.
      .normalize("NFC")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** NFC, "\r\n"/"\r" to "\n", tabs to spaces, controls stripped (line breaks kept), 3+ newlines to two, trimmed. */
export function cleanCommentBody(raw: string): string {
  return normalize(raw).replace(CONTROLS_EXCEPT_NEWLINE, "").normalize("NFC").replace(/\n{3,}/g, "\n\n").trim();
}

export type CommentInputResult =
  | { ok: true; name: string; body: string }
  | { ok: false; field: "name" | "body"; message: string };

/** Cleans both fields, then checks their lengths. The name is checked first. */
export function validateCommentInput(rawName: string, rawBody: string): CommentInputResult {
  const name = cleanCommentName(rawName);
  const body = cleanCommentBody(rawBody);

  if (name.length === 0) {
    return { ok: false, field: "name", message: `Enter your name (up to ${COMMENT_NAME_MAX_LENGTH} characters).` };
  }
  if (name.length > COMMENT_NAME_MAX_LENGTH) {
    return { ok: false, field: "name", message: `Your name is too long. Keep it to ${COMMENT_NAME_MAX_LENGTH} characters.` };
  }
  if (body.length === 0) {
    return { ok: false, field: "body", message: `Write a comment (up to ${COMMENT_BODY_MAX_LENGTH} characters).` };
  }
  if (body.length > COMMENT_BODY_MAX_LENGTH) {
    return { ok: false, field: "body", message: `Your comment is too long. Keep it to ${COMMENT_BODY_MAX_LENGTH} characters.` };
  }
  return { ok: true, name, body };
}
