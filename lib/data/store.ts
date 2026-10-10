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
// Each key lives in its own file (.data/<key>.json), so a large table never
// slows writes to another. After the first read, an in-memory copy is the
// source of truth for this process; disk is only written, never re-read.
const STORE_DIR = path.join(process.cwd(), ".data");
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
  return path.join(STORE_DIR, `${key}.json`);
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
  await mkdir(STORE_DIR, { recursive: true });
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
