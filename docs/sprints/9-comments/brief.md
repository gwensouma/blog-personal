# Sprint 9: comments

Branch: `feat/comments` · Spec: `docs/specs/comments.md` (approved 2026-10-20) · Roadmap row: 9 (phase D) ·
Decisions: D-007, D-016, D-018, D-022, D-024

## Goal
A reader can post a comment (name and body, no account) at the end of any post; it shows at once in a flat,
server-rendered list and in the count in the post meta, with JS (in place, optimistic) and without JS (full-page
POST). RSC lesson: a mutation through a Server Action with progressive enhancement, `revalidatePath` carrying the
fresh RSC payload back in the action's response. Hiding comments from `/admin` is sprint 10; the data model already
has `hidden`.

## Acceptance criteria
- AC1: Every post page has a "Comments" section (`#comments`) after the article footer and before Up next. It lists
  visible comments oldest first, each with the name, the date (`<time dateTime>`) and the body with its line breaks.
  With none it says "No comments yet."
- AC2: The post meta shows the visible-comment count ("0 comments", "1 comment", "3 comments") as a link to
  `#comments`; it always matches the number of list items. No other page shows a comment count.
- AC3 (JS): submitting a valid name and body shows the comment at the end of the list at once, marked as posting;
  after the response it is a normal list item, the count has gone up, the form is empty, and the page did not reload.
- AC4 (no JS): the same submit is a full-page POST; the returned page shows the new comment in the list, the updated
  count and a confirmation message.
- AC5: An empty or too long name or body is rejected with a message in a `role="alert"` region; the offending field
  has `aria-invalid`, the typed name and body are kept, and nothing is stored. Same with JS off.
- AC6: Limits: name 1–50 and body 1–2000 characters after cleaning and trimming. The inputs carry `required` and
  `maxLength` 50/2000, but the server enforces the limits too (a raw POST of 51/2001 characters is rejected).
- AC7: Control and bidi characters (list in the spec's Design) are removed before storing and checking the length; a
  body of only such characters counts as empty. `<b>hi</b>` and `https://x.y` render as literal text: no HTML, no link.
- AC8: A submit with the honeypot filled gets the normal success message but stores nothing.
- AC9: A post with 500 stored comments (hidden ones included) rejects the next one with "This post has reached its
  comment limit." and stores nothing.
- AC10: Without `TRUST_PROXY=1` (or with it but no `X-Forwarded-For`), the 31st comment site-wide within 10 minutes
  is rejected with "Too many comments right now. Please try again in a few minutes." With `TRUST_PROXY=1`, the 6th
  comment within 10 minutes from the same right-most `X-Forwarded-For` address is rejected with the same message,
  while another address can still post; changing only the left-most entries does not reset the limit. Checked in
  unit tests with the injectable clock; nothing is stored on rejection.
- AC11: A missing or unknown slug, or non-string form fields, return a generic error state (no 500, nothing stored).
- AC12: After a comment is posted, a fresh load in another browser context shows it, and with JS, leaving the post
  and coming back shows it (the action calls `revalidatePath` for the post).
- AC13: A comment stored with `hidden: true` is neither rendered nor counted.
- AC14: Posting a comment, with or without JS, does not add a view.
- AC15: Resubmitting the same name and body on the same post within 10 minutes (e.g. a no-JS reload) gets the normal
  success message and the comment is stored once; it does not count against the rate limit. After 10 minutes the
  same text is stored as a new comment.
- AC16: Only `CommentForm` is `"use client"`; no `<Suspense>` wraps the section or the count; no
  `dangerouslySetInnerHTML`; no new dependency. The form has visible labels, works by keyboard, and the section works
  at 320/768/1280 px in light and dark.
- AC17: No JS: the list, the count and the form (with its errors and confirmation) all work.

## Files in scope, by owner
- developer: `types/comment.ts`, `lib/comment-input.ts`, `lib/client-address.ts`, `lib/data/comments.ts`,
  `lib/actions/comments.ts`, `app/(blog)/posts/[slug]/page.tsx`, `components/comments/comment-section.tsx`,
  `components/comments/comment-list.tsx`, `components/comments/comment-form.tsx`, `components/posts/post-article.tsx`,
  `components/posts/post-meta.tsx` (only if the count needs a second slot); docs: `docs/product.md` (post page, "What
  it is", non-goals) and `.env.example` (`TRUST_PROXY`).
- tester: `tests/unit/comment-input.test.ts`, `tests/unit/client-address.test.ts`, `tests/unit/comments.test.ts`,
  `tests/e2e/comments.spec.ts` (JS and `@no-js`).
- reviewer: none (report only).
- lead (not in a task): `.claude/rules/data.md` (comment limits under "Accepted abuse limits"); `docs/decisions.md`
  (D-024 is already written).

## Constraints
- Server-first: the list and section are Server Components rendered inline; `CommentForm` is the only client leaf.
  No `<Suspense>`, no `loading.tsx`, no client fetch. The post route's rendering mode does not change (D-016, D-018).
- Every action is a public endpoint: the server validates types, lengths, slug existence, the honeypot, the cap and
  the rate limits; the form's `required`/`maxLength` are only a convenience. User text renders as React text.
- Limits (D-024): 500 per post (hidden included); 5 per 10 minutes per right-most `X-Forwarded-For` address with
  `TRUST_PROXY=1`, else 30 per 10 minutes site-wide; a same-post, same-name-and-body resubmit within 10 minutes is a
  success without a second copy. No IP or other personal data is stored.
- Count on the post page only (D-024). No new dependency. English only. No `docs/comments.md` or other feature note
  (D-022): the limits trade-off goes in a code comment and the developer's report. `docs/product.md` is a living doc:
  no dates or sprint numbers in it.
- E2E budget: the e2e server has no `TRUST_PROXY`, so one run (both projects, all workers, plus CI's one retry) must
  store fewer than 30 comments in total or the site-wide guard trips.
- The Playwright MCP fails to connect this session: the reviewer checks no-JS and widths with curl, by reading the
  code and through the tester's e2e results.

## Task order
1. `tasks/developer-r1.md`
2. `tasks/tester-r1.md` (after the developer report)
3. `tasks/reviewer-r1.md` (after the tester report)
