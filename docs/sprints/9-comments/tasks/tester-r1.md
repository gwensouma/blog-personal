# Task: tester · round 1

<!-- docs/sprints/9-comments/tasks/tester-r1.md -->

Brief: `docs/sprints/9-comments/brief.md` · Branch: `feat/comments`
Report to: `docs/sprints/9-comments/reports/tester-r1.md` (format: `.claude/templates/report.md`)
Read first: `docs/sprints/9-comments/reports/developer-r1.md` (signatures, messages, DOM hooks, reset helper).

## Cover
Every AC in the brief has at least one test. Store tests follow `tests/unit/engagement.test.ts` (temp
`BLOG_DATA_DIR` per test, `resetStoreForTests()` plus `resetCommentLimitsForTests()` from `lib/data/comments.ts`, `next/headers` and
`next/cache` mocked where the action is called).

- **`tests/unit/comment-input.test.ts`** (AC6, AC7): boundaries 0/1/50/51 (name) and 0/1/2000/2001 (body) after
  cleaning; leading/trailing whitespace trimmed before the length check; NFC; `\r\n` and `\r` to `\n`, tabs to
  spaces; each stripped range (C0 except `\n` in the body, C1, DEL, U+061C, U+200E/F, U+202A–E, U+2066–9) removed;
  newlines removed from the name and whitespace collapsed; 3+ newlines collapsed to two; a body of only control/bidi
  characters is empty; `<b>hi</b>` and `https://x.y` pass through unchanged.
- **`tests/unit/client-address.test.ts`** (AC10): `trustProxy` false → null; true with null/empty/`" , "` → null;
  `"a, b, c"` → `"c"`; spaces trimmed; trailing empty entries skipped; changing left entries keeps the key.
- **`tests/unit/comments.test.ts`** (AC1, AC9, AC10, AC11, AC13, AC15, plus the action): `getComments` visible only,
  oldest first, unknown slug → `[]`; hidden comments (seed the store directly) not returned (AC13); 500 stored
  including hidden → `full`, nothing added (AC9); without a key the 31st site-wide in 10 minutes → `rate-limited`,
  across different slugs, and allowed again once the clock moves past the window; with keys the 6th from one key is
  rejected while another key posts (AC10); duplicate within 10 minutes → `duplicate`, stored once, not counted
  toward the rate limit, and stored again after 10 minutes (AC15); nothing stored on any rejection. Action
  (`addCommentAction` with a built `FormData`): honeypot filled → success, nothing stored (AC8); 51/2001 chars →
  error with `field` and the typed values echoed (AC5, AC6); missing/unknown slug and a `File` in place of a string
  → generic error, no throw (AC11); `revalidatePath` called with `/posts/<slug>` on `ok` only (AC12); with
  `TRUST_PROXY=1` and mocked `x-forwarded-for`, rotating left entries doesn't reset the limit (AC10).
- **`tests/e2e/comments.spec.ts`**, JS project: section after the article footer and before Up next, "No comments
  yet." and "0 comments" on a fresh post (AC1, AC2); post → "Posting…" item visible at once, then a normal list item,
  count +1, form empty, no navigation (assert e.g. a `window` marker survives) (AC3); empty and too-long submits (bypass
  `maxLength`/`required` by removing the attributes or posting raw) show the alert, `aria-invalid`, kept values, count
  unchanged (AC5, AC6); `<b>hi</b>` and `https://x.y` render as text with no `<b>` or `<a>` in the item (AC7); a
  new browser context sees the comment, and leaving and coming back via client navigation shows it (AC12); the view
  count does not go up after posting (AC14); line breaks kept; keyboard-only submit (AC16); no other page (home,
  `/posts`, a tag page, `/search`) shows "comment" counts (AC2); at 320px the section has no horizontal overflow with
  a long unbroken body (AC16).
- **`@no-js`**: list, count and form render; a valid submit returns a page with the comment, the updated count and
  the confirmation (AC4, AC17); an invalid submit shows the alert and keeps the typed values (AC5); a reload/resubmit
  of the same text stores it once (AC15); posting adds no view (AC14).
- **Budget:** the e2e server has no `TRUST_PROXY`, so plan at most 14 stored comments per run across both projects
  (a full CI retry must stay under the site-wide 30). Use a distinct post per test (or per describe) so parallel
  workers don't change each other's counts, and unique body text so the duplicate rule doesn't merge them. Wait on
  state, never on time. List the budget in the report.
- Add any edge case the developer report lists and any nobody listed (abuse, boundaries, no-JS).

## Files you may change
- `tests/unit/comment-input.test.ts`, `tests/unit/client-address.test.ts`, `tests/unit/comments.test.ts`,
  `tests/e2e/comments.spec.ts`, and `tests/e2e/helpers.ts` only for a shared helper.

## Acceptance criteria this task serves
AC1–AC15, AC17 by test; AC16 in part (keyboard, 320px, no `dangerouslySetInnerHTML` is the reviewer's).

## Done when
- `npm test` and `npm run test:e2e` run in full, with exit codes in the report.
- The report maps each AC → test, gives the comment budget, and lists defects as must-fix / suggestion with the
  suspected file. No `.skip`/`.fixme`/`.only`.
