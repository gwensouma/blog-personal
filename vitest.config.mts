import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Mirrors tsconfig "paths": { "@/*": ["./*"] }.
      { find: /^@\//, replacement: `${root}/` },
      // `server-only` throws when imported outside a React Server environment.
      // Unit tests import lib/data/* directly, so swap it for an empty module.
      { find: /^server-only$/, replacement: path.join(root, "tests/stubs/server-only.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: {
      // Safety net: a test that touches lib/data/store.ts without choosing its own
      // dir still never writes to the real .data/. The dir is unique per run (this
      // config is evaluated once per `vitest` process), so runs never share state;
      // it lives in the OS temp dir and is not cleaned up. Tests that use the store
      // should set process.env.BLOG_DATA_DIR to their own temp dir (see the store notes).
      BLOG_DATA_DIR: path.join(os.tmpdir(), `rsc-blog-vitest-data-${process.pid}-${Date.now()}`),
    },
  },
});
