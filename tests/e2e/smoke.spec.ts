import { expect, test } from "@playwright/test";

// One check per project: untagged runs in "js", tagged @no-js runs in "no-js".
test("archive renders its heading", async ({ page }) => {
  await page.goto("/posts");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("archive renders its heading without JavaScript", { tag: "@no-js" }, async ({ page }) => {
  await page.goto("/posts");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
