import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Tiny JSON-file key/value store standing in for a real database while learning.
// Everything that persists user data (likes, views, newsletter) goes through
// readStore/updateStore, so swapping in SQLite, Postgres or a hosted KV only
// changes this file. Note: serverless hosts have a read-only filesystem, so
// replace this adapter before deploying there.
//
// Each key lives in its own file (<data dir>/<key>.json), so a large table never
// slows writes to another. After the first read, an in-memory copy is the
// source of truth for this process; disk is only written, never re-read.
//
// The data dir is `.data/` under the project root unless BLOG_DATA_DIR is set
// (absolute, or relative to the cwd). Tests and the e2e server use it to keep
// the real `.data/` untouched. It is read on every access rather than once at
// import, so a test file can set it before its first store call.
function storeDir(): string {
  return path.resolve(process.cwd(), process.env.BLOG_DATA_DIR || ".data");
}
const KEY_PATTERN = /^[a-zA-Z0-9-]+$/;

// Next bundles this module more than once (page renders and Server Actions get
// separate copies), so module-level state would split into stale caches that
// overwrite each other. Keep the cache and write queues on globalThis instead,
// so every copy in the process shares them.
type StoreState = {
  memory: Map<string, unknown>;
  // One promise chain per key serializes updates so concurrent writes can't lose data.
  queues: Map<string, Promise<unknown>>;
};
const globalStore = globalThis as typeof globalThis & { __rscJournalStore?: StoreState };
globalStore.__rscJournalStore ??= { memory: new Map(), queues: new Map() };
const { memory, queues } = globalStore.__rscJournalStore;

function fileFor(key: string): string {
  if (!KEY_PATTERN.test(key)) throw new Error(`Invalid store key: ${key}`);
  return path.join(storeDir(), `${key}.json`);
}

async function load<T>(key: string, fallback: T): Promise<T> {
  if (memory.has(key)) return memory.get(key) as T;
  let value: T = fallback;
  try {
    value = JSON.parse(await readFile(fileFor(key), "utf8")) as T;
  } catch (error) {
    // A missing file is a fresh store. A corrupt one must not take every page down,
    // but keep it aside so the next write doesn't silently destroy the old data.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      const backup = fileFor(key).replace(/\.json$/, `.corrupt-${Date.now()}.json`);
      await rename(fileFor(key), backup).catch(() => undefined);
      console.error(`[store] Could not read "${key}"; moved it to ${backup} and started empty.`, error);
    }
  }
  memory.set(key, value);
  return value;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Write to a temp file and rename, so a crash never leaves half-written JSON.
// On Windows, rename fails with EPERM/EBUSY while another process has the file
// open (an editor, a test script), so retry briefly before giving up.
async function persist(key: string, value: unknown): Promise<void> {
  const file = fileFor(key);
  // Unique per write, so two writers can never rename each other's temp file away.
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(temp, JSON.stringify(value, null, 2));
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(temp, file);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= 5 || (code !== "EPERM" && code !== "EBUSY")) {
        await unlink(temp).catch(() => undefined);
        throw error;
      }
      await sleep(20 * 2 ** attempt);
    }
  }
}

export async function readStore<T>(key: string, fallback: T): Promise<T> {
  await queues.get(key);
  return load(key, fallback);
}

export function updateStore<T>(key: string, fallback: T, update: (value: T) => T): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).then(async () => {
    const next = update(await load(key, fallback));
    // Persist first: if the write fails, memory still matches disk and the caller sees the error.
    await persist(key, next);
    memory.set(key, next);
    return next;
  });
  queues.set(
    key,
    run.catch(() => undefined),
  );
  return run;
}

// TEST-ONLY: forgets the in-memory copy and write queues so the next read goes
// back to disk (in whatever BLOG_DATA_DIR now points at). The state lives on
// globalThis, so it survives module re-imports; this is the only way to start
// clean. Await every pending updateStore() call before resetting. Never call
// this from app code: in a running server it would drop in-flight serialization.
export function resetStoreForTests(): void {
  if (!process.env.VITEST) throw new Error("resetStoreForTests is test-only");
  memory.clear();
  queues.clear();
}
