import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The doc registry ("Where does a doc go?" in CLAUDE.md). Every Markdown doc outside content/, specs and sprint
// folders is listed here with its kind and line budget, so docs can't silently grow or multiply.
type Kind = "living" | "index" | "log" | "reference" | "template";
const DOCS: Record<string, { kind: Kind; maxLines?: number }> = {
  "CLAUDE.md": { kind: "living", maxLines: 90 },
  "README.md": { kind: "living", maxLines: 60 },
  ".claude/rules/ui.md": { kind: "living", maxLines: 80 },
  ".claude/rules/data.md": { kind: "living", maxLines: 40 },
  ".claude/rules/tests.md": { kind: "living", maxLines: 30 },
  ".claude/agents/developer.md": { kind: "living", maxLines: 80 },
  ".claude/agents/planner.md": { kind: "living", maxLines: 70 },
  ".claude/agents/reviewer.md": { kind: "living", maxLines: 75 },
  ".claude/agents/tester.md": { kind: "living", maxLines: 70 },
  ".claude/skills/lead/SKILL.md": { kind: "living", maxLines: 220 },
  ".claude/skills/lead/guard-hook.md": { kind: "reference", maxLines: 60 },
  ".claude/skills/lead/claude-code-facts.md": { kind: "reference", maxLines: 80 },
  ".claude/skills/SKILLS.md": { kind: "reference", maxLines: 40 },
  ".claude/templates/brief.md": { kind: "template", maxLines: 40 },
  ".claude/templates/close.md": { kind: "template", maxLines: 40 },
  ".claude/templates/report.md": { kind: "template", maxLines: 40 },
  ".claude/templates/spec.md": { kind: "template", maxLines: 60 },
  ".claude/templates/task-developer.md": { kind: "template", maxLines: 40 },
  ".claude/templates/task-fix.md": { kind: "template", maxLines: 40 },
  ".claude/templates/task-reviewer.md": { kind: "template", maxLines: 40 },
  ".claude/templates/task-tester.md": { kind: "template", maxLines: 40 },
  ".design/product.md": { kind: "living", maxLines: 100 },
  ".design/roadmap.md": { kind: "index", maxLines: 60 },
  ".design/decisions.md": { kind: "log" },
  ".design/roadmap-archive.md": { kind: "log" },
};
const ROADMAP_SECTIONS = ["Sprints", "Backlog", "Waiting on the user"];
const INDEX_LINE_MAX = 220;

const root = path.resolve(__dirname, "../..");
// Records and machine-local folders: specs and sprints are frozen per feature; third-party skills are gitignored.
const SKIP = new Set([".design/specs", ".design/sprints", ".claude/worktrees"]);

function markdownUnder(dir: string): string[] {
  const full = path.join(root, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (SKIP.has(rel) || (dir === ".claude/skills" && entry.name !== "lead")) return [];
      return markdownUnder(rel);
    }
    return entry.name.endsWith(".md") ? [rel] : [];
  });
}

const linesOf = (rel: string) => readFileSync(path.join(root, rel), "utf8").split(/\r?\n/);

describe("doc registry", () => {
  it("registers every doc in .design/ and .claude/", () => {
    const unregistered = [...markdownUnder(".design"), ...markdownUnder(".claude")].filter((rel) => !(rel in DOCS));
    expect(unregistered).toEqual([]);
  });

  it("lists only docs that exist", () => {
    expect(Object.keys(DOCS).filter((rel) => !existsSync(path.join(root, rel)))).toEqual([]);
  });

  it("keeps every doc within its line budget", () => {
    const over = Object.entries(DOCS)
      .filter(([rel, { maxLines }]) => maxLines !== undefined && linesOf(rel).length > maxLines)
      .map(([rel, { maxLines }]) => `${rel}: ${linesOf(rel).length} > ${maxLines}`);
    expect(over).toEqual([]);
  });

  it("keeps living docs free of dates and per-sprint sections", () => {
    const dated = Object.entries(DOCS)
      .filter(([, { kind }]) => kind === "living")
      .flatMap(([rel]) =>
        linesOf(rel)
          .map((line, i) => ({ line, at: `${rel}:${i + 1}` }))
          .filter(({ line }) => /\b20\d\d-\d\d-\d\d\b|\b(sprint|phase) [0-9][0-9A-Z]*\b/i.test(line))
          .map(({ at }) => at),
      );
    expect(dated).toEqual([]);
  });
});

describe("roadmap index", () => {
  const lines = linesOf(".design/roadmap.md");

  it("has only the Sprints, Backlog and Waiting on the user sections", () => {
    expect(lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3).trim())).toEqual(ROADMAP_SECTIONS);
  });

  it("keeps every item on one short line", () => {
    const wrapped = lines.filter((line, i) => /^\s+\S/.test(line) && /^\s*- /.test(lines[i - 1] ?? ""));
    const long = lines.filter((line) => line.length > INDEX_LINE_MAX);
    expect({ wrapped, long }).toEqual({ wrapped: [], long: [] });
  });
});
