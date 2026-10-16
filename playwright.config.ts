import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
// Throwaway store dir for the e2e server (gitignored), so e2e never touches the real .data/.
// The webServer command wipes it before building, so every fresh server starts empty.
const E2E_DATA_DIR = ".data-e2e";
// Its own build folder (next.config.ts reads NEXT_DIST_DIR), so e2e never overwrites the .next/ of `npm run dev`.
const E2E_DIST_DIR = ".next-e2e";
// E2E_SKIP_BUILD=1 reuses the last e2e build: for re-running tests after changing only tests/. Any change to the
// app needs a fresh build (the default), or the run tests stale code.
const SKIP_BUILD = process.env.E2E_SKIP_BUILD === "1";
const buildStep = SKIP_BUILD ? "" : "npx next build && ";

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
  // Locally 2 workers: at the default (half the cores) a Windows box ran first page loads past the 30s test
  // timeout, and each run failed a different set of tests. CI keeps the default.
  workers: process.env.CI ? undefined : 2,
  forbidOnly: !!process.env.CI,
  // One retry absorbs a real flake; two turned one broken test into three 30s timeouts per test.
  retries: process.env.CI ? 1 : 0,
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
    // Production build + start, like the real deploy, into .next-e2e/ (safe next to `npm run dev`).
    command: `node -e "require('node:fs').rmSync('${E2E_DATA_DIR}',{recursive:true,force:true})" && ${buildStep}npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/posts`,
    // Never reuse: a stray server on 3200 might not have BLOG_DATA_DIR set, and tests that
    // write (likes, views) would then hit the real .data/. If 3200 is busy, the run fails fast.
    reuseExistingServer: false,
    timeout: 300_000,
    env: { BLOG_DATA_DIR: E2E_DATA_DIR, NEXT_DIST_DIR: E2E_DIST_DIR },
  },
});
