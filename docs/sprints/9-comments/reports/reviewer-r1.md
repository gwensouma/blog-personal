# Report: reviewer · round 1 · status: done

Task: `tasks/reviewer-r1.md`

## Summary
- Reviewed the uncommitted `feat/comments` work tree against `origin/main`. There is no PR or commit yet, so I read
  the files directly: the action, data, input and address helpers, types, the three comment components, the page,
  `post-article.tsx`, `docs/product.md`, `.env.example` and the four test files.
- Server HTML checked with curl against `next start -p 3100`. It served the tester's `.next-e2e` build, which is
  newer than every file in `app/ components/ lib/ types/`, so I did not rebuild. `BLOG_DATA_DIR` pointed at a scratch
  dir. I stopped only the PID I started (13448).
- I also sent no-JS POSTs with curl, using the form's `$ACTION_*` fields with `--form-string`:
  - A valid comment was stored once. `<b>hi</b>` came back escaped and the line break was kept.
  - The count read "1 comment" and the alert read "Thanks, your comment is posted."
  - A resubmit and a filled honeypot both got success and stored nothing.
  - A whitespace-only name got the name error, with `aria-invalid` and `aria-describedby` set and the typed value
    kept.
  - A 2001-character body was rejected.
  - Five POSTs added no view (`postStats` stayed at 1 view).
- No browser check: the task says the Playwright MCP fails to connect this session. Instead, JS behaviour, keyboard
  use and the 320px width rely on the tester's e2e run (exit 0, 55 passed). For 768/1280 and light/dark I read the
  classes: tokens only, `min-w-0` and `[overflow-wrap:anywhere]` on the name and body, `sm:max-w-sm` is the only
  width, and there are no palette classes or `dark:` overrides. No visual check was done in a browser.
- One must-fix: invisible bidi control characters written literally into the cleaning regex (and the tests).

## Files
None (review only).

## Gate
- `npm run gate:fast` → exit 0 (typecheck, lint, 254 unit tests in 13 files).
- `npm run build` was not re-run; I reused the tester's `.next-e2e` build (sources unchanged since).

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1 | curl: `section#comments` at offset 47767, after the article `<footer>` (39406) and before "Up next" (54893); "No comments yet."; after a POST, `li > article > h3` + `time[dateTime]` ISO + body with `\n` kept; e2e flow + unit `getComments` | pass |
| AC2 | curl: "0 comments" / "1 comment" in `a[href="#comments"]` in the meta, outside the only `<div hidden id="S:0">` (the like button); e2e "no other page" | pass |
| AC3 | e2e flow (tester); code: `useOptimistic` preview inside the form transition | pass (e2e only) |
| AC4 | curl no-JS POST: comment, count, confirmation; e2e `@no-js` | pass |
| AC5 | curl (name `"   "`): alert text, `aria-invalid`, `aria-describedby` → alert id, value kept; e2e JS + no-JS; unit action | pass |
| AC6 | curl: `required` + `maxLength` 50/2000 in the HTML; 2001 body rejected by the server; unit boundaries | pass |
| AC7 | unit ranges; curl: `&lt;b&gt;` escaped, no `<a>`; e2e no `b/a/img/script` | pass |
| AC8 | unit action; curl honeypot POST stored nothing | pass |
| AC9 | unit (500 incl. hidden) | pass |
| AC10 | unit (site-wide 30, per-key 5, right-most XFF, `TRUST_PROXY=true` ignored, window edge) | pass |
| AC11 | unit action (missing/empty/unknown/`__proto__` slug, File fields) | pass |
| AC12 | unit `revalidatePath` on `ok` only; e2e new context + client navigation | pass |
| AC13 | unit | pass |
| AC14 | curl: 5 POSTs, views stayed 1; `post-engagement.tsx` unchanged; e2e (weak, see the tester's finding 1) | pass |
| AC15 | unit; curl resubmit stored once | pass |
| AC16 | grep: only `comment-form.tsx` is `"use client"`; no `Suspense` around the section/count; no `dangerouslySetInnerHTML`; no `loading.tsx`, no `dynamic` export; `package.json`/lockfile unchanged; labels visible in the HTML; keyboard + 320px by e2e; 768/1280 and dark mode by reading classes only | pass (visual by reading) |
| AC17 | curl: list, count, form, field error and confirmation all in the server HTML; e2e `@no-js` | pass |

## Findings
| # | Severity | File:line | What is wrong | Fix | Came back? |
|---|---|---|---|---|---|
| 1 | must-fix | `lib/comment-input.ts:10`; also `tests/unit/comment-input.test.ts:46,81,89,127,132,160,169,189`, `tests/unit/comments.test.ts:316,360`, `tests/e2e/comments.spec.ts:276` | The character class `CONTROLS_EXCEPT_NEWLINE` holds U+061C, U+200E, U+200F, U+202A–U+202E and U+2066–U+2069 as raw invisible characters, not escapes (I checked the bytes). These are the Trojan Source characters (CVE-2021-42574): editors and the GitHub diff can reorder or hide the line, GitHub puts a "bidirectional Unicode text" warning on the file, and a reader cannot check what the security regex strips. I only confirmed it was right by dumping code points. The tests repeat the pattern in string literals. | Write them as escapes: `/[\u0000-\u0009\u000B-\u001F\u007F-\u009F؜‎‏‪-‮⁦-⁩]/g`. In the tests, use `"‮"` etc., or `String.fromCharCode(...)`, never the raw character. Optional: a unit test in `conventions.test.ts` that fails on raw U+202A–U+202E / U+2066–U+2069 in `*.ts(x)` files. | no |
| 2 | suggestion | `lib/actions/comments.ts:36,48,59,61` | An error echoes the raw `name` and `body` back, uncapped. A hand-made POST can send up to Next's 1 MB action body limit. With JS off, that is reflected twice in the returned HTML (the textarea `defaultValue` and the serialized state in the `$ACTION_1:1` hidden input). It is a small amplification a stranger controls. | Cap the echo, e.g. `name.slice(0, COMMENT_NAME_MAX_LENGTH * 2)` and `body.slice(0, COMMENT_BODY_MAX_LENGTH * 2)`. Real users are held to `maxLength` already, so they lose nothing. | no |
| 3 | suggestion | `components/comments/comment-form.tsx:6`, `components/comments/comment-list.tsx:19` | The client `CommentForm` imports `CommentEntry` from `comment-list.tsx`, so that whole module (`CommentList`, `PostDate`) also goes into the client bundle. It is harmless today, but the file reads as a Server Component. Anything server-only added to it later would break the form build, or leak, without warning. | Move `CommentEntry` to `components/comments/comment-entry.tsx` (rule 4 allows it) and import it from both. | no |
| 4 | suggestion | `components/comments/comment-form.tsx:126` | `className="h-9"` on the shadcn `Input` overrides the component's own height. The shadcn rule is `className` for layout only. | Drop it and use the default size, or a size variant if one exists. | no |

No other must-fix. Checked and fine:
- Action: string-only fields, empty slug, honeypot before validation, cleaning before the length check, `getPost`
  for slug existence, `TRUST_PROXY === "1"`, `revalidatePath` only on `ok`, exact messages from the brief, no throw
  for user input.
- `clientKeyFrom` takes the right-most non-empty entry.
- Data:
  - `server-only` is imported.
  - Duplicate, then cap, then rate limit, then append, all inside one `updateStore`.
  - The cap and the site-wide count include hidden comments.
  - A duplicate records no hit. A hit is recorded only when a comment is stored, and taken back if the write fails.
  - Only a SHA-256 of the address is kept, in memory.
  - The injected `now` is used everywhere, and the trade-off comment sits next to the constants.
- Motion: `m.*` under `LazyMotion strict`, `spring.reveal`/`spring.pop` presets, transform and opacity only,
  `MotionConfig reducedMotion="user"`, `motion-safe:animate-pulse`.
- Form a11y:
  - Visible labels; one always-present `role="alert"` region, emptied while pending.
  - Focus moves after a JS submit.
  - The honeypot is `aria-hidden` with `tabIndex={-1}` and is off-screen.
  - The "Posting…" marker has `aria-busy`.
  - Headings go h2 then h3.
- Docs: `docs/product.md` has no dates or sprint numbers and the non-goal is removed. `.env.example` says right-most
  XFF, and `ADMIN_*` is still marked planned. There is no feature note.
- Tests: no `.skip`, `.only`, `.fixme` or `waitForTimeout`. The e2e stores 6 comments per run, 12 with a CI retry,
  under the 30 limit.
- Design: an editorial hairline thread with a Fraunces byline and no cards or avatars, which fits `ui.md`. Nothing
  templated to flag.

## Open questions
- A multipart POST with no Server Action id to any page (`/` and `/posts/<slug>`) returns 500 with "Failed to find
  Server Action". This is Next's behaviour and not introduced here. Noting it only because the comment form makes a
  POST endpoint more visible on post pages.
