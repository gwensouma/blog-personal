# Task: developer · round 1

<!-- docs/sprints/9-comments/tasks/developer-r1.md. Self-contained: the developer reads this and the brief only. -->

Brief: `docs/sprints/9-comments/brief.md` · Branch: `feat/comments` (already checked out by the lead)
Report to: `docs/sprints/9-comments/reports/developer-r1.md` (format: `.claude/templates/report.md`)

## Do
Data first, then the page and components. Patterns to copy, not reinvent: store `lib/data/store.ts:87` `readStore`,
`:92` `updateStore`, the `globalThis` cache `:34`; cap re-checked inside the update `lib/data/newsletter.ts:9,25-33`;
action shape `lib/actions/newsletter.ts:12` and slug check `lib/actions/engagement.ts:10`; form
`components/newsletter/newsletter-form.tsx` (always-present `role="alert"` `:122`, emptied while pending `:46-47`,
`defaultValue` from state `:111`, focus handling `:52-53`); `useOptimistic` in `components/posts/like-button.tsx:36`.

1. **`types/comment.ts`**: `Comment = { id: string; slug: string; name: string; body: string; createdAt: string; hidden:
   boolean }` (`createdAt` ISO). `CommentFormState` = `{ status: "idle" | "success" | "error"; message: string; name?:
   string; body?: string; field?: "name" | "body" }` (shape may differ, but it carries those facts).
2. **`lib/comment-input.ts`** (pure, no I/O): clean a name and a body: NFC; `\r\n`/`\r` to `\n`; tabs to spaces; strip
   C0/C1 controls (keep `\n` in the body only), DEL, and U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069;
   collapse the name's whitespace runs to one space; collapse 3+ newlines in the body to two; trim. Then validate
   length with `.length`: name 1–50, body 1–2000. Export the limits as constants the form reuses for `maxLength`.
3. **`lib/client-address.ts`** (pure): `clientKeyFrom(forwardedFor: string | null, trustProxy: boolean): string | null`:
   the trimmed right-most non-empty `X-Forwarded-For` entry when `trustProxy`, else `null` (also `null` for a missing
   or all-empty header). Sprint 10's login throttle will reuse it.
4. **`lib/data/comments.ts`** (`import "server-only"`, store key `comments`: `Record<slug, Comment[]>`):
   - `getComments(slug): Promise<Comment[]>`: visible only (`hidden: false`), oldest first.
   - `addComment({ slug, name, body, clientKey, now? }): Promise<AddCommentResult>` with `clientKey: string | null`,
     `now: Date` defaulting to the current time, result `{ status: "ok" | "duplicate" | "full" | "rate-limited" }`.
     Inside one `updateStore` call, in this order: **duplicate** (same slug, name and body, hidden or not, created
     within 10 minutes: return `duplicate`, store nothing, do not count against the rate limit); **cap** (500 stored
     for the slug, hidden included: `full`); **rate limit**; then append with `randomUUID()` and `hidden: false`.
   - Rate limit with a `clientKey`: 5 per 10 minutes per address, an in-memory sliding window on `globalThis`, keyed by
     the SHA-256 hex of the address (`node:crypto`); record a hit only when the comment is stored. Without a
     `clientKey`: 30 per 10 minutes site-wide, counted from stored `createdAt` across all slugs (survives restarts).
   - The window must use the injected `now`, so tests can step the clock. Export `resetCommentLimitsForTests()` from
     this file to clear the in-memory window; leave `lib/data/store.ts` unchanged (it stays generic).
   - Next to the limit constants, a short comment: why right-most (an appending proxy puts the client's own claim on
     the left), why in-memory (lost on restart, acceptable), and that a missing header or no `TRUST_PROXY` falls back
     to the site-wide guard. No IP or personal data is stored.
5. **`lib/actions/comments.ts`** (`"use server"`): `addCommentAction(prev: CommentFormState, formData: FormData):
   Promise<CommentFormState>`. Read `slug`, `name`, `body`, `website` (honeypot); any non-string (or missing slug) →
   generic error state. Honeypot non-empty → the normal success state, nothing stored. Clean and validate (error with
   `field`, the typed `name`/`body` echoed back, messages naming the limit). `getPost(slug)` null → generic error.
   `clientKeyFrom((await headers()).get("x-forwarded-for"), process.env.TRUST_PROXY === "1")`. Call `addComment`; on
   `ok` call `revalidatePath(\`/posts/${slug}\`)`. `ok` and `duplicate` answer the same success message (e.g. "Thanks,
   your comment is posted."). `full` → "This post has reached its comment limit."; `rate-limited` → "Too many comments
   right now. Please try again in a few minutes." (exact strings; tests match them). Never throw for user input.
6. **`app/(blog)/posts/[slug]/page.tsx`**: add `getComments(slug)` to the `Promise.all` (`:49`) and pass `comments` to
   `PostArticle`.
7. **`components/comments/`**:
   - `comment-section.tsx` (server): `<section id="comments" aria-labelledby=…>` with an h2 "Comments", the list and
     the form (pass `slug`). Add `scroll-mt-*` so the `#comments` jump clears the sticky header.
   - `comment-list.tsx` (server): with none, "No comments yet."; else an `<ol>` of `<li><article>`: name, `<time
     dateTime={createdAt}>` with `formatDate` (`lib/format.ts:10`, or `components/posts/post-date.tsx`), body as React
     text in a `whitespace-pre-line [overflow-wrap:anywhere]` block. No links, no Markdown.
   - `comment-form.tsx` (`"use client"`): `useActionState(addCommentAction, initial)` and `<form action={formAction}>`
     with hidden `slug`, labelled Name (`<input>`, `required`, `maxLength` 50, `autoComplete="name"`) and Comment
     (`<textarea>`, `required`, `maxLength` 2000), a submit button (shadcn `Button`), the honeypot (`website` text
     input in a wrapper visually hidden off-screen, `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`), and the
     always-present `role="alert"` region. On error: `aria-invalid` + `aria-describedby` on the offending field,
     `defaultValue`s from state, focus that field. On success: confirmation in the region, form cleared, focus the
     confirmation. `useOptimistic`: on submit (valid locally), render the pending comment(s) at the top of the form
     component, styled like a list item and visibly marked with the text "Posting…" plus `aria-busy="true"`, so it
     reads as the end of the list. Without JS the form posts as a full page and the server-rendered result shows.
   - Design: editorial look, tokens only, inputs from shadcn if present in `components/ui/` (else plain elements with
     token classes; don't add a shadcn primitive without saying so in the report), one hairline at the section top.
     States: empty, one, many, a 2000-char unbroken body, a 50-char name, error, success, pending. Widths 320/768/1280,
     light and dark. Motion only if it follows `.claude/rules/ui.md` and never hides content without JS.
8. **`components/posts/post-article.tsx`**: take `comments: Comment[]`; render `<CommentSection>` as the first item of
   the ending `ReadingColumn`, before `<UpNext>` (`:127-130`). In the meta (`:57-61`), next to the views, a link to
   `#comments` with "0 comments" / "1 comment" / "N comments" from `comments.length`, outside the `<Suspense>` around
   the views (inline, no boundary). Change `post-meta.tsx` only if one `children` slot can't hold both cleanly.
9. **`docs/product.md`** (living: no dates, no sprint numbers): "What it is" adds comments to what the store holds;
   "Post `/posts/[slug]`" gains a bullet for the Comments section (name and body, shown at once, oldest first, count
   in the meta linking to it, limits enforced on the server) and its no-JS line says comments post and show without
   JS; delete the "Comments: planned (roadmap), not built." non-goal. Change nothing else.
10. **`.env.example`**: move `TRUST_PROXY` out of the "not read by the code yet" block into its own read setting: "Set to
    1 only behind one proxy you trust to set X-Forwarded-For. Comment rate limits then key on the right-most address
    (the one that proxy saw); otherwise they fall back to one site-wide flood guard." Narrow the planned block's heading
    to sprint 10 / `/admin` with `ADMIN_*` unchanged. Add comments to the `BLOG_DATA_DIR` line's list.

## Files you may change
- `types/comment.ts`, `lib/comment-input.ts`, `lib/client-address.ts`, `lib/data/comments.ts`, `lib/actions/comments.ts`
- `app/(blog)/posts/[slug]/page.tsx`, `components/comments/*.tsx` (the three above), `components/posts/post-article.tsx`,
  `components/posts/post-meta.tsx` (only if needed)
- `docs/product.md` (the three spots above), `.env.example`

## Acceptance criteria this task serves
AC1–AC17 (from the brief); AC9, AC10 and AC15 live in `lib/data/comments.ts` with the injectable `now`.

## Constraints
- Not yours: `.claude/rules/data.md`, `docs/decisions.md` (the lead's), `tests/` (the tester's). No `docs/comments.md`.
- Keep `components/posts/post-engagement.tsx:28-29` as it is: comment POSTs (JS and no-JS) must not record a view.
- No `<Suspense>` around the section or count, no `loading.tsx`, no `dangerouslySetInnerHTML`, no `dynamic` export,
  no new dependency, no client fetch. English only; translate any Vietnamese comment you touch.

## Done when
- `npm run gate:fast` exits 0, and `npm run build` succeeds (note the `/posts/[slug]` line from the route table).
- The report gives the exported signatures (types, `getComments`, `addComment`, `AddCommentResult`, the reset helper,
  `clientKeyFrom`, the cleaning/validation helpers, `addCommentAction`), the exact user-facing messages, the limits
  and the rate-limit and `X-Forwarded-For` trade-off (for the lead's data rule), and per AC the cases the tester
  should cover (inputs, boundaries 50/51 and 2000/2001, control/bidi strings, clock steps, no-JS, widths), plus the
  DOM hooks: section id, list/item roles, count link text, the "Posting…" marker, field labels, alert region.
