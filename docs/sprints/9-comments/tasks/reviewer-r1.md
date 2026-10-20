# Task: reviewer · round 1

<!-- docs/sprints/9-comments/tasks/reviewer-r1.md -->

Brief: `docs/sprints/9-comments/brief.md` · Branch: `feat/comments`
Report to: `docs/sprints/9-comments/reports/reviewer-r1.md` (format: `.claude/templates/report.md`)
Read first: `reports/developer-r1.md` and `reports/tester-r1.md` in the sprint folder.

## Review
- Diff: `git diff origin/main...HEAD` (or `gh pr diff` with the PR number once the PR exists).
- Focus for this sprint:
  - **Server Action as a public endpoint** (`lib/actions/comments.ts`): non-string fields, missing/unknown slug,
    honeypot, cleaning before the length check, no throw for user input, `revalidatePath` only on `ok`, exact
    messages from the brief. `TRUST_PROXY` read as `=== "1"`; `clientKeyFrom` takes the right-most entry.
  - **Data** (`lib/data/comments.ts`): `server-only`; duplicate → cap → rate limit → store, all inside one
    `updateStore`; cap counts hidden; duplicate not counted toward the limit; no IP or personal data stored (only a
    hash in memory); the in-memory window uses the injected `now`; the trade-off comment is next to the constants.
  - **Input cleaning** (`lib/comment-input.ts`): every range from the spec, order (clean, trim, then length).
  - **RSC shape** (AC16): only `comment-form.tsx` is `"use client"`; no `<Suspense>` around the section or the count;
    no `dangerouslySetInnerHTML`, no Markdown or auto-linking; no `loading.tsx`, no `dynamic` export; no new
    dependency in `package.json`/lockfile. `post-engagement.tsx` view filter unchanged (AC14).
  - **Form a11y**: visible labels, `aria-invalid`/`aria-describedby`, always-present `role="alert"`, focus moves,
    honeypot hidden from AT and tab order, "Posting…" marker.
  - **Docs**: `docs/product.md` (post page, "What it is", non-goal removed; no dates or sprint numbers),
    `.env.example` (`TRUST_PROXY` read, right-most; `ADMIN_*` still planned); no `docs/comments.md` or other feature
    note (D-022). The lead's `.claude/rules/data.md` and `docs/decisions.md` are not in this diff's developer part.
  - **Tests**: every AC mapped; the e2e comment budget stays under the site-wide 30 with a CI retry; no `.skip`,
    `.fixme`, `.only`; no waits on time.
- **No browser this session**: the Playwright MCP fails to connect, so don't use it. Instead:
  - `npm run build`, then `npm run start` on a free port with `BLOG_DATA_DIR` set to a temp dir (never the real
    `.data/`); stop only the PID you started.
  - With curl, check the server HTML of one `/posts/<slug>`: the `#comments` section after the article footer and
    before Up next, "No comments yet.", the "0 comments" link to `#comments` outside any `<div hidden id="S:…">`, the
    form with its labels, `required`, `maxLength`, the honeypot, and the alert region (AC1, AC2, AC16, AC17).
  - Optional: a no-JS POST with curl (multipart with the form's hidden `$ACTION_ID_…` field and the fields) and the
    returned HTML shows the comment, the count and the confirmation (AC4); skip it if the action id is awkward to
    extract and say so.
  - For no-JS behaviour, JS behaviour and widths, rely on the tester's e2e results (`@no-js` and the 320px check);
    for 768/1280 and light/dark, check by reading the classes (tokens only, `min-w-0`, `[overflow-wrap:anywhere]`,
    no fixed widths). State in the report that the visual check was not done in a browser and why.
- Round > 1: only the findings listed below from the last round, plus anything their fixes touched.

## Files you may change
- None (review only).

## Acceptance criteria this task serves
AC1–AC17 by reading; AC1, AC2, AC16, AC17 also by curl; AC16 (no client list, no Suspense, no new dependency) only
here.

## Done when
- `npm run gate:fast` exit code is in the report, and the curl check is done (with the browser skip explained).
- Findings are marked must-fix / suggestion with `file:line`; "no must-fix" is said explicitly when true.
