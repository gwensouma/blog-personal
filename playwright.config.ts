import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
// Throwaway store dir for the e2e server (gitignored), so e2e never touches the real .data/.
// The webServer command wipes it before building, so every fresh server starts empty.
const E2E_DATA_DIR = ".data-e2e";

/**
 * Projects (Chromium only):
 * - `js`:    the default. Runs every test NOT tagged @no-js.
 * - `no-js`: `javaScriptEnabled: false`. Runs ONLY tests tagged @no-js.
 *
 * Convention: tag a test (or a whole describe) with `{ tag: "@no-js" }` to run it with
 * JavaScript disabled. A route's spec file can hold both its JS and no-JS checks.
 * Run one project with `npm run test:e2e -- --project=no-js`.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "js",
      grepInvert: /@no-js/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "no-js",
      grep: /@no-js/,
      use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
    },
  ],
  webServer: {
    // Production build + start, like the real deploy. Note: this rebuilds .next/, so don't
    // run it while `npm run dev` is using the same checkout.
    command: `node -e "require('node:fs').rmSync('${E2E_DATA_DIR}',{recursive:true,force:true})" && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/posts`,
    // Never reuse: a stray server on 3200 might not have BLOG_DATA_DIR set, and tests that
    // write (likes, views) would then hit the real .data/. If 3200 is busy, the run fails fast.
    reuseExistingServer: false,
    timeout: 300_000,
    env: { BLOG_DATA_DIR: E2E_DATA_DIR },
  },
});
