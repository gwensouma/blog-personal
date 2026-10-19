import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectShown } from "@/tests/e2e/helpers";

// Sprint 4: the "Up next" card and the deduped end of a post. Content-dependent tests use content/posts as
// the fixture (the table is in .design/specs/up-next.md); tests tagged @no-js run in both projects.

type Card = { slug: string; label: string; rel: "next" | "prev" | null };
type Case = {
  slug: string;
  ac: string;
  upNext: Card;
  /** Heading of the series nav ("<name>: previous part"), or null when none is rendered. */
  seriesNav: null | { text: string };
  /** Posts in the "Previous and next posts" nav, by slug: [older, newer]; null = absent slot. */
  adjacent: { previous: string | null; next: string | null };
  related: string[];
};

const TITLES: Record<string, string> = {
  "rsc-shrinks-your-bundle": "RSC helps shrink the JavaScript sent to the browser",
  "client-components-render-twice": "Client Components render on both server and client",
  "server-components-run-on-the-server": "Server Components run on the server",
  "streaming-with-suspense": "Streaming pages with Suspense",
  "server-actions-for-mutations": "Server Actions for mutations",
  "caching-in-the-app-router": "Caching in the App Router, untangled",
  "designing-the-rsc-boundary": "Designing the server/client boundary",
  "why-i-started-this-journal": "Why I started this journal",
};

const CASES: Case[] = [
  {
    slug: "client-components-render-twice",
    ac: "AC1",
    upNext: { slug: "rsc-shrinks-your-bundle", label: "Next in RSC Fundamentals · Part 3 of 3", rel: "next" },
    seriesNav: { text: "RSC Fundamentals, part 2 of 3" },
    adjacent: { previous: null, next: null },
    related: ["designing-the-rsc-boundary"],
  },
  {
    slug: "server-components-run-on-the-server",
    ac: "AC2",
    upNext: { slug: "client-components-render-twice", label: "Next in RSC Fundamentals · Part 2 of 3", rel: "next" },
    seriesNav: null,
    adjacent: { previous: "streaming-with-suspense", next: null },
    related: ["designing-the-rsc-boundary"],
  },
  {
    slug: "rsc-shrinks-your-bundle",
    ac: "AC3",
    upNext: { slug: "streaming-with-suspense", label: "Related reading", rel: null },
    seriesNav: { text: "RSC Fundamentals, final part (3 of 3)" },
    adjacent: { previous: null, next: null },
    related: ["caching-in-the-app-router", "designing-the-rsc-boundary"],
  },
  {
    slug: "streaming-with-suspense",
    ac: "AC4",
    upNext: { slug: "server-components-run-on-the-server", label: "Start the RSC Fundamentals series", rel: null },
    seriesNav: null,
    adjacent: { previous: "server-actions-for-mutations", next: null },
    related: ["rsc-shrinks-your-bundle", "caching-in-the-app-router"],
  },
  {
    slug: "why-i-started-this-journal",
    ac: "AC5",
    upNext: { slug: "designing-the-rsc-boundary", label: "Newer post", rel: "next" },
    seriesNav: null,
    adjacent: { previous: null, next: null },
    related: [],
  },
  {
    slug: "server-actions-for-mutations",
    ac: "AC5",
    upNext: { slug: "streaming-with-suspense", label: "Newer post", rel: "next" },
    seriesNav: null,
    adjacent: { previous: "caching-in-the-app-router", next: null },
    related: [],
  },
  // Not named in an AC, but in the spec table: both ends of the chronological nav at once.
  {
    slug: "caching-in-the-app-router",
    ac: "table",
    upNext: { slug: "server-components-run-on-the-server", label: "Start the RSC Fundamentals series", rel: null },
    seriesNav: null,
    adjacent: { previous: "designing-the-rsc-boundary", next: "server-actions-for-mutations" },
    related: ["rsc-shrinks-your-bundle", "streaming-with-suspense"],
  },
  {
    slug: "designing-the-rsc-boundary",
    ac: "table",
    upNext: { slug: "server-components-run-on-the-server", label: "Start the RSC Fundamentals series", rel: null },
    seriesNav: null,
    adjacent: { previous: "why-i-started-this-journal", next: "caching-in-the-app-router" },
    related: ["rsc-shrinks-your-bundle", "client-components-render-twice"],
  },
];

function excerptOf(slug: string): string {
  const file = fs.readFileSync(path.join(process.cwd(), "content", "posts", `${slug}.md`), "utf8");
  const match = file.match(/^excerpt:\s*(.+)$/m);
  if (!match) throw new Error(`no excerpt in ${slug}`);
  return match[1].trim().replace(/^["']|["']$/g, "");
}

const upNextRegion = (page: Page) => page.getByRole("region", { name: "Up next" });
const adjacentNav = (page: Page) => page.getByRole("navigation", { name: "Previous and next posts" });
const relatedSection = (page: Page) => page.locator('section[aria-labelledby="related-heading"]');

/** Scroll the block in and wait until a scroll reveal (JS project) has finished fading it in. */
async function revealed(page: Page) {
  const region = upNextRegion(page);
  await region.scrollIntoViewIfNeeded();
  await expect(region).toHaveCSS("opacity", "1");
  await expectShown(region);
}

test.describe("Up next card and post ending", { tag: "@no-js" }, () => {
  for (const c of CASES) {
    test(`content: ${c.ac} ${c.slug} ends with the right card and blocks`, async ({ page }) => {
      await page.goto(`/posts/${c.slug}`);
      await revealed(page);

      // The card: label, exactly one link with the exact title, href and rel.
      const region = upNextRegion(page);
      await expect(region.getByRole("heading", { level: 2, name: "Up next" })).toBeVisible();
      await expect(region.getByText(c.upNext.label, { exact: true })).toBeVisible();
      const links = region.getByRole("link");
      await expect(links).toHaveCount(1);
      const link = region.getByRole("link", { name: TITLES[c.upNext.slug], exact: true });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("href", `/posts/${c.upNext.slug}`);
      if (c.upNext.rel) await expect(link).toHaveAttribute("rel", c.upNext.rel);
      else await expect(link).not.toHaveAttribute("rel", /.*/);

      // Series nav: named "<series>: previous part", none on part 1 or outside a series.
      const seriesNav = page.getByRole("navigation", { name: /: previous part$/ });
      if (c.seriesNav) {
        await expect(seriesNav).toHaveCount(1);
        await expect(seriesNav).toHaveAccessibleName("RSC Fundamentals: previous part");
        await expect(seriesNav).toContainText(c.seriesNav.text);
        await expect(seriesNav.getByRole("link", { name: /Previous in series/ })).toHaveCount(1);
        await expect(seriesNav.getByRole("link", { name: /Next in series/ })).toHaveCount(0);
      } else {
        await expect(seriesNav).toHaveCount(0);
      }
      await expect(page.getByText("Next in series")).toHaveCount(0);

      // Prev/next nav: present only with at least one slot; older = previous, newer = next.
      const adjacent = adjacentNav(page);
      if (c.adjacent.previous || c.adjacent.next) {
        await expect(adjacent).toHaveCount(1);
        await expect(adjacent.getByRole("link")).toHaveCount([c.adjacent.previous, c.adjacent.next].filter(Boolean).length);
        if (c.adjacent.previous) {
          const prev = adjacent.getByRole("link", { name: new RegExp(`Previous post.*${escapeRegExp(TITLES[c.adjacent.previous])}`) });
          await expect(prev).toHaveAttribute("href", `/posts/${c.adjacent.previous}`);
          await expect(prev).toHaveAttribute("rel", "prev");
        }
        if (c.adjacent.next) {
          const next = adjacent.getByRole("link", { name: new RegExp(`Next post.*${escapeRegExp(TITLES[c.adjacent.next])}`) });
          await expect(next).toHaveAttribute("href", `/posts/${c.adjacent.next}`);
          await expect(next).toHaveAttribute("rel", "next");
        }
      } else {
        await expect(adjacent).toHaveCount(0);
      }

      // Related posts: absent when empty, else the table's posts in order.
      const related = relatedSection(page);
      if (c.related.length) {
        await expect(related).toHaveCount(1);
        await expect(related.getByRole("heading", { level: 2, name: "Related posts" })).toBeVisible();
        const hrefs = await related.getByRole("heading", { level: 3 }).getByRole("link").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
        expect(hrefs).toEqual(c.related.map((slug) => `/posts/${slug}`));
      } else {
        await expect(related).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "Related posts" })).toHaveCount(0);
      }

      // No post is linked twice across the ending (AC7, rendered side): read the hrefs off the page.
      const hrefsIn = (loc: ReturnType<Page["locator"]>) =>
        loc.evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
      const endingHrefs = [
        ...(await hrefsIn(upNextRegion(page).getByRole("link"))),
        ...(await hrefsIn(adjacentNav(page).getByRole("link"))),
        ...(await hrefsIn(relatedSection(page).getByRole("heading", { level: 3 }).getByRole("link"))),
      ];
      expect(endingHrefs.length).toBeGreaterThan(0);
      expect(new Set(endingHrefs).size, `duplicate in ${endingHrefs.join(", ")}`).toBe(endingHrefs.length);
      expect(endingHrefs).not.toContain(`/posts/${c.slug}`);
    });
  }

  test("AC9: the card is in the server HTML, visible, with label, title, excerpt and a working link", async ({ page }) => {
    for (const c of CASES.filter((x) => x.ac !== "table")) {
      await page.goto(`/posts/${c.slug}`);
      await revealed(page);
      const region = upNextRegion(page);
      await expectShown(region.getByText(c.upNext.label, { exact: true }));
      await expectShown(region.getByRole("heading", { level: 3, name: TITLES[c.upNext.slug] }));
      await expectShown(region.getByText(excerptOf(c.upNext.slug), { exact: true }));
      await expectShown(region.getByRole("link", { name: TITLES[c.upNext.slug], exact: true }));
      // Not a skeleton and not hidden by an inline style.
      await expect(region).not.toContainText("Loading");
      const inline = await region.evaluate((el) => el.getAttribute("style") ?? "");
      expect(inline).not.toMatch(/opacity:\s*0(?![.\d])/);
    }
  });

  test("AC9: following the card link loads the target post", async ({ page }) => {
    await page.goto("/posts/client-components-render-twice");
    await revealed(page);
    await upNextRegion(page).getByRole("link", { name: TITLES["rsc-shrinks-your-bundle"], exact: true }).click();
    await expect(page).toHaveURL(/\/posts\/rsc-shrinks-your-bundle$/);
    await expectShown(page.getByRole("heading", { level: 1, name: TITLES["rsc-shrinks-your-bundle"] }));

    // And through a fallback card ("Newer post").
    await page.goto("/posts/why-i-started-this-journal");
    await revealed(page);
    await upNextRegion(page).getByRole("link", { name: TITLES["designing-the-rsc-boundary"], exact: true }).click();
    await expect(page).toHaveURL(/\/posts\/designing-the-rsc-boundary$/);
    await expectShown(page.getByRole("heading", { level: 1, name: TITLES["designing-the-rsc-boundary"] }));
  });

  for (const c of CASES) {
    test(`content: AC8 ${c.slug} ends in the order footer, Up next, newsletter, prev/next, related`, async ({ page }) => {
      await page.goto(`/posts/${c.slug}`);
      await expect(page.getByRole("heading", { level: 1, name: TITLES[c.slug] })).toBeVisible();
      const order = await page.evaluate(() => {
        const names: [string, string][] = [
          ["footer", "article#post-article > footer"],
          ["up-next", 'section[aria-labelledby="up-next-heading"]'],
          ["newsletter", 'section[aria-labelledby="newsletter-heading"]'],
          ["adjacent", 'nav[aria-label="Previous and next posts"]'],
          ["related", 'section[aria-labelledby="related-heading"]'],
        ];
        const found = names.flatMap(([name, selector]) => {
          const el = document.querySelector(selector);
          return el ? [{ name, el }] : [];
        });
        // Sort by document position, not by the list above.
        found.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        return found.map((f) => f.name);
      });
      const expected = ["footer", "up-next", "newsletter"];
      if (c.adjacent.previous || c.adjacent.next) expected.push("adjacent");
      if (c.related.length) expected.push("related");
      expect(order).toEqual(expected);
    });
  }
});

test.describe("Up next card, keyboard and motion", () => {
  const SLUG = "client-components-render-twice";
  const card = (page: Page) => upNextRegion(page).locator("article");
  const titleLink = (page: Page) => upNextRegion(page).getByRole("link", { name: TITLES["rsc-shrinks-your-bundle"], exact: true });
  const inRegion = (page: Page) =>
    page.evaluate(() => !!document.activeElement?.closest('section[aria-labelledby="up-next-heading"]'));

  test("AC10: one tab stop (the title link), with a focus indication on the card", async ({ page }) => {
    await page.goto(`/posts/${SLUG}`);
    await expect(card(page)).toHaveCount(1);

    // Static: exactly one tabbable element in the region.
    const tabbable = await upNextRegion(page).evaluate(
      (el) => el.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])').length,
    );
    expect(tabbable).toBe(1);

    const restBorder = await card(page).evaluate((el) => getComputedStyle(el).borderTopColor);
    const restShadow = await card(page).evaluate((el) => getComputedStyle(el).boxShadow);

    // Dynamic: arrive from the keyboard. Focus the element before the card's link, then Tab onto it.
    await titleLink(page).focus();
    await page.keyboard.press("Shift+Tab");
    expect(await inRegion(page), "Shift+Tab leaves the card").toBe(false);
    await page.keyboard.press("Tab");
    await expect(titleLink(page)).toBeFocused();

    // Focus indication on the card itself: ring (box-shadow) and the primary border.
    await expect.poll(() => card(page).evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe(restShadow);
    await expect.poll(() => card(page).evaluate((el) => getComputedStyle(el).borderTopColor)).not.toBe(restBorder);

    // One more Tab leaves the card: no second stop (cover and chip are not focusable).
    await page.keyboard.press("Tab");
    expect(await inRegion(page), "Tab leaves the card").toBe(false);
  });

  // The zooming element: the real cover <img>, or the default cover's aria-hidden div.
  const coverContent = (page: Page) => card(page).locator('> div > :is(img, div[aria-hidden="true"])').first();
  const chip = (page: Page) => card(page).locator("span.size-10");
  const styleOf = (page: Page, which: "card" | "cover" | "chip", prop: "translate" | "scale") =>
    (which === "card" ? card(page) : which === "cover" ? coverContent(page) : chip(page)).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

  async function waitSettled(page: Page) {
    // The cover plays a one-off entrance zoom; wait on the state, not on time.
    await expect.poll(() => styleOf(page, "cover", "scale")).toBe("none");
  }

  test("AC10: with reduced motion the card does not lift, zoom or slide on hover or focus", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/posts/${SLUG}`);
    await upNextRegion(page).scrollIntoViewIfNeeded();
    await waitSettled(page);
    await expect(card(page)).toBeVisible();
    for (const which of ["card", "chip"] as const) expect(await styleOf(page, which, "translate"), which).toBe("none");

    // Hover.
    await card(page).hover();
    // Prove the hover state applied (the border turns primary) so "none" is not a missed trigger.
    await expect.poll(() => card(page).evaluate((el) => getComputedStyle(el).borderTopColor)).not.toBe(
      await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--border")),
    );
    await expect.poll(() => styleOf(page, "card", "translate")).toBe("none");
    expect(await styleOf(page, "cover", "scale")).toBe("none");
    expect(await styleOf(page, "chip", "translate")).toBe("none");

    // Keyboard focus.
    await page.mouse.move(0, 0);
    await titleLink(page).focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(titleLink(page)).toBeFocused();
    await expect.poll(() => card(page).evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");
    expect(await styleOf(page, "card", "translate")).toBe("none");
    expect(await styleOf(page, "cover", "scale")).toBe("none");
    expect(await styleOf(page, "chip", "translate")).toBe("none");
  });

  test("AC10: without reduced motion hover lifts, zooms and slides (so the reduced test can fail)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/posts/${SLUG}`);
    await upNextRegion(page).scrollIntoViewIfNeeded();
    await waitSettled(page);
    expect(await styleOf(page, "card", "translate")).toBe("none");
    await card(page).hover();
    await expect.poll(() => styleOf(page, "card", "translate")).not.toBe("none");
    await expect.poll(() => styleOf(page, "chip", "translate")).not.toBe("none");
    await expect.poll(() => styleOf(page, "cover", "scale")).not.toBe("none");
  });

  test("the whole card is clickable, not only the title (the stretched link)", async ({ page }) => {
    await page.goto(`/posts/${SLUG}`);
    await upNextRegion(page).scrollIntoViewIfNeeded();
    // Click inside the top edge (under the primary sweep bar, away from the rounded corners) and then the cover:
    // the click must reach the link, not be swallowed by the decoration.
    const box = await card(page).boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + 3);
    await expect(page).toHaveURL(/\/posts\/rsc-shrinks-your-bundle$/);
    await page.goBack();
    await upNextRegion(page).scrollIntoViewIfNeeded();
    const cover = await card(page).boundingBox();
    await page.mouse.click(cover!.x + 40, cover!.y + 40);
    await expect(page).toHaveURL(/\/posts\/rsc-shrinks-your-bundle$/);
  });

  test("XSS-safe by construction: the card renders titles as text (no injected elements)", async ({ page }) => {
    await page.goto(`/posts/${SLUG}`);
    await expect(card(page).locator("script, iframe, img[onerror]")).toHaveCount(0);
  });
});

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
