# Report: tester · round 1 · status: done

Task: `tasks/tester-r1.md`

## Summary
- Added 3 unit files (95 tests) and 1 e2e spec (12 tests: 9 JS, 3 `@no-js`). No defect found in the feature; no
  `.skip`/`.fixme`/`.only`. The JS path (optimistic preview, in-place update, focus) that the developer could not
  browser-check works in Chromium.
- Unit: cleaning/boundaries (0/1/50/51, 0/1/2000/2001, every stripped range looped), `clientKeyFrom`, store logic
  (visible-only/sorted, hidden, cap 500 incl. hidden, site-wide 30 with the window edge at 10:00 and a sliding
  window, per-key 5 incl. concurrent posts, duplicates, nothing stored on rejection, no address in the store) and
  the action (honeypot, 51/2001 with echo, File/missing/unknown/`__proto__` slugs, `revalidatePath` on ok only,
  `TRUST_PROXY=1` with rotating left entries, `TRUST_PROXY=true` ignored).
- E2E held the Server Action response with `page.route` to observe the "Posting…" item deterministically. Server-side
  limits are bypassed by removing `required`/`maxlength` (JS) or by rewriting the POST body (no-JS), because
  Playwright `fill()` respects `maxlength` in Chromium (my first no-JS attempt stored a 2000-char comment by mistake;
  fixed, the test now asserts a rejection).
- Comment budget per run: JS 5 (flow 3, keyboard 1, 320px 1) + no-JS 1 = 6 stored; 12 with a CI retry (limit 30).
  Errors, honeypot, duplicates store nothing. Each posting test has its own post and a unique body; counts are
  relative to the page's starting count.

## Files
- `tests/unit/comment-input.test.ts`, `tests/unit/client-address.test.ts`, `tests/unit/comments.test.ts`
- `tests/e2e/comments.spec.ts` (`helpers.ts` untouched)

## Gate
- `npm run gate:fast` → exit 0 (typecheck, lint, 254 unit tests in 13 files, all pass).
- `npm run test:e2e` (full, fresh build) → first run exit 1, 52 passed / 3 failed, all three were my test bugs
  (wrong "Up next" selector, `role=button` on the "All posts" link, `fill()` truncated at `maxlength`).
- `E2E_SKIP_BUILD=1 npm run test:e2e` (full, after test-only fixes; no source changed) → exit 0, 55 passed (1.2m).
  The comments spec alone: 12 passed. Existing specs (including up-next's section order) pass with the new section.

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1 | e2e "AC1/AC2 fresh post" (section after footer, before Up next, "No comments yet."); flow test (oldest first, name in h3, `time[datetime]` ISO, line breaks via innerText); unit `getComments` (sorted, unknown slug) | pass |
| AC2 | e2e fresh "0 comments" + `href=#comments`; count link jumps; flow test count = list items at 1 and 3; "no other page shows a comment count" (/, /posts, /tags, tag page, /search); no-JS count | pass |
| AC3 | e2e flow: `[data-comment-pending]` "Posting…" with `aria-busy`, button disabled, no list item yet; then normal `li`, count +1, fields empty, `window` marker survives, same URL, alert focused | pass |
| AC4 | `@no-js` valid submit: new `li`, updated count, confirmation text | pass |
| AC5 | e2e errors (4 cases, JS) and `@no-js` invalid (3 cases): alert text, `aria-invalid` on the field only, values kept, focus (JS), count unchanged; unit action | pass |
| AC6 | unit boundaries 0/1/50/51 and 0/1/2000/2001 (+ trim, cleaning before length, `\r\n`); action 51/2001 rejected; e2e `required`/`maxlength` 50/2000 attributes and labels; server rejects with attributes removed / rewritten POST | pass |
| AC7 | unit each range stripped, NFC, newline/tab rules, controls-only body empty; e2e `<b>hi</b>`, `https://x.y`, `<img onerror>`, `<script>`, `<i>` in the name render as text (no `b/a/img/script/i`, no dialog, no `window.__xss`) | pass |
| AC8 | unit action honeypot: success, nothing stored, no revalidate (no e2e: the field is hidden off-screen) | pass |
| AC9 | unit: 500 stored incl. hidden → `full`, nothing added; 499 → ok; other post unaffected; action message | pass |
| AC10 | unit: 31st site-wide across slugs, window edge (`10:00` ok, `9:59.999` limited), sliding; key: 6th rejected, other key ok, concurrent, not stored; action with `TRUST_PROXY=1` rotating left entries; no header fallback; `clientKeyFrom` cases | pass |
| AC11 | unit action: missing/empty/unknown/`../store`/`__proto__` slug, File in slug/name/body/website, missing name/body, garbage prev state → generic error, no throw, nothing stored | pass |
| AC12 | unit `revalidatePath(/posts/<slug>)` on ok only (not on duplicate, honeypot, errors); e2e new browser context sees 3 comments; client navigation away (All posts → archive link) and back shows them, marker proves no reload | pass |
| AC13 | unit: hidden comment not returned (also all-hidden); hidden still counts for cap, duplicate and site-wide limit | pass |
| AC14 | e2e keyboard test (JS) and `@no-js` valid submit: view count (read without recording a view) not above the baseline after the submit | pass (weak, see finding 1) |
| AC15 | unit: duplicate → `duplicate`, once, not counted toward key or site-wide limits, stored again at +10:00, hidden duplicate, concurrent; action success twice, revalidate once; `@no-js` resubmit stores once | pass |
| AC16 | keyboard-only e2e (Enter on count link, Tab to Name, Tab to Comment, Tab skips honeypot to button, Enter); 320px no horizontal overflow with a 50-char unbroken name and 2000-char unbroken body; no `dangerouslySetInnerHTML`/`"use client"`/Suspense/dependency checks are the reviewer's. 768/1280 and dark mode not covered | partial (by design) |
| AC17 | `@no-js`: render test (list, count, form, empty alert), valid submit with confirmation, invalid submit with alert and kept values | pass |

## Findings
| # | Severity | File:line | What is wrong | Fix | Came back? |
|---|---|---|---|---|---|
| 1 | suggestion | `tests/e2e/comments.spec.ts` (AC14 checks) | The no-view assertion cannot be exact: `up-next.spec.ts` loads every post in parallel and each load adds a view after the response. The check is "views right after the submit are not above the baseline", so a view recorded late by a regression could slip through, and another spec's load could in theory make it flaky (not seen in 3 runs). The code makes it correct by design (`PostViews` skips `next-action` and `content-type` requests). | Optional: a unit test of `PostViews` with mocked `headers()`, or a post no other spec visits. | no |
| 2 | suggestion | `tests/e2e/comments.spec.ts` | AC8 (honeypot) has no e2e; only the action unit test. | Fine as is; add an e2e only if the honeypot markup changes. | no |

No must-fix defects.

## Open questions
- None. Note for the lead: Playwright `fill()` stops at `maxlength`, so a future test that wants a 2001-char field
  value must remove the attribute or rewrite the POST, as these tests do.
