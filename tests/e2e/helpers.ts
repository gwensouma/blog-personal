import { expect, type Locator } from "@playwright/test";

/**
 * Visible AND not faded out. Playwright's toBeVisible treats opacity: 0 as visible, but a reveal
 * wrapper stuck at opacity 0 (no JS, failed hydration) hides content from a reader all the same.
 * Checks the element and every ancestor.
 */
export async function expectShown(locator: Locator) {
  await expect(locator).toBeVisible();
  const faded = await locator.evaluate((element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      if (Number(getComputedStyle(node).opacity) === 0) return node.outerHTML.slice(0, 120);
    }
    return null;
  });
  expect(faded, "element or an ancestor has opacity: 0").toBeNull();
}
