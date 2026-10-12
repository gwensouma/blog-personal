import { mkdtempSync, rmSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readStore, resetStoreForTests, updateStore } from "@/lib/data/store";

// Every store call in this file reads/writes this temp dir, never the real .data/.
const dataDir = mkdtempSync(path.join(os.tmpdir(), "rsc-blog-store-"));
process.env.BLOG_DATA_DIR = dataDir;

beforeEach(() => resetStoreForTests());
afterEach(() => {
  resetStoreForTests();
  vi.restoreAllMocks();
});
afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

type Counter = { count: number };
const increment = (value: Counter): Counter => ({ count: value.count + 1 });

describe("store: concurrent updates", () => {
  it("20 concurrent increments on one key all land, in memory and on disk", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => updateStore<Counter>("concurrent", { count: 0 }, increment)));

    // Each update saw the previous one's result, so the returned values are 1..20.
    expect(results.map((r) => r.count).sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(await readStore<Counter>("concurrent", { count: 0 })).toEqual({ count: 20 });

    const onDisk = JSON.parse(await readFile(path.join(dataDir, "concurrent.json"), "utf8"));
    expect(onDisk).toEqual({ count: 20 });

    // No temp files left behind by the atomic write.
    const leftovers = (await readdir(dataDir)).filter((file) => file.startsWith("concurrent") && file.endsWith(".tmp"));
    expect(leftovers).toEqual([]);
  });

  it("a fresh process (reset memory) reads the persisted value back from disk", async () => {
    await updateStore<Counter>("persisted", { count: 0 }, () => ({ count: 7 }));
    resetStoreForTests();
    expect(await readStore<Counter>("persisted", { count: 0 })).toEqual({ count: 7 });
  });

  it("a throwing updater rejects that call but doesn't block later updates on the same key", async () => {
    await updateStore<Counter>("recover", { count: 0 }, increment);
    await expect(
      updateStore<Counter>("recover", { count: 0 }, () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await updateStore<Counter>("recover", { count: 0 }, increment)).toEqual({ count: 2 });
  });

  it("a missing file starts from the fallback without creating a .corrupt backup", async () => {
    expect(await readStore<Counter>("never-written", { count: 42 })).toEqual({ count: 42 });
    const files = await readdir(dataDir);
    expect(files.some((file) => file.startsWith("never-written"))).toBe(false);
  });
});

describe("store: corrupt file", () => {
  it("moves a corrupt JSON file aside to <key>.corrupt-*.json and starts from the fallback", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await writeFile(path.join(dataDir, "broken.json"), "{ this is not json");

    expect(await readStore<Counter>("broken", { count: 0 })).toEqual({ count: 0 });

    const files = await readdir(dataDir);
    const backups = files.filter((file) => /^broken\.corrupt-\d+\.json$/.test(file));
    expect(backups).toHaveLength(1);
    // The old bytes are preserved in the backup, not destroyed.
    expect(await readFile(path.join(dataDir, backups[0]), "utf8")).toBe("{ this is not json");
    expect(files).not.toContain("broken.json");
    expect(errorSpy).toHaveBeenCalled();

    // The next write starts from the fallback and the backup survives it.
    expect(await updateStore<Counter>("broken", { count: 0 }, increment)).toEqual({ count: 1 });
    const after = await readdir(dataDir);
    expect(after).toContain("broken.json");
    expect(after).toContain(backups[0]);
  });
});

describe("store: key validation", () => {
  const badKeys = ["../x", "a/b", "a\\b", "..", "", "x.json", "a b", "café", "key\u0000"];

  it.each(badKeys)("readStore rejects the invalid key %j", async (key) => {
    await expect(readStore(key, {})).rejects.toThrow(/Invalid store key/);
  });

  it.each(badKeys)("updateStore rejects the invalid key %j", async (key) => {
    await expect(updateStore(key, {}, (v) => v)).rejects.toThrow(/Invalid store key/);
  });

  it("writes nothing outside the data dir for a traversal key", async () => {
    const parent = path.dirname(dataDir);
    await expect(updateStore("../escape", { x: 1 }, (v) => v)).rejects.toThrow();
    const parentFiles = await readdir(parent);
    expect(parentFiles).not.toContain("escape.json");
  });

  it("accepts letters, digits and dashes", async () => {
    await expect(updateStore("Post-Stats-2", { n: 1 }, (v) => v)).resolves.toEqual({ n: 1 });
  });
});
