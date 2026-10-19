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

  it("keeps the developer out of tests/", () => {
    expect(write("developer", "tests/unit/posts.test.ts").code).toBe(2);
    expect(write("developer", "tests/e2e/no-js.spec.ts").code).toBe(2);
    expect(write("developer", "lib/data/posts.ts").code).toBe(0);
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
    expect(bash("developer", "git switch main").code).toBe(2);
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

describe("guard-paths hook: areas and helpers", () => {
  it("keeps the developer in app/, lib/, types/, components/, content/ and root config", () => {
    expect(write("developer", "app/(blog)/page.tsx").code).toBe(0);
    expect(write("developer", "app/globals.css").code).toBe(0);
    expect(write("developer", "components/posts/up-next.tsx").code).toBe(0);
    expect(write("developer", "next.config.ts").code).toBe(0);
    expect(write("developer", ".design/comments.md").code).toBe(2); // feature notes go in the spec or report (D-022)
    expect(write("developer", "docs/comments.md").code).toBe(2);
    expect(write("developer", "CLAUDE.md").code).toBe(2);
    expect(write("developer", ".github/workflows/ci.yml").code).toBe(2);
    expect(write("developer", ".claude/hooks/guard-paths.mjs").code).toBe(2);
    expect(write("developer", ".design/roadmap.md").code).toBe(2);
    expect(write("developer", ".design/decisions.md").code).toBe(2);
    expect(write("developer", "docs/roadmap.md").code).toBe(2);
  });

  it("treats the retired builder as a helper, so it can't write", () => {
    expect(write("builder", "components/posts/up-next.tsx").code).toBe(2);
    expect(write("builder", "app/globals.css").code).toBe(2);
  });

  it("doesn't let helper agents edit the project", () => {
    expect(write("general-purpose", "lib/data/posts.ts").code).toBe(2);
    expect(write("claude", "components/x.tsx").code).toBe(2);
    expect(write("general-purpose", path.join(path.dirname(root), "elsewhere", "notes.md")).code).toBe(0);
    expect(bash("general-purpose", "git push origin main").code).toBe(2);
  });

  it("catches git and gh writes in their less common spellings", () => {
    expect(bash("developer", "git -C . push").code).toBe(2);
    expect(bash("developer", "git --no-pager -c user.name=x commit -m wip").code).toBe(2);
    expect(bash("developer", "git commit -am wip").code).toBe(2);
    expect(bash("tester", "gh api -X PUT repos/o/r/pulls/1/merge").code).toBe(2);
    expect(bash("tester", "gh api --method=POST repos/o/r/git/refs -f ref=x").code).toBe(2);
    expect(bash("tester", "gh api repos/o/r/pulls/1").code).toBe(0);
    expect(bash("tester", "gh api -X GET repos/o/r/pulls").code).toBe(0);
    expect(bash("developer", "git -C . log --oneline").code).toBe(0);
  });
});

// A task file filled in from its template (.claude/templates/task-<agent>.md).
const SECTIONS: Record<string, string[]> = {
  developer: ["## Do", "## Files you may change", "## Acceptance criteria this task serves", "## Done when"],
  tester: ["## Cover", "## Files you may change", "## Done when"],
  reviewer: ["## Review", "## Done when"],
};
function taskText(agent: string, round = 1, sprintDir = ".design/sprints/8-home-no-js") {
  return [
    `# Task: ${agent} · round ${round}`,
    `<!-- ${sprintDir}/tasks/<agent>-r<n>.md -->`,
    `Brief: \`${sprintDir}/brief.md\` · Branch: \`fix/home-no-js\``,
    `Report to: \`${sprintDir}/reports/${agent}-r${round}.md\` (format: \`.claude/templates/report.md\`)`,
    ...SECTIONS[agent].flatMap((h) => [h, "- something concrete"]),
  ].join("\n");
}

// A report in the shape of .claude/templates/report.md.
function reportText(agent: string, gateLine = "- `npm run gate` → exit 0") {
  return [
    `# Report: ${agent} · round 1 · status: done`,
    "## Summary\n- did it",
    "## Files\n- lib/a.ts",
    `## Gate\n${gateLine}`,
    "## AC → test\n| AC1 | tests/e2e/a.spec.ts | pass |",
    "## Findings\nnone",
    "## Open questions\nnone",
  ].join("\n\n");
}

// docs/ is the workflow root; .design/ is accepted until the move lands.
describe.each(["docs", ".design"])("guard-paths hook: file handoff (%s/)", (root) => {
  // A throwaway project with one sprint, so task and report files can exist or not.
  const project = mkdtempSync(path.join(tmpdir(), "guard-hook-"));
  const sprint = `${root}/sprints/8-home-no-js`;
  const task = `${sprint}/tasks/developer-r1.md`;
  const report = `${sprint}/reports/developer-r1.md`;
  mkdirSync(path.join(project, sprint, "tasks"), { recursive: true });
  mkdirSync(path.join(project, sprint, "reports"), { recursive: true });
  writeFileSync(path.join(project, task), taskText("developer", 1, sprint));
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  const spawn = (subagent_type: string, prompt: string) =>
    run({ tool_name: "Agent", tool_input: { subagent_type, prompt, description: "x" } }, project);
  const writeIn = (agent: string, file: string, content = "x") =>
    run({ tool_name: "Write", agent_type: agent, tool_input: { file_path: file, content } }, project);
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
    expect(spawn("tester", `Task: ${task}`).code).toBe(2); // someone else's task
  });

  it("holds the next dispatch until every dispatched task in the sprint has its report", () => {
    const testerTask = `${sprint}/tasks/tester-r1.md`;
    writeFileSync(path.join(project, testerTask), taskText("tester", 1, sprint));
    expect(spawn("developer", `Task: ${task}`).code).toBe(0); // dispatched, so now it must report first
    const waiting = spawn("tester", `Task: ${testerTask}`);
    expect(waiting.code).toBe(2);
    expect(waiting.stderr).toContain(task); // developer-r1 has no report yet
    writeFileSync(path.join(project, report), "# Report\n");
    expect(spawn("tester", `Task: ${testerTask}`).code).toBe(0);
    rmSync(path.join(project, report));
    rmSync(path.join(project, testerTask));
  });

  it("doesn't wait on tasks written ahead but not yet dispatched", () => {
    const fresh = mkdtempSync(path.join(tmpdir(), "guard-ahead-"));
    for (const agent of ["developer", "tester", "reviewer"]) {
      mkdirSync(path.join(fresh, sprint, "tasks"), { recursive: true });
      writeFileSync(path.join(fresh, sprint, "tasks", `${agent}-r1.md`), taskText(agent, 1, sprint));
    }
    const spawnIn = (agent: string) =>
      run({ tool_name: "Agent", tool_input: { subagent_type: agent, prompt: `Task: ${sprint}/tasks/${agent}-r1.md` } }, fresh);
    expect(spawnIn("developer").code).toBe(0);
    expect(spawnIn("developer").code).toBe(0); // re-dispatching the same task is fine
    expect(spawnIn("tester").stderr).toContain("developer-r1.md");
    mkdirSync(path.join(fresh, sprint, "reports"), { recursive: true });
    writeFileSync(path.join(fresh, sprint, "reports", "developer-r1.md"), reportText("developer"));
    expect(spawnIn("tester").code).toBe(0);
    rmSync(fresh, { recursive: true, force: true });
  });

  it("lets the lead write close.md only after every task has a report", () => {
    const close = `${sprint}/close.md`;
    const blocked = run({ tool_name: "Write", tool_input: { file_path: close, content: "x" } }, project);
    expect(blocked.code).toBe(2);
    expect(blocked.stderr).toContain(task);
    writeFileSync(path.join(project, report), "# Report\n");
    expect(run({ tool_name: "Write", tool_input: { file_path: close, content: "x" } }, project).code).toBe(0);
    rmSync(path.join(project, report));
  });

  it("leaves other agents (planner, built-ins) free to spawn", () => {
    expect(spawn("planner", "Mode: spec\nIdea: comments").code).toBe(0);
    expect(spawn("Explore", "Find the store.").code).toBe(0);
  });

  it("lets each agent write only its own report in the sprint folder", () => {
    expect(writeIn("developer", report, reportText("developer")).code).toBe(0);
    expect(writeIn("reviewer", `${sprint}/reports/reviewer-r1.md`, reportText("reviewer")).code).toBe(0);
    expect(writeIn("tester", `${sprint}/reports/tester-r1.md`, reportText("tester")).code).toBe(0);
    expect(writeIn("tester", report, reportText("tester")).code).toBe(2);
    expect(writeIn("developer", task).code).toBe(2);
    expect(writeIn("developer", `${sprint}/brief.md`).code).toBe(2);
  });

  it("keeps the planner to specs, briefs and tasks", () => {
    expect(writeIn("planner", `${root}/specs/comments.md`).code).toBe(0);
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

describe("guard-paths hook: handoff format", () => {
  const project = mkdtempSync(path.join(tmpdir(), "guard-format-"));
  const sprint = ".design/sprints/9-format";
  mkdirSync(path.join(project, sprint, "tasks"), { recursive: true });
  mkdirSync(path.join(project, sprint, "reports"), { recursive: true });
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  const spawn = (subagent_type: string, prompt: string) =>
    run({ tool_name: "Agent", tool_input: { subagent_type, prompt, description: "x" } }, project);
  const putTask = (name: string, text: string) => writeFileSync(path.join(project, sprint, "tasks", name), text);
  const clearTask = (name: string) => rmSync(path.join(project, sprint, "tasks", name));

  it("accepts only the one-line prompt naming the task", () => {
    const task = `${sprint}/tasks/developer-r1.md`;
    putTask("developer-r1.md", taskText("developer", 1, sprint));
    expect(spawn("developer", `Task: ${task}`).code).toBe(0);
    expect(spawn("developer", `Task: \`${task}\``).code).toBe(0);
    const chatty = spawn("developer", `Task: ${task}\nAlso refactor the header while you're there.`);
    expect(chatty.code).toBe(2);
    expect(chatty.stderr).toContain("one line");
    expect(spawn("developer", `Please do Task: ${task}`).code).toBe(2);
    clearTask("developer-r1.md");
  });

  it("blocks a task file that misses its template's sections, lines or values", () => {
    const task = `${sprint}/tasks/tester-r1.md`;
    putTask("tester-r1.md", taskText("tester", 1, sprint).replace("## Cover", "## Things"));
    const noCover = spawn("tester", `Task: ${task}`);
    expect(noCover.code).toBe(2);
    expect(noCover.stderr).toContain("## Cover");
    putTask("tester-r1.md", taskText("tester", 1, sprint).replace("reports/tester-r1.md", "reports/tester-r2.md"));
    expect(spawn("tester", `Task: ${task}`).stderr).toContain("Report to:");
    putTask("tester-r1.md", taskText("tester", 1, sprint).replace("fix/home-no-js", "<branch>"));
    expect(spawn("tester", `Task: ${task}`).stderr).toContain("<branch>");
    putTask("tester-r1.md", taskText("tester", 1, sprint)); // placeholders inside the HTML comment are fine
    expect(spawn("tester", `Task: ${task}`).code).toBe(0);
    clearTask("tester-r1.md");
  });

  it("checks fix tasks against the fix template", () => {
    const task = `${sprint}/tasks/developer-r2.md`;
    const header = [
      "# Task: developer · round 2 (fix)",
      `Brief: \`${sprint}/brief.md\``,
      `Report to: \`${sprint}/reports/developer-r2.md\``,
    ];
    putTask("developer-r2.md", [...header, "## Fix", "| F1 | x | a.tsx:1 | y |", "## Done when", "- gate"].join("\n"));
    expect(spawn("developer", `Task: ${task}`).stderr).toContain("Source:");
    putTask(
      "developer-r2.md",
      [...header, "Source: `reports/reviewer-r1.md`", "## Fix", "| F1 |", "## Done when", "- gate"].join("\n"),
    );
    expect(spawn("developer", `Task: ${task}`).code).toBe(0);
    clearTask("developer-r2.md");
  });

  it("blocks a report without its status line, gate exit codes or sections", () => {
    const report = `${sprint}/reports/developer-r1.md`;
    const writeReport = (content: string) =>
      run({ tool_name: "Write", agent_type: "developer", tool_input: { file_path: report, content } }, project);
    expect(writeReport(reportText("developer")).code).toBe(0);
    const passes = writeReport(reportText("developer", "- `npm run gate` passes"));
    expect(passes.code).toBe(2);
    expect(passes.stderr).toContain("exit <code>");
    expect(writeReport(reportText("developer").replace("status: done", "status: mostly")).code).toBe(2);
    expect(writeReport(reportText("developer").replace("## Files", "## Changed")).stderr).toContain("## Files");
  });

  it("checks the report as it will be after an edit", () => {
    const report = `${sprint}/reports/tester-r1.md`;
    writeFileSync(path.join(project, report), reportText("tester"));
    const editReport = (old_string: string, new_string: string) =>
      run(
        { tool_name: "Edit", agent_type: "tester", tool_input: { file_path: report, old_string, new_string } },
        project,
      );
    expect(editReport("did it", "did it well").code).toBe(0);
    expect(editReport("→ exit 0", "→ green").code).toBe(2);
  });
});

describe("guard-paths hook: planner prompt", () => {
  const project = mkdtempSync(path.join(tmpdir(), "guard-planner-"));
  const spec = ".design/specs/up-next.md";
  mkdirSync(path.join(project, ".design/specs"), { recursive: true });
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  const spawn = (prompt: string) =>
    run({ tool_name: "Agent", tool_input: { subagent_type: "planner", prompt, description: "x" } }, project);
  const tasksPrompt = `Mode: tasks\nSpec: ${spec}\nFolder: .design/sprints/4-up-next/\nBranch: feat/up-next`;

  it("needs the mode on the first line", () => {
    expect(spawn("Mode: spec\nIdea: comments").code).toBe(0);
    expect(spawn("Draft a spec for comments.").stderr).toContain("Mode: spec");
  });

  it("writes tasks only from an existing, approved spec with a folder and a branch", () => {
    expect(spawn(tasksPrompt).stderr).toContain("existing spec");
    writeFileSync(path.join(project, spec), "# Spec: up-next\n\nStatus: draft · Author: planner\n");
    expect(spawn(tasksPrompt).stderr).toContain("not approved");
    writeFileSync(path.join(project, spec), "# Spec: up-next\n\nStatus: approved by the user on 2026-10-14\n");
    expect(spawn(tasksPrompt).code).toBe(0);
    expect(spawn(tasksPrompt.replace("Branch: feat/up-next", "")).stderr).toContain("Branch:");
  });

  it("accepts the docs/ root for the spec and the sprint folder", () => {
    mkdirSync(path.join(project, "docs/specs"), { recursive: true });
    writeFileSync(path.join(project, "docs/specs/up-next.md"), "# Spec: up-next\n\nStatus: approved by the user on 2026-10-19\n");
    expect(spawn(tasksPrompt.replaceAll(".design/", "docs/")).code).toBe(0);
    expect(spawn(tasksPrompt.replaceAll(".design/", "mydocs/")).stderr).toContain("existing spec");
  });
});
