import { expect, test, type Page } from "@playwright/test";

// JS-on flows (the `js` project). A reused local server keeps likes and views between runs,
// so like counts are asserted relative to the value before the click, never absolutely.

// Used by no other spec, so parallel tests don't move its like count.
const LIKE_SLUG = "server-actions-for-mutations";

const likeButton = (page: Page) => page.getByRole("button", { name: /^Like\b/ });

/** The count from the button's accessible name: "Like , 3 likes" → 3. */
async function likeCount(page: Page): Promise<number> {
  const name = (await likeButton(page).textContent()) ?? "";
  const match = name.match(/,\s*(\d+)\s+likes?/);
  expect(match, `like button text: ${name}`).not.toBeNull();
  return Number(match![1]);
}

/**
 * Waits until React has hydrated `selector` (it gets a __reactFiber$ property), so its event
 * handlers exist. Waits on state, not on network idleness or time.
 * Relies on React's internal `__reactFiber$` key: if these tests time out after a React upgrade, check this first.
 */
async function waitForHydration(page: Page, selector: string) {
  await expect
    .poll(() =>
      page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return !!element && Object.keys(element).some((key) => key.startsWith("__reactFiber$"));
      }, selector),
    )
    .toBe(true);
}

/** Resolves when the setLikeAction Server Action POST has answered. */
const actionResponse = (page: Page) =>
  page.waitForResponse((response) => response.request().method() === "POST" && !!response.request().headers()["next-action"]);

test("the like button toggles, and stays toggled after a reload (cookie)", async ({ page }) => {
  await page.goto(`/posts/${LIKE_SLUG}`);
  const button = likeButton(page);
  // Fresh browser context: no liked_posts cookie yet.
  await expect(button).toHaveAttribute("aria-pressed", "false");
  const before = await likeCount(page);

  // The click handler only exists once React has hydrated the leaf.
  await waitForHydration(page, "button[aria-pressed]");

  let done = actionResponse(page);
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  expect(await likeCount(page)).toBe(before + 1);
  expect((await done).ok()).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: "Couldn't save your like" })).toHaveCount(0);

  await page.reload();
  await expect(likeButton(page)).toHaveAttribute("aria-pressed", "true");
  expect(await likeCount(page)).toBeGreaterThanOrEqual(1);

  // Unlike: back to the original state, and that persists too.
  await waitForHydration(page, "button[aria-pressed]");
  const likedCount = await likeCount(page);
  done = actionResponse(page);
  await likeButton(page).click();
  await expect(likeButton(page)).toHaveAttribute("aria-pressed", "false");
  expect(await likeCount(page)).toBe(likedCount - 1);
  expect((await done).ok()).toBe(true);

  await page.reload();
  await expect(likeButton(page)).toHaveAttribute("aria-pressed", "false");
});

test("content: Control+K opens the command palette and finds a post by title", async ({ page }) => {
  await page.goto("/posts");
  // The shortcut listener is attached on hydration.
  await waitForHydration(page, 'a[aria-keyshortcuts]');

  await page.keyboard.press("Control+K");
  const dialog = page.getByRole("dialog", { name: "Search the journal" });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole("combobox");
  await expect(input).toBeFocused();

  await input.fill("streaming pages");
  const option = dialog.getByRole("option", { name: /Streaming pages with Suspense/ });
  await expect(option).toBeVisible();
  // The every-word filter: an unrelated post title isn't offered.
  await expect(dialog.getByRole("option", { name: /Caching in the App Router/ })).toHaveCount(0);

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/posts\/streaming-with-suspense$/);
  await expect(page.getByRole("heading", { level: 1, name: "Streaming pages with Suspense" })).toBeVisible();
  await expect(dialog).toBeHidden();
});

test("Control+K toggles the palette closed again, and Escape closes it", async ({ page }) => {
  await page.goto("/posts");
  await waitForHydration(page, 'a[aria-keyshortcuts]');
  const dialog = page.getByRole("dialog", { name: "Search the journal" });

  await page.keyboard.press("Control+K");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Control+K");
  await expect(dialog).toBeHidden();

  await page.keyboard.press("Control+K");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test.describe("XSS through the search query", () => {
  const payloads = ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>", '"><svg onload=alert(1)>'];

  for (const payload of payloads) {
    test(`renders ${payload} as text`, async ({ page }) => {
      const dialogs: string[] = [];
      page.on("dialog", async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.dismiss();
      });

      await page.goto(`/search?q=${encodeURIComponent(payload)}`);
      // Let hydration (and anything it might execute) run before checking.
      await waitForHydration(page, "#search-query");

      // Shown verbatim as text in the status and the input.
      await expect(page.getByRole("status").filter({ hasText: `No results for “${payload}”` })).toBeAttached();
      await expect(page.getByRole("searchbox", { name: "Search posts" })).toHaveValue(payload);
      await expect(page.getByText(`Nothing matches “${payload}”`, { exact: true })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(`^Search: ${escapeRegExp(payload)}`));

      // No element created from the payload.
      const injected = await page.evaluate(() => ({
        scripts: [...document.querySelectorAll("script")].filter((s) => s.textContent?.trim() === "alert(1)").length,
        images: document.querySelectorAll('img[src="x"], img[onerror]').length,
        svgs: document.querySelectorAll("svg[onload]").length,
        handlers: [...document.querySelectorAll("*")].filter((el) => [...el.attributes].some((a) => /^on/i.test(a.name))).length,
      }));
      expect(injected).toEqual({ scripts: 0, images: 0, svgs: 0, handlers: 0 });
      expect(dialogs).toEqual([]);
    });
  }
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
