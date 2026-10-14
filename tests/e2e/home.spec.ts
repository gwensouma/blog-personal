import { expect, test } from "@playwright/test";

// JavaScript on: the home page keeps its section order after hydration.
test("home / renders the sections in order with JS on", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const order = ["Featured", "Latest posts", "Browse by topic", "Get the next post by email"];
  await expect(page.getByRole("heading", { level: 2, name: order[order.length - 1] })).toBeVisible();

  const headings = await page.getByRole("heading", { level: 2 }).allInnerTexts();
  const indexes = order.map((name) => headings.indexOf(name));
  for (const [i, index] of indexes.entries()) expect(index, `missing h2 "${order[i]}"`).toBeGreaterThanOrEqual(0);
  expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
});
