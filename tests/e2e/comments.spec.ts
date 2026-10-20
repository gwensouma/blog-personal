import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { expectShown } from "@/tests/e2e/helpers";

// Comments (sprint 9). Content-dependent assertions use content/posts as the fixture.
//
// Budget: the e2e server has no TRUST_PROXY, so every stored comment counts toward the site-wide 30 per
// 10 minutes. Stored per run: JS 5 (flow 3, keyboard 1, 320px 1) + no-JS 1 = 6, so 12 with CI's one retry.
// Every test that posts uses its own post and a unique body (the same-text-within-10-minutes rule would
// otherwise merge a retry into the first attempt), and counts are compared relative to the page's start.
// Rejected, honeypot and duplicate submits store nothing and cost nothing.

const FRESH = "client-components-render-twice"; // never posted to: "0 comments" and the section's place
const FLOW = "server-components-run-on-the-server"; // 3 comments (also in the archive's first page)
const KEYBOARD = "caching-in-the-app-router"; // 1 comment
const NARROW = "designing-the-rsc-boundary"; // 1 comment
const ERRORS = "rsc-shrinks-your-bundle"; // errors only, nothing stored
const NOJS_EMPTY = "why-i-started-this-journal"; // render only
const NOJS_POST = "streaming-with-suspense"; // 1 comment
const NOJS_ERRORS = "server-actions-for-mutations"; // errors only

const GENERIC_SUCCESS = "Thanks, your comment is posted.";
const COUNT_LINK = /^[\d,]+ comments?$/;

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function section(page: Page) {
  return page.locator("section#comments");
}
function items(page: Page) {
  return section(page).locator("ol > li");
}
function countLink(page: Page) {
  return page.getByRole("link", { name: COUNT_LINK });
}
function nameField(page: Page) {
  return section(page).getByLabel("Name", { exact: true });
}
function bodyField(page: Page) {
  return section(page).getByLabel("Comment", { exact: true });
}
function submitButton(page: Page) {
  return section(page).getByRole("button", { name: /^Post(ing| comment)/ });
}
function alertRegion(page: Page) {
  return section(page).getByRole("alert");
}
async function countText(page: Page): Promise<number> {
  const text = (await countLink(page).innerText()).trim();
  return Number(text.split(" ")[0].replace(/,/g, ""));
}
async function fillForm(page: Page, name: string, body: string) {
  await nameField(page).fill(name);
  await bodyField(page).fill(body);
}
async function expectCountMatchesList(page: Page) {
  const n = await items(page).count();
  await expect(countLink(page)).toHaveText(`${n} ${n === 1 ? "comment" : "comments"}`);
}

// The view count without recording a view: a request carrying a Content-Type is not treated as a page load.
async function viewsOf(request: APIRequestContext, slug: string): Promise<number> {
  const response = await request.get(`/posts/${slug}`, { headers: { "content-type": "text/plain" } });
  const html = (await response.text()).replace(/<!-- -->/g, "");
  const match = html.match(/([\d,]+) views?</);
  expect(match, "view count in the HTML").not.toBeNull();
  return Number(match![1].replace(/,/g, ""));
}

// ----------------------------------------------------------------------------------------------------
// JS project
// ----------------------------------------------------------------------------------------------------

test.describe("comments", () => {
  test("AC1/AC2: a fresh post has the section after the footer and before Up next, says 'No comments yet.' and '0 comments'", async ({
    page,
  }) => {
    await page.goto(`/posts/${FRESH}`);
    await expectShown(section(page).getByRole("heading", { level: 2, name: "Comments" }));
    await expectShown(section(page).getByText("No comments yet."));
    await expect(items(page)).toHaveCount(0);
    await expect(countLink(page)).toHaveText("0 comments");
    await expect(countLink(page)).toHaveAttribute("href", "#comments");

    const upNext = page.getByRole("region", { name: "Up next" });
    await expect(upNext).toBeVisible();
    const upNextHandle = await upNext.elementHandle();
    const order = await page.evaluate((next) => {
      const footer = document.querySelector("article#post-article footer");
      const comments = document.querySelector("section#comments");
      if (!footer || !comments || !next) return { footer: !!footer, comments: !!comments, next: !!next };
      const after = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { footerBeforeComments: after(footer, comments), commentsBeforeUpNext: after(comments, next) };
    }, upNextHandle);
    expect(order).toEqual({ footerBeforeComments: true, commentsBeforeUpNext: true });
  });

  test("AC2: the count link jumps to the section", async ({ page }) => {
    await page.goto(`/posts/${FRESH}`);
    await countLink(page).click();
    await expect(page).toHaveURL(/#comments$/);
    await expect(section(page).getByRole("heading", { name: "Comments" })).toBeInViewport();
  });

  test("AC6: the inputs carry required and maxlength 50/2000 and visible labels", async ({ page }) => {
    await page.goto(`/posts/${FRESH}`);
    await expect(nameField(page)).toHaveAttribute("maxlength", "50");
    await expect(nameField(page)).toHaveAttribute("required", "");
    await expect(bodyField(page)).toHaveAttribute("maxlength", "2000");
    await expect(bodyField(page)).toHaveAttribute("required", "");
    await expect(section(page).getByText("Name", { exact: true })).toBeVisible();
    await expect(section(page).getByText("Comment", { exact: true })).toBeVisible();
  });

  test("AC2: no other page shows a comment count", async ({ page }) => {
    for (const url of ["/", "/posts", "/tags", "/tags/performance", "/search?q=server"]) {
      await page.goto(url);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText(/\b\d+ comments?\b/), url).toHaveCount(0);
    }
  });

  test("AC3/AC7/AC12/AC1/AC2: posting shows a 'Posting…' item at once, then a normal item; text stays text; other contexts and client navigation see it", async ({
    page,
    browser,
    baseURL,
  }) => {
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });

    await page.goto(`/posts/${FLOW}`);
    const startItems = await items(page).count();
    expect(await countText(page)).toBe(startItems);
    await page.evaluate(() => {
      (window as unknown as { __marker: string }).__marker = "same page";
    });

    // Hold the Server Action response so the optimistic state can be observed deterministically.
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(`**/posts/${FLOW}`, async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await gate;
      await route.fallback();
    });

    const first = `first ${uid()}`;
    const body1 = `<b>hi</b>\nhttps://x.y\n${first}`;
    await fillForm(page, "Ann Lee", body1);
    await submitButton(page).click();

    const pending = section(page).locator("[data-comment-pending]");
    await expectShown(pending);
    await expect(pending).toContainText("Posting…");
    await expect(pending).toContainText(first);
    await expect(pending).toHaveAttribute("aria-busy", "true");
    await expect(submitButton(page)).toBeDisabled();
    await expect(items(page)).toHaveCount(startItems); // not a list item yet, count not changed

    release();
    await expect(pending).toHaveCount(0);
    await expect(items(page)).toHaveCount(startItems + 1);
    await expect(countLink(page)).toHaveText(`${startItems + 1} ${startItems + 1 === 1 ? "comment" : "comments"}`);
    await expect(nameField(page)).toHaveValue("");
    await expect(bodyField(page)).toHaveValue("");
    await expect(alertRegion(page)).toHaveText(GENERIC_SUCCESS);
    await expect(alertRegion(page)).toBeFocused();
    await expect(section(page).getByText("No comments yet.")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __marker?: string }).__marker)).toBe("same page");
    expect(new URL(page.url()).pathname).toBe(`/posts/${FLOW}`);

    // AC7 + AC1: literal text, line breaks kept, a <time dateTime>, the name in a heading.
    const mine = items(page).last();
    await expect(mine.getByRole("heading", { level: 3 })).toHaveText("Ann Lee");
    await expect(mine.locator("b, a, img, script")).toHaveCount(0);
    const text = await mine.locator("p").evaluate((el) => (el as HTMLElement).innerText);
    expect(text).toBe(body1);
    await expect(mine.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    // More comments with hostile text, to check order, the count and XSS-as-text.
    await page.unroute(`**/posts/${FLOW}`);
    const second = `second ${uid()}`;
    await fillForm(page, "<i>Bob</i>", `<img src=x onerror="window.__xss=1"><script>window.__xss=1</script> ${second}`);
    await submitButton(page).click();
    await expect(items(page)).toHaveCount(startItems + 2);
    const third = `third ${uid()}`;
    await fillForm(page, "Cy", third);
    await submitButton(page).click();
    await expect(items(page)).toHaveCount(startItems + 3);
    await expect(countLink(page)).toHaveText(`${startItems + 3} comments`);
    await expectCountMatchesList(page);

    await expect(items(page).nth(startItems)).toContainText(first);
    await expect(items(page).nth(startItems + 1)).toContainText(second);
    await expect(items(page).nth(startItems + 2)).toContainText(third);
    const hostile = items(page).nth(startItems + 1);
    await expect(hostile.getByRole("heading", { level: 3 })).toHaveText("<i>Bob</i>");
    await expect(hostile.locator("img, script, i")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(dialogs).toEqual([]);

    // AC12: a fresh browser context sees all of them.
    const other = await browser.newContext({ baseURL });
    try {
      const otherPage = await other.newPage();
      await otherPage.goto(`/posts/${FLOW}`);
      await expect(items(otherPage)).toHaveCount(startItems + 3);
      await expect(countLink(otherPage)).toHaveText(`${startItems + 3} comments`);
      await expect(items(otherPage).nth(startItems)).toContainText(first);
    } finally {
      await other.close();
    }

    // AC12 (JS): leave through client navigation and come back through it; the comments are still there.
    await page.locator('a[href="/posts"]', { hasText: "All posts" }).first().click();
    await expect(page).toHaveURL(/\/posts$/);
    await page.locator(`a[href="/posts/${FLOW}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/posts/${FLOW}$`));
    await expect(items(page)).toHaveCount(startItems + 3);
    await expect(items(page).nth(startItems + 2)).toContainText(third);
    expect(await page.evaluate(() => (window as unknown as { __marker?: string }).__marker)).toBe("same page");
  });

  test("AC5/AC6/AC11: empty and too-long submits show the alert, aria-invalid and the kept values, and store nothing", async ({ page }) => {
    await page.goto(`/posts/${ERRORS}`);
    const before = await items(page).count();
    const longName = "n".repeat(51);
    const longBody = `${"b".repeat(2000)}c`;

    const cases: { name: string; body: string; invalid: "name" | "body"; message: RegExp }[] = [
      { name: "   ", body: "valid body", invalid: "name", message: /Enter your name/ },
      { name: longName, body: "valid body", invalid: "name", message: /too long/ },
      { name: "Ann", body: " \n ", invalid: "body", message: /Write a comment/ },
      { name: "Ann", body: longBody, invalid: "body", message: /too long/ },
    ];

    for (const c of cases) {
      // Bypass the browser's own checks so the server's are what answers.
      await nameField(page).evaluate((el) => {
        el.removeAttribute("required");
        el.removeAttribute("maxlength");
      });
      await bodyField(page).evaluate((el) => {
        el.removeAttribute("required");
        el.removeAttribute("maxlength");
      });
      await fillForm(page, c.name, c.body);
      await submitButton(page).click();

      await expect(alertRegion(page)).toContainText(c.message);
      const invalid = c.invalid === "name" ? nameField(page) : bodyField(page);
      const valid = c.invalid === "name" ? bodyField(page) : nameField(page);
      await expect(invalid).toHaveAttribute("aria-invalid", "true");
      await expect(valid).not.toHaveAttribute("aria-invalid", "true");
      await expect(invalid).toBeFocused();
      // Typed values are kept (the server-side value, so compare as typed).
      await expect(nameField(page)).toHaveValue(c.name);
      await expect(bodyField(page)).toHaveValue(c.body);
      await expect(items(page)).toHaveCount(before);
      await expect(section(page).locator("[data-comment-pending]")).toHaveCount(0);
      await expect(countLink(page)).toHaveText(`${before} ${before === 1 ? "comment" : "comments"}`);
    }

    // Once fixed, the error goes away on the next success is covered by the flow test; here the page still has no new item.
    await page.reload();
    await expect(items(page)).toHaveCount(before);
  });

  test("AC6: a body of only control and bidi characters is rejected as empty", async ({ page }) => {
    await page.goto(`/posts/${ERRORS}`);
    const before = await items(page).count();
    await nameField(page).evaluate((el) => el.removeAttribute("required"));
    await bodyField(page).evaluate((el) => el.removeAttribute("required"));
    await fillForm(page, "Ann", "\u202E\u0007\u200F\u2066");
    await submitButton(page).click();
    await expect(alertRegion(page)).toContainText("Write a comment");
    await expect(bodyField(page)).toHaveAttribute("aria-invalid", "true");
    await expect(items(page)).toHaveCount(before);
  });

  test("AC16: the form works by keyboard alone, and posting adds no view (AC14)", async ({ page, request }) => {
    await page.goto(`/posts/${KEYBOARD}`);
    const start = await items(page).count();
    // The goto's own view is recorded after the response; wait until it shows before taking the baseline.
    const viewsBefore = await viewsOf(request, KEYBOARD);
    await expect.poll(() => viewsOf(request, KEYBOARD)).toBeGreaterThanOrEqual(viewsBefore);
    const baseline = await viewsOf(request, KEYBOARD);

    // Reach the form from the count link with Enter and Tab only.
    await countLink(page).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#comments$/);
    await page.keyboard.press("Tab");
    await expect(nameField(page)).toBeFocused();
    const text = `keyboard ${uid()}`;
    await page.keyboard.type("Kay Board");
    await page.keyboard.press("Tab");
    await expect(bodyField(page)).toBeFocused();
    await page.keyboard.type(text);
    await page.keyboard.press("Tab"); // the honeypot is skipped
    await expect(submitButton(page)).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(items(page)).toHaveCount(start + 1);
    await expect(items(page).last()).toContainText(text);
    await expect(alertRegion(page)).toHaveText(GENERIC_SUCCESS);
    await expectCountMatchesList(page);

    // AC14: the submit did not record a view (other specs also load posts, so only an increase is checked
    // against what was visible right after the response, never against time).
    expect(await viewsOf(request, KEYBOARD)).toBeLessThanOrEqual(baseline);
  });

  test("AC16: at 320px the section has no horizontal overflow with a long unbroken name and body", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`/posts/${NARROW}`);
    const start = await items(page).count();
    const name = `W${uid()}`.padEnd(50, "W");
    const body = `${uid()}`.padEnd(2000, "a");
    await fillForm(page, name, body);
    await submitButton(page).click();
    await expect(items(page)).toHaveCount(start + 1);
    await expect(items(page).last().getByRole("heading", { level: 3 })).toHaveText(name);

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      const comments = document.querySelector("section#comments") as HTMLElement;
      const offenders = Array.from(comments.querySelectorAll("*"))
        .filter((el) => el.getBoundingClientRect().right > root.clientWidth + 1)
        .map((el) => el.tagName.toLowerCase());
      return { page: root.scrollWidth - root.clientWidth, section: comments.scrollWidth - comments.clientWidth, offenders };
    });
    expect(overflow).toEqual({ page: 0, section: 0, offenders: [] });
  });
});

// ----------------------------------------------------------------------------------------------------
// No-JS project
// ----------------------------------------------------------------------------------------------------

test.describe("comments without JavaScript", { tag: "@no-js" }, () => {
  test("AC17/AC1/AC2: the list, the count and the form render in the server HTML", async ({ page }) => {
    await page.goto(`/posts/${NOJS_EMPTY}`);
    await expectShown(section(page).getByRole("heading", { level: 2, name: "Comments" }));
    await expectShown(section(page).getByText("No comments yet."));
    await expect(countLink(page)).toHaveText("0 comments");
    await expectShown(nameField(page));
    await expectShown(bodyField(page));
    await expectShown(submitButton(page));
    await expect(alertRegion(page)).toHaveText("");
    await expect(section(page).locator("[data-comment-pending]")).toHaveCount(0);
  });

  test("AC4/AC17/AC14/AC15: a valid submit returns the page with the comment, the count and the confirmation, adds no view, and a resubmit stores once", async ({
    page,
    request,
  }) => {
    await page.goto(`/posts/${NOJS_POST}`);
    const start = await items(page).count();
    const viewsBefore = await viewsOf(request, NOJS_POST);
    await expect.poll(() => viewsOf(request, NOJS_POST)).toBeGreaterThanOrEqual(viewsBefore);
    const baseline = await viewsOf(request, NOJS_POST);

    const text = `nojs ${uid()}\nsecond line <b>x</b>`;
    await fillForm(page, "No Script", text);
    await submitButton(page).click();

    await expect(items(page)).toHaveCount(start + 1);
    await expect(countLink(page)).toHaveText(`${start + 1} ${start + 1 === 1 ? "comment" : "comments"}`);
    await expect(alertRegion(page)).toHaveText(GENERIC_SUCCESS);
    const mine = items(page).last();
    await expect(mine.getByRole("heading", { level: 3 })).toHaveText("No Script");
    await expect(mine.locator("b")).toHaveCount(0);
    expect(await mine.locator("p").evaluate((el) => (el as HTMLElement).innerText)).toBe(text);
    await expect(nameField(page)).toHaveValue("");
    await expect(bodyField(page)).toHaveValue("");
    expect(await viewsOf(request, NOJS_POST)).toBeLessThanOrEqual(baseline);

    // AC15: the same text again (what a reload of the POST would send) is a success and still one item.
    await fillForm(page, "No Script", text);
    await submitButton(page).click();
    await expect(alertRegion(page)).toHaveText(GENERIC_SUCCESS);
    await expect(items(page)).toHaveCount(start + 1);
    await expectCountMatchesList(page);
    expect(await viewsOf(request, NOJS_POST)).toBeLessThanOrEqual(baseline);
  });

  test("AC5/AC6/AC17: invalid submits return the alert, aria-invalid and the typed values, and store nothing", async ({ page }) => {
    await page.goto(`/posts/${NOJS_ERRORS}`);
    const before = await items(page).count();

    // A whitespace-only name passes the browser's `required` and fails on the server.
    await fillForm(page, "   ", "my typed body");
    await submitButton(page).click();
    await expect(alertRegion(page)).toContainText("Enter your name");
    await expect(nameField(page)).toHaveAttribute("aria-invalid", "true");
    await expect(bodyField(page)).toHaveValue("my typed body");
    await expect(items(page)).toHaveCount(before);

    // Too long: the browser's maxlength stops typing (and fill) at the limit, so a marker is swapped for an
    // over-long value in the POST body on the way out, like a hand-made request.
    const swapInRequest = async (marker: string, value: string) => {
      await page.route(`**/posts/${NOJS_ERRORS}`, async (route) => {
        const request = route.request();
        if (request.method() !== "POST") return route.fallback();
        await route.continue({ postData: (request.postData() ?? "").replace(marker, value) });
      });
    };

    await swapInRequest("@@LONGBODY@@", "b".repeat(2001));
    await fillForm(page, "Ann", "@@LONGBODY@@");
    await submitButton(page).click();
    await expect(alertRegion(page)).toContainText("too long");
    await expect(bodyField(page)).toHaveAttribute("aria-invalid", "true");
    expect((await bodyField(page).inputValue()).length).toBe(2001);
    await expect(nameField(page)).toHaveValue("Ann");
    await expect(items(page)).toHaveCount(before);
    await page.unroute(`**/posts/${NOJS_ERRORS}`);

    await swapInRequest("@@LONGNAME@@", "n".repeat(51));
    await fillForm(page, "@@LONGNAME@@", "fine");
    await submitButton(page).click();
    await expect(alertRegion(page)).toContainText("too long");
    await expect(nameField(page)).toHaveAttribute("aria-invalid", "true");
    expect((await nameField(page).inputValue()).length).toBe(51);
    await expect(bodyField(page)).toHaveValue("fine");
    await expect(items(page)).toHaveCount(before);
    await expectCountMatchesList(page);
  });
});
