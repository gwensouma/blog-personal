# Spec: comments

Status: draft · Roadmap: phase D, sprint 9 (`feat/comments`) · Author: planner

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
- **Store:** `lib/data/store.ts:87` `readStore` / `:92` `updateStore` (per-key file, serialized writes). Re-check a cap
  inside the update, as `lib/data/newsletter.ts:26` does; its hard cap `:9` is the pattern for the 500-per-post cap.
- **Action shape:** `lib/actions/newsletter.ts:12` (`useActionState` signature, returns a state object, never throws
  for user errors); state type `types/engagement.ts:9`. `lib/actions/engagement.ts:10` checks the slug exists.
- **Form pattern:** `components/newsletter/newsletter-form.tsx`: always-present `role="alert"` emptied while pending
  (`:282`, `:357`), `defaultValue` from the state keeps typed text after an error (`:346`), focus back to the field
  on error (`:285`). Copy it; don't invent a second pattern.
- **Post page:** `app/(blog)/posts/[slug]/page.tsx:49` fetches in one `Promise.all`; add comments there.
  `components/posts/post-article.tsx:110-117` is the article footer (likes, share), `:127-139` the ending
  (Up next, newsletter, prev/next, related). `components/posts/post-meta.tsx:153` has one trailing `children` slot,
  today holding the streamed view count (`post-article.tsx:57-61`).
- **Dynamic route (D-016):** the like cookie already makes `/posts/[slug]` render per request, so reading the store
  inline adds no rendering cost and needs no Suspense. Rendered Markdown is memoised per slug, so the re-render after
  a comment does not re-run Shiki.
- **Views:** `components/posts/post-engagement.tsx:28-29` skips requests with `next-action` or `content-type`, so
  neither a JS nor a no-JS comment POST counts as a view. Keep it that way.
- **Dates:** `lib/format.ts:10` `formatDate` (UTC, "October 16, 2026") and `components/posts/post-date.tsx`.
- **E2E:** `playwright.config.ts` wipes `.data-e2e` per server start, so seeded or posted comments never leak between
  runs; one run must post fewer than 30 comments in total or the site-wide guard trips (AC10).
- Docs: [Server Actions and mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
  (progressive enhancement, `revalidatePath` in an action returns the updated UI in the same round trip),
  [useActionState](https://react.dev/reference/react/useActionState), [useOptimistic](https://react.dev/reference/react/useOptimistic),
  [`headers()`](https://nextjs.org/docs/app/api-reference/functions/headers). On `X-Forwarded-For`, MDN
  ([link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For)) warns the left-most entry is
  client-controlled; see Question 1.

## Options
| Option | How | Cost | Risk |
|---|---|---|---|
| A | `CommentList` RSC inline; `CommentForm` client leaf renders the optimistic comment(s) just above itself, so it reads as the end of the list | small; one client file | the optimistic item sits in its own element after the list (visual, not DOM, continuity) |
| B | A client `CommentThread` owns the list and `useOptimistic` over it; the page passes comments as props | medium | list rendering moves to the client bundle: against server-first |
| C | Comments in their own `<Suspense>` streamed after the article | small | the section is essential content; D-011's reasoning applies, and the count in the meta would need a second boundary |

Recommendation: **A**. The list stays a Server Component and the only client code is the form, exactly the "smallest
leaf" rule. Since the list is oldest first and the form follows it, a pending comment shown at the top of the form
component lands where the real one will appear.

## Questions for the user
1. **Which `X-Forwarded-For` entry with `TRUST_PROXY=1`?** The plan says left-most, but the left-most entry is whatever
   the client sent when the proxy appends (nginx `$proxy_add_x_forwarded_for`), so a spammer rotates it freely.
   Default: the **right-most** entry (the address your one trusted proxy saw), documented in `docs/comments.md`.
2. **Per-IP limit** (the plan gives none): default **5 comments per 10 minutes per address**.
3. **Duplicate resubmit:** a no-JS reload re-POSTs the form. Default: the same name and body on the same post within
   10 minutes is answered as a success without storing a second copy.
4. **Counts elsewhere:** default the count shows only on the post page, not on home, archive or tag lists (those are
   ISR pages and would need extra revalidation).

## Scope
- In: `types/comment.ts`, `lib/data/comments.ts`, `lib/actions/comments.ts`, a pure input helper, the comments
  section on the post page, the count in the post meta, unit and e2e tests, `docs/comments.md`, product.md update.
- Out (sprint 10): `/admin`, login, hide/unhide, `ADMIN_*` env. Also out: replies, Markdown or links in comments,
  editing or deleting by the commenter, email notifications, comment counts on lists (Q4).

## Design
- **Type** (`types/comment.ts`): `Comment = { id, slug, name, body, createdAt, hidden }` (`id` from `randomUUID`,
  `createdAt` ISO). No IP or other personal data is stored. `CommentFormState` = idle | success | error with
  `message`, the typed `name`/`body`, and an optional `field: "name" | "body"`.
- **Data** (`lib/data/comments.ts`, server-only, store key `comments`: `Record<slug, Comment[]>`):
  `getComments(slug)` returns visible comments, oldest first; `addComment({ slug, name, body, clientKey })` returns a
  result union (`ok` | `duplicate` | `full` | `rate-limited`), applying the cap, the duplicate check and the rate
  limit inside the serialized update. The site-wide flood guard counts stored `createdAt` values from the last
  10 minutes (survives restarts, no extra state); the per-IP window is an in-memory map on `globalThis` (like the
  store's cache), keyed by a hash of the address, and is lost on restart: the documented trade-off.
- **Input helper** (`lib/comment-input.ts`, pure): normalise to NFC; turn `\r\n`/`\r` into `\n`, tabs into spaces;
  strip C0/C1 controls (except `\n` in the body), DEL, and bidi/format controls U+061C, U+200E, U+200F,
  U+202A–U+202E, U+2066–U+2069; collapse the name's whitespace to single spaces; collapse 3+ newlines in the body to
  two; trim; then check the length (`.length`, matching the inputs' `maxLength`).
- **Action** (`lib/actions/comments.ts`, `addCommentAction(prev, formData)`): reads `slug`, `name`, `body` and the
  honeypot from `formData` (strings only), checks the honeypot, cleans and validates, checks the slug against
  `getPosts()`, derives the client key from `headers()` (Q1) when `TRUST_PROXY=1`, calls `addComment`, then
  `revalidatePath(\`/posts/${slug}\`)` on success. Never throws for user input.
- **UI** (`components/comments/`): `CommentSection` (server: `<section id="comments" aria-labelledby>`, heading, list,
  form), `CommentList` (server: `<ol>` of `<article>`s with name, `<time>` via `formatDate`, body as React text in a
  `whitespace-pre-line` block, `[overflow-wrap:anywhere]`), `CommentForm` (`"use client"`). The section goes right
  after the article, before Up next (`post-article.tsx:127`), inside the reading column. The honeypot is a text input
  named `website` in a wrapper that is visually hidden off-screen, `aria-hidden`, `tabIndex={-1}`,
  `autoComplete="off"`.
- **Count:** `page.tsx` fetches `getComments(slug)` alongside the post and passes the list to `PostArticle`; the meta
  shows "N comments" ("1 comment", "0 comments") as a link to `#comments`, inline (no Suspense), next to the views.

## Acceptance criteria
- AC1: Every post page has a "Comments" section (`#comments`) after the article footer and before Up next. It lists
  visible comments oldest first, each with the name, the date (`<time dateTime>`) and the body with its line breaks.
  With none it says "No comments yet."
- AC2: The post meta shows the visible-comment count ("0 comments", "1 comment", "3 comments") as a link to
  `#comments`; it always matches the number of list items.
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
- AC10: Without `TRUST_PROXY=1`, the 31st comment site-wide within 10 minutes is rejected with "Too many comments
  right now. Please try again in a few minutes." With `TRUST_PROXY=1`, the limit is per client address (Q1, Q2).
  Checked in unit tests with an injectable clock; nothing is stored on rejection.
- AC11: A missing or unknown slug, or non-string form fields, return a generic error state (no 500, nothing stored).
- AC12: After a comment is posted, a fresh load in another browser context shows it, and with JS, leaving the post
  and coming back shows it (the action calls `revalidatePath` for the post).
- AC13: A comment stored with `hidden: true` is neither rendered nor counted.
- AC14: Posting a comment, with or without JS, does not add a view.
- AC15: The same name and body on the same post within 10 minutes is answered as a success and stored once (Q3).
- AC16: Only `CommentForm` is `"use client"`; no `<Suspense>` wraps the section or the count; no `dangerouslySetInnerHTML`;
  no new dependency. The form has visible labels, works by keyboard, and the section works at 320/768/1280 px in light
  and dark.
- AC17: No JS: the list, the count and the form (with its errors and confirmation) all work.

## Files by owner
| Owner | Files |
|---|---|
| developer | `types/comment.ts`, `lib/comment-input.ts`, `lib/data/comments.ts`, `lib/actions/comments.ts`, `app/(blog)/posts/[slug]/page.tsx` |
| builder | `components/comments/comment-section.tsx`, `comment-list.tsx`, `comment-form.tsx`; `components/posts/post-article.tsx` (section + count), `components/posts/post-meta.tsx` if the count needs a second slot |
| tester | `tests/unit/comment-input.test.ts`, `tests/unit/comments.test.ts`, `tests/e2e/comments.spec.ts` (JS and `@no-js`) |
| lead | `docs/product.md` (post page; drop "Comments" from non-goals), `docs/comments.md` (from the developer's report: limits, rate-limit and XFF trade-off), `.env.example` (`TRUST_PROXY` is now read; `ADMIN_*` stay "planned") |

The developer goes first and hands the builder `getComments(slug): Promise<Comment[]>`, the `comments` prop on
`PostArticle`, `addCommentAction` and `CommentFormState`.

## Sprint split
| Sprint | Branch | Scope | Owners |
|---|---|---|---|
| 9 | `feat/comments` | everything above | developer, builder, tester, reviewer |
| 10 | `feat/comments-admin` | `/admin`, hide/unhide ("Sprint 10 plan" below; not specified yet) | later spec |

## Sprint 10 plan (from the roadmap)
The roadmap's "Phase D plan", decided by the user on 2026-10-12 (D-007), moved here on 2026-10-19. Its sprint 9 half
is superseded by this spec; the sprint 10 half is the input for that sprint's spec.

User choices: comments are **visible immediately**, and the owner can **hide** them from `/admin`. **Name only**: no
accounts and no auth library. Admin is protected by a **password in `.env`**. A **flat list**, with no replies.

### Sprint 9: `feat/comments`
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
