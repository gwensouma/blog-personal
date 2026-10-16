---
paths:
  - "tests/**"
  - "vitest.config.mts"
  - "playwright.config.ts"
---

# Test rules

- Unit tests: `tests/unit/<topic>.test.ts`, Vitest in Node, importing `lib/` directly. `server-only` is stubbed
  (`tests/stubs/`).
- E2E tests: `tests/e2e/<feature>.spec.ts`, Playwright against a production build in `.next-e2e/`. Tag a test `@no-js`
  to also run it in the JavaScript-disabled project. `E2E_SKIP_BUILD=1` reuses the last build when only `tests/` changed.
- Tests that use the store set `process.env.BLOG_DATA_DIR` to their own temp dir and call `resetStoreForTests()` from
  `lib/data/store.ts`. Never touch the real `.data/`.
- Assert behaviour a user or caller can observe, not implementation details. Wait on state, never on time.
- `test.fixme`/`.skip` only with a link to the sprint that removes it; never `.only` (the guard hook enforces both).
- Start servers on a free port and stop only the PID you started; never kill processes by image name.
