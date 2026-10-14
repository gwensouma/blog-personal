# Task: tester · round 1

<!-- .design/sprints/8-home-no-js/tasks/tester-r1.md -->

Brief: `.design/sprints/8-home-no-js/brief.md` · Branch: `fix/home-no-js`
Report to: `.design/sprints/8-home-no-js/reports/tester-r1.md` (format: `.claude/templates/report.md`)
Read first: the developer and builder reports of this sprint (`reports/developer-r1.md`, `reports/builder-r1.md`).

## Cover
- **`tests/e2e/no-js.spec.ts`, home test (AC1–AC5).** Turn the `test.fixme("home / shows featured, latest and Most
  read without JS", …)` near line 138 into a plain `test`, renamed e.g. "content: home / shows every section without
  JS". Delete the "Known bug … Remove .fixme once that lands." comment above it, the `request` fixture, the
  `request.get("/posts/streaming-with-suspense")` seeding call and the `Most read` assertion. Add a one-line comment
  instead: "Most read" isn't asserted because the e2e build sees an empty store (`.design/popular-posts.md`, caveat 2).
  The test stays inside the `@no-js` describe. Assert, all with `expectShown` from `@/tests/e2e/helpers`:
  - AC1: `h2` "Featured"; the link "Server Components run on the server" (scope it to the Featured section, e.g. the
    `section` labelled by that heading, rather than `.first()`).
  - AC2: `h2` "Latest posts"; inside its section (`aria-labelledby="latest-heading"`), exactly 4 post title links,
    none named "Server Components run on the server"; a "View all posts" link with `href="/posts"`.
  - AC3: `h2` "Browse by topic"; an "All tags" link with `href="/tags"`.
  - AC4: the link named "Browse the archive" with `href="/posts"` is shown (the `no-js` project is Desktop Chrome,
    1280 wide, so `md` applies). `page.getByText("Loading featured post…")` and `page.getByText("Loading posts…")`
    have count 0. Use count, not visibility: the bug put skeletons in the HTML. The command palette's "Loading posts…"
    lives in a closed client dialog and isn't in the no-JS HTML; if it shows up, report it, don't work around it.
- **New `tests/e2e/home.spec.ts`, JS on (AC6).** The `js` project skips `@no-js` tests, and no current spec opens `/`
  with JS, so add an untagged test: the `h1` is shown, and the `h2` headings appear in the order Featured, Latest
  posts, Browse by topic (e.g. compare the index of each in `getByRole("heading", { level: 2 }).allInnerTexts()`),
  with the newsletter section after Browse by topic. Don't assert "Most read" either way. Wait on state, never on time.
- AC5: after your change, `grep -n "fixme\|\.skip" tests/e2e/no-js.spec.ts` shows nothing for the home page.
- AC6 build line: from the `npm run test:e2e` build log (or `npm run build`), quote the route table line for `/`
  (static `○`, Revalidate `5m`) in the report.
- Edge cases from the developer/builder reports, plus any you find (e.g. featured post duplicated in Latest posts).

## Files you may change
- `tests/e2e/no-js.spec.ts`
- `tests/e2e/home.spec.ts` (new)
- `tests/e2e/helpers.ts` only if a shared helper is truly needed

## Acceptance criteria this task serves
AC1, AC2, AC3, AC4, AC5, AC6 (from the brief).

## Done when
- `npm test` and `npm run test:e2e` run in full (both projects), with exit codes in the report.
- The report maps each AC → test, and lists defects as must-fix / suggestion with the suspected file.
