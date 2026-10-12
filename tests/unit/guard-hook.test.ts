import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Black-box tests for the PreToolUse hook in .claude/hooks/guard-paths.mjs: feed it the hook JSON on
// stdin and check the exit code (2 = blocked, 0 = allowed).
const root = path.resolve(__dirname, "../..");
const hook = path.join(root, ".claude/hooks/guard-paths.mjs");

// Built from parts so this file doesn't itself trip the hook when someone edits it.
const FIXME = "test." + "fixme(";
const SKIP = "test." + "skip(";
const ONLY = "test." + "only(";

type Event = { tool_name: string; agent_type?: string; tool_input: Record<string, unknown> };

function run(event: Event) {
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify(event),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    encoding: "utf8",
  });
  return { code: result.status, stderr: result.stderr };
}

const write = (agent: string | undefined, file_path: string, content = "x") =>
  run({ tool_name: "Write", agent_type: agent, tool_input: { file_path, content } });
const edit = (agent: string | undefined, file_path: string, old_string: string, new_string: string) =>
  run({ tool_name: "Edit", agent_type: agent, tool_input: { file_path, old_string, new_string } });
const bash = (agent: string | undefined, command: string) =>
  run({ tool_name: "Bash", agent_type: agent, tool_input: { command } });

describe("guard-paths hook: file ownership", () => {
  it("lets the tester write under tests/ only", () => {
    expect(write("tester", "tests/unit/new.test.ts").code).toBe(0);
    expect(write("tester", path.join(root, "tests", "e2e", "a.spec.ts")).code).toBe(0);
    const blocked = write("tester", "lib/data/posts.ts");
    expect(blocked.code).toBe(2);
    expect(blocked.stderr).toContain("lib/data/posts.ts");
  });

  it("blocks every write from the reviewer", () => {
    expect(write("reviewer", "components/posts/up-next.tsx").code).toBe(2);
    expect(write("reviewer", "tests/unit/x.test.ts").code).toBe(2);
  });

  it("keeps developer and builder out of tests/", () => {
    expect(write("developer", "tests/unit/posts.test.ts").code).toBe(2);
    expect(write("builder", "tests/e2e/no-js.spec.ts").code).toBe(2);
    expect(write("developer", "lib/data/posts.ts").code).toBe(0);
    expect(write("builder", "components/posts/up-next.tsx").code).toBe(0);
  });

  it("does not police files outside the project", () => {
    expect(write("tester", path.join(path.dirname(root), "elsewhere", "tmp.txt")).code).toBe(0);
  });

  it("leaves the main session's ordinary writes alone", () => {
    expect(write(undefined, "CLAUDE.md").code).toBe(0);
    expect(write(undefined, "tests/unit/a.test.ts").code).toBe(0);
  });
});

describe("guard-paths hook: skipped and focused tests", () => {
  it("only lets the tester add fixme/skip", () => {
    expect(edit("tester", "tests/e2e/a.spec.ts", "test(", FIXME).code).toBe(0);
    expect(edit(undefined, "tests/e2e/a.spec.ts", "test(", FIXME).code).toBe(2);
    expect(edit(undefined, "tests/e2e/a.spec.ts", "test(", SKIP).code).toBe(2);
  });

  it("allows removing a fixme (only additions count)", () => {
    expect(edit(undefined, "tests/e2e/a.spec.ts", FIXME, "test(").code).toBe(0);
  });

  it("blocks .only for everyone, the tester included", () => {
    expect(edit("tester", "tests/e2e/a.spec.ts", "test(", ONLY).code).toBe(2);
  });
});

describe("guard-paths hook: shell commands", () => {
  it("blocks killing processes by image name, any case, for everyone", () => {
    expect(bash(undefined, "taskkill /IM node.exe /F").code).toBe(2);
    expect(bash("tester", "taskkill /f /im node.exe").code).toBe(2);
    expect(bash("tester", "npm run build && taskkill /F /IM node.exe").code).toBe(2);
    expect(bash("tester", "taskkill /PID 1234 /F").code).toBe(0);
    // A mention is not a command.
    expect(bash(undefined, 'echo "never run taskkill /IM node.exe"').code).toBe(0);
  });

  it("keeps git history and PRs with the lead", () => {
    expect(bash("developer", "git push origin feat/x").code).toBe(2);
    expect(bash("builder", "git switch main").code).toBe(2);
    expect(bash("tester", "gh pr merge 10 --merge").code).toBe(2);
    expect(bash("developer", "npm run gate && git checkout -- lib").code).toBe(2);
    expect(bash("developer", "git status && git diff").code).toBe(0);
    expect(bash(undefined, "git push -u origin chore/x").code).toBe(0);
  });

  it("never blocks on input it can't parse", () => {
    const result = spawnSync(process.execPath, [hook], { input: "not json", encoding: "utf8" });
    expect(result.status).toBe(0);
  });
});
