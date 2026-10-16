import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // e2e builds into its own folder (NEXT_DIST_DIR=.next-e2e, set in playwright.config.ts), so a test run
  // never overwrites the .next/ that `npm run dev` is using.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
