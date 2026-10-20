# Spec: comments

Status: approved by the user on 2026-10-20 · Roadmap: phase D, sprint 9 (`feat/comments`) · Author: planner · Refreshed 2026-10-20 (D-018, D-020, D-022, D-023, user answers)

## Problem
A reader who finishes a post can like it or share it, but can't say anything about it, and the owner gets no
feedback. The user decided (D-007; plan in "Sprint 10 plan" below) that readers post a comment with a name only, it shows at
once in a flat list, and the owner hides bad ones later from `/admin` (sprint 10). This sprint ships posting and
reading; the data model already carries `hidden` so sprint 10 adds no migration.

## RSC lesson
**A mutation through a Server Action, with progressive enhancement.** The list is a Server Component rendered inline
from the store; the form is the only client leaf. The same `<form action={formAction}>` works as a plain POST with JS
off and as an in-place update with JS on (`useActionState` for the result, `useOptimistic` to show the comment before
the server answers). `revalidatePath` inside the action makes the action's response carry the fresh RSC payload, so
the server-rendered list and count update without any client fetch. Secondary: every action is a public endpoint, so
validation, caps and rate limits live on the server, not in the form.

## Research
- **Store:** `lib/data/store.ts:87` `readStore` / `:92` `updateStore` (per-key file, serialized writes, cache on
  `globalThis` `:34`; `resetStoreForTests` `:112` for unit tests). Re-check a cap inside the update, as
  `lib/data/newsletter.ts:25-33` does; its hard cap `:9` is the pattern for the 500-per-post cap.
- **Action shape:** `lib/actions/newsletter.ts:12` (`useActionState` signature, returns a state object, never throws
  for user errors); state type `types/engagement.ts:11`. `lib/actions/engagement.ts:10` checks the slug exists with
  `getPost(slug)`.
- **Form pattern:** `components/newsletter/newsletter-form.tsx`: always-present `role="alert"` (`:122`) emptied while
  pending (`:46-47`), `defaultValue` from the state keeps typed text after an error (`:111`), focus to the field on
  error and to the confirmation on success (`:52-53`). Copy it; don't invent a second pattern. `useOptimistic` is
  already used in `components/posts/like-button.tsx:36`.
- **Post page:** `app/(blog)/posts/[slug]/page.tsx:49` fetches in one `Promise.all`; add comments there.
  `components/posts/post-article.tsx:110-117` is the article footer (likes, share), `:127-139` the ending
  (Up next, newsletter, prev/next, related). `components/posts/post-meta.tsx:32-35` has one trailing `children` slot,
  today holding the streamed view count (`post-article.tsx:57-61`).
- **Rendering mode (D-016, D-018):** today the like cookie makes `/posts/[slug]` render per request, so reading the
  store inline adds no rendering cost; rendered Markdown is memoised per slug, so the re-render after a comment does
  not re-run Shiki. Sprint 11 makes the route static (ISR) again. Reading the store is not a dynamic API, so this
  design holds there unchanged: the list is part of the cached page and the action's `revalidatePath` is what
  refreshes it (D-018 names comments as the reason). Neither mode needs a Suspense boundary.
- **Views:** `components/posts/post-engagement.tsx:28-29` skips requests with `next-action` or `content-type`, so
  neither a JS nor a no-JS comment POST counts as a view. Keep it that way (sprint 11 moves view recording to the
  client, D-018; AC14 must still hold then).
- **Dates:** `lib/format.ts:10` `formatDate` (UTC, "October 16, 2026") and `components/posts/post-date.tsx`.
- **Tests:** `tests/unit/engagement.test.ts` shows the store isolation (temp `BLOG_DATA_DIR` per test,
  `resetStoreForTests`, `next/headers` mocked). `playwright.config.ts:51` wipes `.data-e2e` per server start, so
  posted comments never leak between runs; the e2e server has no `TRUST_PROXY`, so one run must post fewer than 30
  comments in total across all workers or the site-wide guard trips (AC10).
- Docs: [Server Actions and mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
  (progressive enhancement, `revalidatePath` in an action returns the updated UI in the same round trip),
  [useActionState](https://react.dev/reference/react/useActionState), [useOptimistic](https://react.dev/reference/react/useOptimistic),
  [`headers()`](https://nextjs.org/docs/app/api-reference/functions/headers). On `X-Forwarded-For`, MDN
  ([link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For)) warns the left-most entry is
  client-controlled; see Answer 1.

## Options
| Option | How | Cost | Risk |
|---|---|---|---|
| A | `CommentList` RSC inline; `CommentForm` client leaf renders the optimistic comment(s) just above itself, so it reads as the end of the list | small; one client file | the optimistic item sits in its own element after the list (visual, not DOM, continuity) |
| B | A client `CommentThread` owns the list and `useOptimistic` over it; the page passes comments as props | medium | list rendering moves to the client bundle: against server-first |
| C | Comments in their own `<Suspense>` streamed after the article | small | the section is essential content; D-011's reasoning applies, and the count in the meta would need a second boundary |

Recommendation: **A**. The list stays a Server Component and the only client code is the form, exactly the "smallest
leaf" rule. Since the list is oldest first and the form follows it, a pending comment shown at the top of the form
component lands where the real one will appear.

## Answers from the user (2026-10-20)
The user accepted all four defaults.
1. **`X-Forwarded-For` with `TRUST_PROXY=1`:** the **right-most** entry (the address the one trusted proxy saw), not
   the left-most the D-007 plan named: with an appending proxy (nginx `$proxy_add_x_forwarded_for`) the left-most
   entry is whatever the client sent, so a spammer could rotate it freely.
2. **Per-address limit:** **5 comments per 10 minutes per address** (with `TRUST_PROXY=1`).
3. **Duplicate resubmit** (a no-JS reload re-POSTs the form): the same name and body on the same post within
   10 minutes is answered as a success without storing a second copy.
4. **Counts elsewhere:** the count shows **only on the post page**, not on home, archive or tag lists (those are ISR
   pages and would need extra revalidation).

## Scope
- In: `types/comment.ts`, `lib/data/comments.ts`, `lib/actions/comments.ts`, two pure helpers (input cleaning,
  client address), the comments section on the post page, the count in the post meta, unit and e2e tests; the
  lead's doc updates (product.md, `.claude/rules/data.md`, a decisions entry, `.env.example`).
- Out (sprint 10): `/admin`, login, hide/unhide, `ADMIN_*` env. Also out: replies, Markdown or links in comments,
  editing or deleting by the commenter, email notifications, comment counts on lists (Answer 4).

## Design
- **Type** (`types/comment.ts`): `Comment = { id, slug, name, body, createdAt, hidden }` (`id` from `randomUUID`,
  `createdAt` ISO). No IP or other personal data is stored. `CommentFormState` = idle | success | error with
  `message`, the typed `name`/`body`, and an optional `field: "name" | "body"`.
- **Data** (`lib/data/comments.ts`, server-only, store key `comments`: `Record<slug, Comment[]>`):
  `getComments(slug)` returns visible comments, oldest first; `addComment({ slug, name, body, clientKey, now? })`
  (`clientKey: string | null`, `now` injectable for tests, default the current time) returns a result union
  (`ok` | `duplicate` | `full` | `rate-limited`). Inside the serialized update, in this order: **duplicate** (same
  slug, name and body, hidden or not, within 10 minutes: Answer 3; checked first so a reload is never rejected),
  **cap** (500 stored per post, hidden included), **rate limit**, then store.
  - Rate limit with a `clientKey` (Answers 1, 2): 5 per 10 minutes per address, an in-memory sliding window on
    `globalThis` (like the store's cache) keyed by a SHA-256 hash of the address. It is lost on restart.
  - Without a `clientKey` (no `TRUST_PROXY=1`, or the header is missing): the site-wide flood guard, 30 per
    10 minutes, counted from stored `createdAt` values (survives restarts, no extra state).
  - The trade-off (why right-most, why in-memory, what a restart or a missing header does) goes in a short comment
    next to the limit constants and in the developer's report, not in a separate doc.
- **Client address** (`lib/client-address.ts`, pure): `clientKeyFrom(forwardedFor: string | null, trustProxy:
  boolean): string | null` returns the trimmed right-most non-empty `X-Forwarded-For` entry when `trustProxy`, else
  null. Pure so it is unit-tested without a request, and sprint 10's login throttle reuses it.
- **Input helper** (`lib/comment-input.ts`, pure): normalise to NFC; turn `\r\n`/`\r` into `\n`, tabs into spaces;
  strip C0/C1 controls (except `\n` in the body), DEL, and bidi/format controls U+061C, U+200E, U+200F,
  U+202A–U+202E, U+2066–U+2069; collapse the name's whitespace to single spaces; collapse 3+ newlines in the body to
  two; trim; then check the length (`.length`, matching the inputs' `maxLength`).
- **Action** (`lib/actions/comments.ts`, `addCommentAction(prev, formData)`): reads `slug`, `name`, `body` and the
  honeypot from `formData` (strings only), checks the honeypot, cleans and validates, checks the slug with
  `getPost(slug)`, derives the client key from `headers()` via `clientKeyFrom(…, process.env.TRUST_PROXY === "1")`,
  calls `addComment`, then `revalidatePath(\`/posts/${slug}\`)` on `ok`. `ok` and `duplicate` both answer the same
  success message. Never throws for user input.
- **UI** (`components/comments/`): `CommentSection` (server: `<section id="comments" aria-labelledby>`, heading, list,
  form), `CommentList` (server: `<ol>` of `<article>`s with name, `<time>` via `formatDate`, body as React text in a
  `whitespace-pre-line` block, `[overflow-wrap:anywhere]`), `CommentForm` (`"use client"`). The section goes right
  after the article, before Up next (`post-article.tsx:127-130`), inside the reading column. The honeypot is a text
  input named `website` in a wrapper that is visually hidden off-screen, `aria-hidden`, `tabIndex={-1}`,
  `autoComplete="off"`.
- **Count** (post page only, Answer 4): `page.tsx` fetches `getComments(slug)` alongside the post and passes the list
  to `PostArticle`; the meta shows "N comments" ("1 comment", "0 comments") as a link to `#comments`, inline (no
  Suspense), next to the views. Home, archive, tag and search lists are unchanged.

## Acceptance criteria
- AC1: Every post page has a "Comments" section (`#comments`) after the article footer and before Up next. It lists
  visible comments oldest first, each with the name, the date (`<time dateTime>`) and the body with its line breaks.
  With none it says "No comments yet."
- AC2: The post meta shows the visible-comment count ("0 comments", "1 comment", "3 comments") as a link to
  `#comments`; it always matches the number of list items. No other page shows a comment count (Answer 4).
- AC3 (JS): submitting a valid name and body shows the comment at the end of the list at once, marked as posting;
  after the response it is a normal list item, the count has gone up, the form is empty, and the page did not reload.
- AC4 (no JS): the same submit is a full-page POST; the returned page shows the new comment in the list, the updated
  count and a confirmation message.
- AC5: An empty or too long name or body is rejected with a message in a `role="alert"` region; the offending field
  has `aria-invalid`, the typed name and body are kept, and nothing is stored. Same with JS off.
- AC6: Limits: name 1–50 and body 1–2000 characters after cleaning and trimming. The inputs carry `required` and
  `maxLength` 50/2000, but the server enforces the limits too (a raw POST of 51/2001 characters is rejected).
- AC7: Control and bidi characters (list in Design) are removed before storing and checking the length; a body of
  only such characters counts as empty. `<b>hi</b>` and `https://x.y` render as literal text: no HTML, no link.
- AC8: A submit with the honeypot filled gets the normal success message but stores nothing.
- AC9: A post with 500 stored comments (hidden ones included) rejects the next one with "This post has reached its
  comment limit." and stores nothing.
- AC10: Without `TRUST_PROXY=1` (or with it but no `X-Forwarded-For`), the 31st comment site-wide within 10 minutes
  is rejected with "Too many comments right now. Please try again in a few minutes." With `TRUST_PROXY=1`, the 6th
  comment within 10 minutes from the same right-most `X-Forwarded-For` address is rejected with the same message,
  while another address can still post; changing only the left-most entries does not reset the limit (Answers 1,
  2). Checked in unit tests with the injectable clock; nothing is stored on rejection.
- AC11: A missing or unknown slug, or non-string form fields, return a generic error state (no 500, nothing stored).
- AC12: After a comment is posted, a fresh load in another browser context shows it, and with JS, leaving the post
  and coming back shows it (the action calls `revalidatePath` for the post).
- AC13: A comment stored with `hidden: true` is neither rendered nor counted.
- AC14: Posting a comment, with or without JS, does not add a view.
- AC15: Resubmitting the same name and body on the same post within 10 minutes (e.g. a no-JS reload) gets the normal
  success message and the comment is stored once; it does not count against the rate limit. After 10 minutes the
  same text is stored as a new comment (Answer 3).
- AC16: Only `CommentForm` is `"use client"`; no `<Suspense>` wraps the section or the count; no `dangerouslySetInnerHTML`;
  no new dependency. The form has visible labels, works by keyboard, and the section works at 320/768/1280 px in light
  and dark.
- AC17: No JS: the list, the count and the form (with its errors and confirmation) all work.

## Files by owner
| Owner | Files |
|---|---|
| developer | `types/comment.ts`, `lib/comment-input.ts`, `lib/client-address.ts`, `lib/data/comments.ts`, `lib/actions/comments.ts`, `app/(blog)/posts/[slug]/page.tsx`, `components/comments/comment-section.tsx`, `comment-list.tsx`, `comment-form.tsx`, `components/posts/post-article.tsx` (section + count), `components/posts/post-meta.tsx` if the count needs a second slot |
| tester | `tests/unit/comment-input.test.ts`, `tests/unit/client-address.test.ts`, `tests/unit/comments.test.ts`, `tests/e2e/comments.spec.ts` (JS and `@no-js`) |
| lead | `docs/product.md` (post page; drop "Comments" from non-goals), `.claude/rules/data.md` (the comment cap and rate limits under "Accepted abuse limits"), `docs/decisions.md` (the user's 2026-10-20 answers, since right-most XFF and `TRUST_PROXY` bind sprint 10's login throttle too), `.env.example` (`TRUST_PROXY` is now read; `ADMIN_*` stay "planned") |

One developer task, data first (type, helpers, `getComments(slug): Promise<Comment[]>`, `addComment` with its result
union and `now`, `addCommentAction` and `CommentFormState`), then the page, the `comments` prop on `PostArticle` and
the components that render them. Its report states the limits and the rate-limit and `X-Forwarded-For` trade-off,
which the lead turns into the data rule and the decisions entry. The tester works from the ACs and those interfaces.

## Sprint split
| Sprint | Branch | Scope | Owners |
|---|---|---|---|
| 9 | `feat/comments` | everything above | developer, tester, reviewer |
| 10 | `feat/comments-admin` | `/admin`, hide/unhide ("Sprint 10 plan" below; not specified yet) | later spec |

## Sprint 10 plan (from the roadmap)
The roadmap's "Phase D plan", decided by the user on 2026-10-12 (D-007), moved here on 2026-10-19. Its sprint 9 half
is superseded by this spec; the sprint 10 half is the input for that sprint's spec.

User choices: comments are **visible immediately**, and the owner can **hide** them from `/admin`. **Name only**: no
accounts and no auth library. Admin is protected by a **password in `.env`**. A **flat list**, with no replies.

### Sprint 9: `feat/comments`
Superseded by this spec, kept as the record of D-007: the left-most `x-forwarded-for` became right-most (Answer 1),
and `docs/comments.md` is not written (D-022).
- `lib/data/comments.ts` on the existing store (key `comments`: `Record<slug, Comment[]>`). `Comment` = {id, slug, name,
  body, createdAt, hidden} in `types/comment.ts`. Exports `getComments(slug)` (visible only, oldest first) and
  `addComment()`.
- Limits: name 1–50 and body 1–2000 chars after trim, a honeypot, a 500-per-post cap, control/bidi characters
  stripped. Rate limit: with `TRUST_PROXY=1`, per left-most `x-forwarded-for`; otherwise a site-wide flood guard
  (30 per 10 min). Document the trade-off.
- `lib/actions/comments.ts` `addCommentAction` for `useActionState`: validates everything, checks that the slug
  exists, calls `revalidatePath`.
- The body is plain React text with line breaks kept: no Markdown, no HTML, no auto-links. `CommentList` is an RSC
  rendered inline (essential content, so no Suspense). `CommentForm` is the only client leaf (`useActionState` +
  `useOptimistic`), posts without JS, and puts errors in `role="alert"`. Files go in `components/comments/`. Show the
  count in the post meta. Notes go in `docs/comments.md`.

### Sprint 10: `feat/comments-admin`
- `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (and `TRUST_PROXY`) go in `.env.example`. If either secret is unset,
  `/admin` returns 404.
- `lib/data/admin-session.ts`: login through a Server Action with `timingSafeEqual`. The cookie holds a 7-day expiry
  signed with HMAC-SHA256 (httpOnly, sameSite=lax, secure in prod), plus a logout action. Rotating the secret revokes
  all sessions.
- `app/(admin)/admin/login/page.tsx` and `app/(admin)/admin/page.tsx`: noindex, disallowed in `robots.ts`, and left out
  of the sitemap. The admin page lists recent comments across posts with Hide/Unhide as plain `<form action>` Server
  Actions (they work without JS). The page and every action re-check the session server-side.
- Login throttle: 10 failed attempts per 15 min (site-wide unless `TRUST_PROXY`), with a generic error message. A
  known caveat: someone else can lock the owner out for 15 min.
