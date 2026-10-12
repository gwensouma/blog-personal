import { expect, test } from "@playwright/test";
import { expectShown } from "@/tests/e2e/helpers";

// Every test here runs in the `no-js` project (javaScriptEnabled: false): essential content must
// be in the server HTML and visible, and forms must work as plain GETs.
// Content-dependent assertions use content/posts as the fixture and say so in their names.

test.describe("without JavaScript", { tag: "@no-js" }, () => {
  test("content: /posts shows the post list under year headings", async ({ page }) => {
    await page.goto("/posts");
    await expectShown(page.getByRole("heading", { level: 1, name: "Archive" }));

    // Page 1 = the 5 newest posts, all from 2026 (6 that year in total).
    const year2026 = page.getByRole("heading", { level: 2, name: /^2026/ });
    await expectShown(year2026);
    await expect(year2026).toContainText("5 of 6 posts");

    const titles = page.getByRole("heading", { level: 3 });
    await expect(titles).toHaveCount(5);
    for (const title of await titles.all()) await expectShown(title);
    await expectShown(page.getByRole("link", { name: "RSC helps shrink the JavaScript sent to the browser" }));
  });

  test("content: /posts?page=2 marks 2026 as continued and shows 2025", async ({ page }) => {
    await page.goto("/posts?page=2");
    const year2026 = page.getByRole("heading", { level: 2, name: /^2026/ });
    await expectShown(year2026);
    await expect(year2026).toContainText("continued");
    await expect(year2026).toContainText("1 of 6 posts");
    const year2025 = page.getByRole("heading", { level: 2, name: /^2025/ });
    await expectShown(year2025);
    await expect(year2025).toContainText("2 posts");
    await expect(year2025).not.toContainText("continued");
  });

  test("/posts with an out-of-range or malformed page is a 404", async ({ page }) => {
    for (const query of ["?page=3", "?page=0", "?page=abc", "?page=-1", "?page=1.5"]) {
      const response = await page.goto(`/posts${query}`);
      expect(response?.status(), query).toBe(404);
    }
  });

  test("content: a series post shows its body, the 'Part 2 of 3' box and the series nav", async ({ page }) => {
    await page.goto("/posts/client-components-render-twice");
    await expectShown(page.getByRole("heading", { level: 1, name: "Client Components render on both server and client" }));

    // Article body: real paragraphs from the Markdown, not a skeleton.
    const article = page.locator("article#post-article");
    const firstParagraph = article.locator("p").filter({ hasText: /\w{4,}/ }).nth(2);
    await expectShown(firstParagraph);
    expect((await article.innerText()).length).toBeGreaterThan(800);

    const box = page.getByRole("navigation", { name: "RSC Fundamentals: all parts" });
    await expectShown(box);
    await expect(box).toContainText("Part 2 of 3 in a series");
    await expect(box.getByRole("listitem")).toHaveCount(3);
    await expect(box.locator('[aria-current="page"]')).toHaveText("Client Components render on both server and client");
    await expect(box.getByRole("link", { name: "Server Components run on the server" })).toHaveAttribute(
      "href",
      "/posts/server-components-run-on-the-server",
    );

    const seriesNav = page.getByRole("navigation", { name: "RSC Fundamentals: previous and next part" });
    await expectShown(seriesNav);
    await expect(seriesNav).toContainText("RSC Fundamentals, part 2 of 3");
    await expect(seriesNav.getByRole("link", { name: /Previous in series.*Server Components run on the server/ })).toBeVisible();
    await expect(seriesNav.getByRole("link", { name: /Next in series.*RSC helps shrink/ })).toBeVisible();
  });

  test("content: the last series part says 'final part' and has no next link", async ({ page }) => {
    await page.goto("/posts/rsc-shrinks-your-bundle");
    const seriesNav = page.getByRole("navigation", { name: "RSC Fundamentals: previous and next part" });
    await expect(seriesNav).toContainText("RSC Fundamentals, final part (3 of 3)");
    await expect(seriesNav.getByRole("link", { name: /Next in series/ })).toHaveCount(0);
  });

  test("an unknown post slug is a 404", async ({ page }) => {
    const response = await page.goto("/posts/does-not-exist");
    expect(response?.status()).toBe(404);
  });

  test("content: /search?q=server shows results with <mark> highlights", async ({ page }) => {
    await page.goto("/search?q=server");
    const status = page.getByRole("status").filter({ hasText: /results? for “server”/ });
    await expectShown(status);
    const marks = page.locator("main mark");
    expect(await marks.count()).toBeGreaterThan(0);
    await expectShown(marks.first());
    for (const text of await marks.allInnerTexts()) expect(text.toLowerCase()).toBe("server");
    await expect(page.getByRole("searchbox", { name: "Search posts" })).toHaveValue("server");
  });

  test("content: /search?q=server&tag=fundamentals narrows the results to that topic", async ({ page }) => {
    await page.goto("/search?q=server");
    const allCount = await resultCount(page);

    await page.goto("/search?q=server&tag=fundamentals");
    const status = page.getByRole("status").filter({ hasText: /for “server” in Fundamentals/ });
    await expectShown(status);
    const filteredCount = await resultCount(page);
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(allCount);

    const filters = page.getByRole("navigation", { name: "Filter by topic" });
    await expect(filters.getByRole("link", { name: /^Fundamentals, \d+ results?$/ })).toHaveAttribute("aria-current", "page");
    await expect(filters.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current", "page");
    // Facet counts are counted before the topic filter, so the active chip's count matches the hits.
    await expect(filters.getByRole("link", { name: `Fundamentals, ${filteredCount} ${filteredCount === 1 ? "result" : "results"}` })).toBeVisible();
  });

  test("content: the search form submits as a GET without JS and keeps the active topic", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("searchbox", { name: "Search posts" }).fill("suspense");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/\/search\?q=suspense$/);
    await expectShown(page.getByRole("status").filter({ hasText: /for “suspense”/ }));

    // With a topic active, a new query keeps it (hidden field).
    await page.goto("/search?q=server&tag=fundamentals");
    await page.getByRole("searchbox", { name: "Search posts" }).fill("component");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/\/search\?tag=fundamentals&q=component$/);
    await expectShown(page.getByRole("status").filter({ hasText: /for “component” in Fundamentals/ }));
  });

  test("content: /tags lists every tag with its post count", async ({ page }) => {
    await page.goto("/tags");
    await expectShown(page.getByRole("heading", { level: 1, name: "Tags" }));
    const performance = page.getByRole("link", { name: /Performance\s*3 posts/ });
    await expectShown(performance);
    await expect(performance).toHaveAttribute("href", "/tags/performance");
    await expectShown(page.getByRole("link", { name: /Meta\s*1 post$/ }));
  });

  // Known bug: on the prerendered (ISR) home page the <Suspense> sections are hidden templates revealed by an
  // inline script, so without JS they never show up. Tracked in .design/roadmap.md, sprint 8 (fix/home-no-js).
  // Remove .fixme once that lands.
  test.fixme("home / shows featured, latest and Most read without JS", async ({ page, request }) => {
    // Give a non-featured post a view so "Most read" has something to show.
    await request.get("/posts/streaming-with-suspense");
    await page.goto("/");
    await expectShown(page.getByRole("heading", { level: 2, name: "Featured" }));
    await expectShown(page.getByRole("link", { name: "Server Components run on the server" }).first());
    await expectShown(page.getByRole("heading", { level: 2, name: "Latest posts" }));
    await expectShown(page.getByRole("heading", { level: 2, name: "Most read" }));
  });
});

async function resultCount(page: import("@playwright/test").Page): Promise<number> {
  const text = await page.getByRole("status").filter({ hasText: /results? for “/ }).innerText();
  const match = text.match(/^(\d+) results?/);
  expect(match, `status text: ${text}`).not.toBeNull();
  return Number(match![1]);
}
