import { expect, test } from "@playwright/test";

// Links styled as buttons stay links: none of them may carry role="button". The one
// exception is the header's search trigger: with JS it opens the command palette
// (aria-haspopup="dialog"), so it acts as a button; /search is only its no-JS fallback.
const linkAsButton = 'a[role="button"]:not([aria-haspopup="dialog"])';
const pagesWithButtonLinks = ["/", "/posts", "/about", "/posts/caching-in-the-app-router", "/tags/performance", "/no-such-page"];

for (const url of pagesWithButtonLinks) {
  test(`a11y: ${url} has no link exposed as a button`, async ({ page }) => {
    await page.goto(url);
    await expect(page.locator(linkAsButton)).toHaveCount(0);
  });
}

test("a11y: /search empty states title themselves with a heading", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByRole("heading", { level: 2, name: "Search the journal" })).toBeVisible();

  await page.goto("/search?q=zzqxnomatch");
  await expect(page.getByRole("heading", { level: 2, name: "Nothing matches “zzqxnomatch”" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse the archive" })).toBeVisible();
});
