import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Black-box tests for the PreToolUse hook in .claude/hooks/guard-paths.mjs: feed it the hook JSON on
// stdin and check the exit code (2 = blocked, 0 = allowed).
const root = path.resolve(__dirname, "../..");
const hook = path.join(root, ".claude/hooks/guard-paths.mjs");

// Built from parts so this file doesn't itself trip the hook when someone edits it.
const FIXME = "test." + "fixme(";
const SKIP = "test." + "skip(";
const ONLY = "test." + "only(";

type Event = {
  tool_name?: string;
  hook_event_name?: string;
  agent_type?: string;
  tool_input?: Record<string, unknown>;
  [key: string]: unknown;
};

function run(event: Event, projectDir = root) {
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify(event),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
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

describe("guard-paths hook: file handoff", () => {
  // A throwaway project with one sprint, so task and report files can exist or not.
  const project = mkdtempSync(path.join(tmpdir(), "guard-hook-"));
  const sprint = ".design/sprints/8-home-no-js";
  const task = `${sprint}/tasks/developer-r1.md`;
  const report = `${sprint}/reports/developer-r1.md`;
  mkdirSync(path.join(project, sprint, "tasks"), { recursive: true });
  mkdirSync(path.join(project, sprint, "reports"), { recursive: true });
  writeFileSync(path.join(project, task), "# Task: developer · round 1\n");
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  const spawn = (subagent_type: string, prompt: string) =>
    run({ tool_name: "Agent", tool_input: { subagent_type, prompt, description: "x" } }, project);
  const writeIn = (agent: string, file: string) =>
    run({ tool_name: "Write", agent_type: agent, tool_input: { file_path: file, content: "x" } }, project);
  const stop = (agent: string, transcriptText: string, extra: Record<string, unknown> = {}) => {
    const transcript = path.join(project, `transcript-${agent}.jsonl`);
    writeFileSync(transcript, transcriptText);
    return run({ hook_event_name: "SubagentStop", agent_type: agent, agent_transcript_path: transcript, ...extra }, project);
  };

  it("spawns a role agent only with an existing task file of its own", () => {
    expect(spawn("developer", `Task: ${task}`).code).toBe(0);
    expect(spawn("developer", `Task: ${task.replaceAll("/", "\\")}`).code).toBe(0);
    expect(spawn("developer", "Remove the Suspense boundaries on the home page.").code).toBe(2);
    expect(spawn("developer", `Task: ${sprint}/tasks/developer-r2.md`).code).toBe(2);
    expect(spawn("builder", `Task: ${task}`).code).toBe(2); // someone else's task
  });

  it("holds the next dispatch until every other task in the sprint has its report", () => {
    const testerTask = `${sprint}/tasks/tester-r1.md`;
    writeFileSync(path.join(project, testerTask), "# Task: tester · round 1\n");
    const waiting = spawn("tester", `Task: ${testerTask}`);
    expect(waiting.code).toBe(2);
    expect(waiting.stderr).toContain(task); // developer-r1 has no report yet
    writeFileSync(path.join(project, report), "# Report\n");
    expect(spawn("tester", `Task: ${testerTask}`).code).toBe(0);
    rmSync(path.join(project, report));
    rmSync(path.join(project, testerTask));
  });

  it("leaves other agents (planner, built-ins) free to spawn", () => {
    expect(spawn("planner", "Draft a spec for comments.").code).toBe(0);
    expect(spawn("Explore", "Find the store.").code).toBe(0);
  });

  it("lets each agent write only its own report in the sprint folder", () => {
    expect(writeIn("developer", report).code).toBe(0);
    expect(writeIn("reviewer", `${sprint}/reports/reviewer-r1.md`).code).toBe(0);
    expect(writeIn("tester", `${sprint}/reports/tester-r1.md`).code).toBe(0);
    expect(writeIn("tester", report).code).toBe(2);
    expect(writeIn("developer", task).code).toBe(2);
    expect(writeIn("developer", `${sprint}/brief.md`).code).toBe(2);
  });

  it("keeps the planner to specs, briefs and tasks", () => {
    expect(writeIn("planner", ".design/specs/comments.md").code).toBe(0);
    expect(writeIn("planner", `${sprint}/brief.md`).code).toBe(0);
    expect(writeIn("planner", `${sprint}/tasks/tester-r1.md`).code).toBe(0);
    expect(writeIn("planner", `${sprint}/close.md`).code).toBe(2);
    expect(writeIn("planner", `${sprint}/reports/developer-r1.md`).code).toBe(2);
    expect(writeIn("planner", "lib/data/posts.ts").code).toBe(2);
  });

  it("doesn't let a role agent stop before its report exists", () => {
    const prompt = JSON.stringify({ content: `Task: ${task}` });
    const blocked = stop("developer", prompt);
    expect(blocked.code).toBe(2);
    expect(blocked.stderr).toContain(report);
    expect(stop("developer", prompt, { stop_hook_active: true }).code).toBe(0); // no loop on its own block
    expect(stop("developer", "no task path here").code).toBe(0);
    // Windows paths arrive JSON-escaped in the transcript: one backslash becomes two.
    expect(stop("developer", JSON.stringify({ content: `Task: ${task.replaceAll("/", "\\")}` })).code).toBe(2);
    writeFileSync(path.join(project, report), "# Report\n");
    expect(stop("developer", prompt).code).toBe(0);
  });
});
