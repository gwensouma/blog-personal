# Report: developer · round 1 · status: done

Task: `tasks/developer-r1.md`

## Summary
- Data first: `types/comment.ts`, pure `lib/comment-input.ts` and `lib/client-address.ts`, `lib/data/comments.ts`
  (store key `comments`, every check inside one `updateStore` call), `lib/actions/comments.ts`. Then the page fetches
  `getComments(slug)` in its `Promise.all`, `PostArticle` shows the count in the meta and `CommentSection` first in
  the ending column. `docs/product.md` and `.env.example` updated in the listed spots only.
- Design: an editorial thread, not cards. A hairline (`border-t`) at the section top, then a Fraunces h2 "Comments".
  Each comment is a row: the name as a small Fraunces byline (h3, `text-lg`), the date muted beside it, the body in
  Source Sans below. Hairline dividers between rows (`divide-y` + `border-b`). No avatars, no numbering.
- Form: shadcn `Field`/`Input`/`Textarea`/`Button`/`Spinner` (all already installed, nothing added). Name at
  `sm:max-w-sm`, the comment full width (`min-h-32`, grows with content), a hint under it ("Plain text, up to 2,000
  characters. Line breaks are kept; links and HTML show as typed. Your comment appears right away."), then the button
  and the message region under it. Success text is `text-primary` with a check that pops in (spring `pop`, JS submits
  only); errors are `text-destructive`.
- Motion (bold but small): the optimistic comment rises in on `spring.reveal` and its "Posting…" marker has a pulsing
  primary dot (`motion-safe:animate-pulse`, opacity only). Server-rendered rows don't animate, so nothing is hidden
  without JS. Reduced motion: `MotionConfig` drops the transforms and the pulse is `motion-safe` only.
- Progressive enhancement: until hydration `<form action>` is the `useActionState` dispatcher bound to the Server
  Action, so the SSR HTML carries Next's `$ACTION_*` fields and a no-JS POST works. After hydration
  (`useSyncExternalStore`, no effect) the action becomes a client wrapper that adds the optimistic comment and then
  dispatches the same action inside the form's transition, so the preview lasts until the response with its
  revalidated RSC payload lands. Smoke-tested with curl against `next start` (no-JS POST): stored and rendered,
  `<b>hi</b>` escaped, confirmation in the alert, count "1 comment", resubmit stored once, honeypot stored nothing,
  the POSTs added no view. **The JS path (optimistic preview, in-place update) is not browser-checked by me** (no
  working browser tool this session): the tester's e2e is the first real check.

### Interfaces added
```ts
// types/comment.ts
type Comment = { id: string; slug: string; name: string; body: string; createdAt: string; hidden: boolean };
type CommentFormState = { status: "idle" | "success" | "error"; message: string; name?: string; body?: string; field?: "name" | "body" };

// lib/comment-input.ts (pure)
const COMMENT_NAME_MAX_LENGTH = 50; const COMMENT_BODY_MAX_LENGTH = 2000;
function cleanCommentName(raw: string): string;
function cleanCommentBody(raw: string): string;
type CommentInputResult = { ok: true; name: string; body: string } | { ok: false; field: "name" | "body"; message: string };
function validateCommentInput(rawName: string, rawBody: string): CommentInputResult; // cleans, then checks name first

// lib/client-address.ts (pure)
function clientKeyFrom(forwardedFor: string | null, trustProxy: boolean): string | null;

// lib/data/comments.ts (server-only)
function getComments(slug: string): Promise<Comment[]>; // visible only, sorted by createdAt ascending
type AddCommentInput = { slug: string; name: string; body: string; clientKey: string | null; now?: Date };
type AddCommentResult = { status: "ok" | "duplicate" | "full" | "rate-limited" };
function addComment(input: AddCommentInput): Promise<AddCommentResult>; // expects already-cleaned name/body
function resetCommentLimitsForTests(): void; // throws unless process.env.VITEST

// lib/actions/comments.ts ("use server")
function addCommentAction(prev: CommentFormState, formData: FormData): Promise<CommentFormState>;
```

### Cleaning details (for the input tests)
Order: NFC; `\r\n`/`\r` → `\n`; tab → space; strip U+0000–U+0009, U+000B–U+001F, U+007F–U+009F, U+061C, U+200E,
U+200F, U+202A–U+202E, U+2066–U+2069; NFC again (removing a control can join a letter and a combining mark). Name:
`\n` is also removed (no space put in, as a browser text input does), then `\s+` → one space, trim. Body: `\n{3,}` →
`\n\n`, trim (spaces inside lines are kept). Length by `.length` after cleaning.
Examples run: name `"  Ann\t‮b\u0000ob \n x  "` → `"Ann bob x"`; body `"a\r\n\r\n\r\n\r\nb\u0085‏\tc\n"` →
`"a\n\nb c"`; body `"‮\u0007\n\n"` → empty → body error.

### Exact user-facing messages
- Success (ok, duplicate, honeypot): `Thanks, your comment is posted.`
- Name empty: `Enter your name (up to 50 characters).` · too long: `Your name is too long. Keep it to 50 characters.`
- Body empty: `Write a comment (up to 2000 characters).` · too long: `Your comment is too long. Keep it to 2000 characters.`
- Cap: `This post has reached its comment limit.`
- Rate limit: `Too many comments right now. Please try again in a few minutes.`
- Generic (non-string field, missing/empty slug, unknown slug): `Something went wrong. Please reload the page and try again.`
- Store write failed: `Couldn't save your comment. Please try again.` (logged; not reachable from user input)

### Limits and the rate-limit / X-Forwarded-For trade-off (for the lead's data rule)
- 500 stored comments per post, hidden included. 10-minute window everywhere ("recent" = `now - createdAt < 10 min`,
  so exactly 10:00 later is no longer recent).
- With `TRUST_PROXY=1` and a non-empty header: 5 stored per 10 minutes per right-most `X-Forwarded-For` entry. An
  appending proxy puts the client's own claim on the left, so only the right-most entry (the one that proxy added)
  is trusted. In-memory sliding window on `globalThis`, keyed by the SHA-256 hex of the address, recorded only when a
  comment is stored (and taken back if the write fails); lost on restart (acceptable: at most one extra burst). Old
  hits are pruned on every keyed call, so the map can't grow without bound.
- Otherwise (no `TRUST_PROXY`, or the header missing/all empty): 30 stored per 10 minutes site-wide, counted from
  stored `createdAt` across all posts (survives restarts). Comments posted with a key also count here.
- Duplicate (same slug, name and body after cleaning, hidden or not, within 10 minutes) is checked first: success, no
  copy, no rate-limit hit. Check order inside the update: duplicate, cap, rate limit, append.
- No IP or other personal data is stored. Next's default 1 MB Server Action body limit bounds the raw input size.

### Deviations to note
- A missing `website` field (hand-made POST) counts as an empty honeypot; a non-string `website` (a File) is a
  generic error. Missing `name`/`body` (null) are generic errors, as the task says.
- The action checks the honeypot before validation and the slug, so a bot gets success even for an unknown slug.

## Files
- `types/comment.ts`, `lib/comment-input.ts`, `lib/client-address.ts`, `lib/data/comments.ts`, `lib/actions/comments.ts` (new)
- `components/comments/comment-section.tsx`, `comment-list.tsx` (also exports the shared `CommentEntry` row the form
  reuses for the optimistic preview), `comment-form.tsx` (new)
- `app/(blog)/posts/[slug]/page.tsx`, `components/posts/post-article.tsx` (count + section; `post-meta.tsx` unchanged:
  its one `children` slot holds the views, a separator and the link)
- `docs/product.md`, `.env.example`

## Gate
- `npm run gate:fast` → exit 0 (159 tests).
- `npm run build` → exit 0. Route line: `● /posts/[slug]  10 kB  165 kB` (the ● is the generateStaticParams marker;
  the post pages are not in `prerender-manifest.json`, so they still render per request, as before).

## AC → test
DOM hooks: section `section#comments` (`aria-labelledby="comments-heading"`, h2 "Comments"); list `ol` > `li` >
`article` with the name in an `h3` and `time[dateTime]`; empty text "No comments yet."; count link `a[href="#comments"]`
with text "0 comments" / "1 comment" / "N comments" (one text node); optimistic item `[data-comment-pending]` with
`aria-busy="true"` and the text "Posting…" (U+2026), rendered after the `ol`, before the form; fields labelled "Name"
and "Comment"; button "Post comment" ("Posting" while pending, disabled); one `role="alert"` region in the form
(`tabindex="-1"`, empty when idle or pending); honeypot `input[name=website]` inside an `aria-hidden` wrapper.

| AC | Test or check | Result |
|---|---|---|
| AC1 | for the tester (e2e): section after the article footer and before Up next; 0 → "No comments yet."; 1 and many in createdAt order; line breaks kept (`\n` in body shows as a new line); `time[dateTime]` = ISO createdAt | gap |
| AC2 | e2e: count text 0/1/3 matches `#comments li` count; clicking jumps to `#comments` (heading not under sticky header); home/archive/tag/search have no "comment" count | gap |
| AC3 | e2e (JS): submit valid → `[data-comment-pending]` with "Posting…" appears, then a real `li`, count +1, both fields empty, no navigation (e.g. a window marker survives), focus on the alert with the success text | gap |
| AC4 | e2e `@no-js`: submit → full page with the new `li`, updated count and "Thanks, your comment is posted." in the alert | curl smoke pass; e2e gap |
| AC5 | e2e (JS and no-JS): empty name, whitespace-only name, empty body → alert message, `aria-invalid="true"` on that field, its `aria-describedby` includes the alert id, both values kept, count unchanged; JS: focus on the offending field | curl smoke pass (no-JS empty name); e2e gap |
| AC6 | unit: `validateCommentInput` 50 ok / 51 rejected, 2000 ok / 2001 rejected (also after trimming: 50 + spaces ok); e2e: `maxlength` 50/2000 and `required` on the inputs; raw POST/action call with 51 and 2001 rejected | curl smoke pass (2001) |
| AC7 | unit: each listed control/bidi char stripped from name and body; `\n` kept in body only; `\r\n`, tabs, NFC (`"é"` → `"é"`); body of only controls → empty error; 3+ newlines → 2; e2e: `<b>hi</b>` and `https://x.y` render as text, no `b` or `a` element inside the comment | curl smoke pass (escaped) |
| AC8 | unit (action, with `next/headers`/`next/cache` mocked) or e2e: `website` filled → success message, store unchanged | curl smoke pass |
| AC9 | unit: seed 500 (some hidden) on one slug via the store → `addComment` → `full`, store length still 500; another slug still ok | gap |
| AC10 | unit, `resetCommentLimitsForTests()` + `resetStoreForTests()` per test, step `now`: `clientKey: null` → 30 ok, 31st `rate-limited` (spread across slugs), ok again once the oldest is 10 min old; key "1.1.1.1": 5 ok, 6th `rate-limited`, key "2.2.2.2" ok; `clientKeyFrom("9.9.9.9, 1.1.1.1", true)` and `("8.8.8.8, 1.1.1.1", true)` give the same key; window slides at exactly +10 min; nothing stored on rejection. `clientKeyFrom`: null header, `""`, `" , "`, trailing comma, spaces, `trustProxy=false` → null | gap |
| AC11 | unit (action): missing slug, `slug=""`, unknown slug, a `File` for name/body/slug/website, missing name/body → generic error, no throw, store unchanged | gap |
| AC12 | e2e: after posting, a new browser context loads the post and sees it; JS: navigate away (client link) and back, comment is there | gap |
| AC13 | unit: seed a hidden comment → `getComments` omits it; e2e not needed (count derives from the same list) | gap |
| AC14 | e2e: read the views text before/after a JS submit and a no-JS submit; no increase beyond the page loads | curl smoke pass (POSTs added no view) |
| AC15 | unit: same slug/name/body twice → `ok` then `duplicate`, stored once; with a key, the duplicate doesn't use a hit (5 distinct + duplicates still allows the 5th); at `now + 10 min` the same text → `ok`; hidden duplicate still a duplicate; no-JS reload (repost) shows success and one item | curl smoke pass (stored once) |
| AC16 | grep: only `comment-form.tsx` has `"use client"` in `components/comments/`; no `Suspense` around the section/count; no `dangerouslySetInnerHTML`; `package.json` unchanged; keyboard: Tab reaches Name, Comment, button (honeypot skipped); widths 320/768/1280 light/dark incl. a 2000-char unbroken body and a 50-char unbroken name (no horizontal scroll) | gap |
| AC17 | e2e `@no-js`: list, count, form, field error and confirmation all render server-side | curl smoke pass |

## Open questions
- E2E budget: the honeypot, duplicate and error cases store nothing, but every successful post counts toward the
  site-wide 30 per 10 minutes on the e2e server (both projects, all workers, plus a CI retry).
