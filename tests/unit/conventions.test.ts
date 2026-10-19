import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// CLAUDE.md conventions that ESLint can't see because they are about file names, not code.
const root = path.resolve(__dirname, "../..");
const SOURCE_DIRS = ["app", "components", "lib", "types", "tests"];
// kebab-case words, then one or more extensions: post-list-item.tsx, guard-hook.test.ts
const KEBAB_FILE = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)+$/;
// Next route segments may also be (group), [param], [...param] or _private.
const SEGMENT = /^(\([a-z0-9-]+\)|\[(\.\.\.)?[a-z0-9-]+\]|_?[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)?)$/;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? [full, ...walk(full)] : [full];
  });
}

const entries = SOURCE_DIRS.flatMap((dir) => walk(path.join(root, dir))).map((full) => ({
  rel: path.relative(root, full).split(path.sep).join("/"),
  name: path.basename(full),
  isFile: /\.[a-z0-9]+$/i.test(path.basename(full)),
}));

describe("project conventions", () => {
  it("names every source file in kebab-case", () => {
    const bad = entries.filter((e) => e.isFile && !KEBAB_FILE.test(e.name)).map((e) => e.rel);
    expect(bad).toEqual([]);
  });

  it("names every source folder in kebab-case or as a Next route segment", () => {
    const bad = entries.filter((e) => !e.isFile && !SEGMENT.test(e.name)).map((e) => e.rel);
    expect(bad).toEqual([]);
  });

  it("has no index.ts barrel files", () => {
    const bad = entries.filter((e) => /^index\.tsx?$/.test(e.name)).map((e) => e.rel);
    expect(bad).toEqual([]);
  });
});

// The roadmap is an index (lead SKILL.md, "The roadmap"): plans go to specs, reasons to decisions.md, history to the
// archive. These checks stop it from growing back into a plan document.
describe("roadmap", () => {
  const lines = readFileSync(path.join(root, ".design/roadmap.md"), "utf8").split(/\r?\n/);

  it("stays short", () => {
    expect(lines.length).toBeLessThanOrEqual(60);
  });

  it("has only the Sprints, Backlog and Waiting on the user sections", () => {
    const sections = lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3).trim());
    expect(sections).toEqual(["Sprints", "Backlog", "Waiting on the user"]);
  });

  it("keeps every list item on one line", () => {
    const continued = lines.filter((line, i) => /^\s+\S/.test(line) && /^\s*- /.test(lines[i - 1] ?? ""));
    expect(continued).toEqual([]);
  });
});
