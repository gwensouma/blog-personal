#!/usr/bin/env node
// PreToolUse guard for the agent team. It enforces in code what the agent prompts only ask for:
// - tester writes only under tests/, reviewer writes nothing, the developer doesn't touch tests/;
// - only the tester may add test.fixme / test.skip, and nobody may add .only;
// - subagents never push, merge, open PRs, switch branches or rewrite history (the lead owns git);
// - nobody kills processes by image name (taskkill /IM kills the user's other Node processes).
// - work is handed over in files: a role agent is spawned only with the one-line prompt "Task: <path>" naming an
//   existing task file (.design/sprints/<sprint>/tasks/<agent>-r<n>.md) that has its template's sections, the planner
//   alone writes specs, briefs and tasks, and each agent may write its own report
//   (.design/sprints/<sprint>/reports/<agent>-r<n>.md), in the report template's shape, and no other.
// Events: PreToolUse (Write/Edit/MultiEdit/NotebookEdit, Bash/PowerShell, Agent) and SubagentStop (a role agent may
// not stop before its report exists).
// Input: the hook JSON on stdin. Output: exit 2 with a reason on stderr blocks; exit 0 allows.
// Workflow: .claude/skills/lead/SKILL.md.

import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Role agents get their work from a task file and must report in a file. The planner writes the task files.
const ROLE_AGENTS = new Set(["developer", "tester", "reviewer"]);
const SUBAGENTS = new Set([...ROLE_AGENTS, "planner"]);

// .design/sprints/<sprint>/tasks/<agent>-r<n>.md, with / or \ separators (doubled when JSON-escaped in a transcript).
const TASK_PATH = /\.design[\\/]+sprints[\\/]+([^\\/\s`'"]+)[\\/]+tasks[\\/]+([a-z]+)-r(\d+)\.md/g;

// The whole dispatch prompt of a role agent: "Task: <path>", optionally in backticks.
const DISPATCH_PROMPT = /^Task:\s*`?[^\s`]+`?$/;

// Sections each task and report must have, from .claude/templates/. Fix tasks (title ends "(fix)") need "## Fix".
const TASK_SECTIONS = {
  developer: ["## Do", "## Files you may change", "## Acceptance criteria", "## Done when"],
  tester: ["## Cover", "## Files you may change", "## Done when"],
  reviewer: ["## Review", "## Acceptance criteria", "## Done when"],
};
const REPORT_SECTIONS = {
  developer: ["## Files", "## AC"],
  tester: ["## AC", "## Findings"],
  reviewer: ["## Findings"],
};
// Unfilled template placeholders: <n>, <#>-<name>, <branch>, <agent>, <m>, <developer|tester>.
const PLACEHOLDER = /<(?:n|m|#|branch|agent|developer\|tester|tester\|reviewer)>/;

const SKIP_PATTERNS =[/\btest\.fixme\s*\(/g, /\b(?:test|describe|it)\.skip\s*\(/g];
const ONLY_PATTERN = /\b(?:test|describe|it)\.only\s*\(/g;

// git, then any global options (-C <dir>, -c k=v, --no-pager, …), then the subcommand.
const GIT = String.raw`\bgit(?:\s+(?:-[Cc]\s+\S+|--?[\w-]+(?:=\S+)?))*\s+`;
const GIT_OWNED_BY_LEAD = [
  new RegExp(`${GIT}(?:push|switch|checkout|rebase|merge|commit|cherry-pick|revert|tag)\\b`),
  new RegExp(`${GIT}reset\\s+--hard\\b`),
  /\bgh\s+pr\s+(?:create|merge|close|ready|edit|review)\b/,
  // gh api is read-only only with GET; any other method can push, merge or change settings.
  /\bgh\s+api\b[^\n;&|]*(?:-X\s*|--method[\s=]+)(?!GET\b)[A-Za-z]+/i,
  /\bgh\s+api\b[^\n;&|]*\s(?:-f|-F|--field|--raw-field|--input)\s/,
];

// Where each writing agent may write (project-relative paths). The lead (main session) is not restricted here.
const DESIGN_NOTE = /^\.design\/(?!roadmap|decisions)[a-z0-9-]+\.md$/; // e.g. .design/comments.md
const AREAS = {
  developer: {
    prefixes: ["app/", "lib/", "types/", "components/", "content/", "public/", "assets/"],
    files: [
      "next.config.ts", "tsconfig.json", "eslint.config.mjs", "postcss.config.mjs", "components.json",
      "package.json", "package-lock.json", ".env.example", "vitest.config.mts", "playwright.config.ts",
    ],
    note: "app/, lib/, types/, components/, content/, public/, assets/, root config files and .design/<feature>.md notes",
  },
  tester: { prefixes: ["tests/"], files: [], note: "tests/" },
};

function inArea(agent, rel) {
  const area = AREAS[agent];
  if (!area) return false;
  if (area.files.includes(rel) || area.prefixes.some((p) => rel.startsWith(p))) return true;
  return agent !== "tester" && DESIGN_NOTE.test(rel);
}
// Only in command position (start of the line or after ; & | or a subshell paren), so text that merely
// mentions it, e.g. inside an echo or a heredoc sentence, is not blocked.
const KILL_BY_NAME = /(?:^|[;&|(])\s*(?:taskkill|taskkill\.exe)\b[^\n;&|]*\/im\b/im;

function count(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

/** Path relative to the project, with forward slashes, or null when the file is outside it. */
function projectRelative(filePath, projectDir) {
  const rel = path.relative(path.resolve(projectDir), path.resolve(projectDir, filePath));
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

function isUnderTests(rel) {
  return rel.toLowerCase().startsWith("tests/");
}

/** What a path under .design/sprints/ is: brief, close, task or report (with its agent), other, or null. */
function sprintFile(rel) {
  if (!rel.startsWith(".design/sprints/")) return null;
  const m = /^\.design\/sprints\/[^/]+\/(?:(brief|close)\.md|(tasks|reports)\/([a-z]+)-r\d+\.md)$/.exec(rel);
  if (!m) return { kind: "other" };
  if (m[1]) return { kind: m[1] };
  return { kind: m[2] === "tasks" ? "task" : "report", agent: m[3] };
}

/** Task files named in a text, in order of appearance. */
function taskRefs(text) {
  return [...text.matchAll(TASK_PATH)].map((m) => ({
    agent: m[2],
    sprintDir: `.design/sprints/${m[1]}`,
    rel: `.design/sprints/${m[1]}/tasks/${m[2]}-r${m[3]}.md`,
    report: `.design/sprints/${m[1]}/reports/${m[2]}-r${m[3]}.md`,
  }));
}

/** The text a write adds and the text it replaces, so we only flag markers that are new. */
function writeTexts(toolName, input, absPath) {
  if (toolName === "Write") {
    const before = existsSync(absPath) ? readFileSync(absPath, "utf8") : "";
    return { after: input.content ?? "", before };
  }
  if (toolName === "Edit") {
    return { after: input.new_string ?? "", before: input.old_string ?? "" };
  }
  if (toolName === "MultiEdit") {
    const edits = input.edits ?? [];
    return {
      after: edits.map((e) => e.new_string ?? "").join("\n"),
      before: edits.map((e) => e.old_string ?? "").join("\n"),
    };
  }
  return { after: "", before: "" };
}

/** Returns a block reason, or null to allow. */
function decide(event, projectDir) {
  const tool = event.tool_name;
  const input = event.tool_input ?? {};
  const agent = event.agent_type;
  const isSubagent = SUBAGENTS.has(agent);
  // Any other subagent (general-purpose, claude, Explore, …) is a helper for research, never a writer: the team's
  // ownership and handoff rules would mean nothing if the lead could route code work around them.
  const isHelper = Boolean(agent) && !isSubagent;

  if (tool === "Agent" || tool === "Task") {
    const target = input.subagent_type;
    if (target === "planner") return plannerPromptProblem(input.prompt ?? "", projectDir);
    if (!ROLE_AGENTS.has(target)) return null;
    const own = taskRefs(input.prompt ?? "").filter((t) => t.agent === target);
    if (own.length === 0) {
      return `Hand ${target} its work as a file: write .design/sprints/<sprint>/tasks/${target}-r<n>.md from .claude/templates/ and put that path in the prompt.`;
    }
    const missing = own.filter((t) => !existsSync(path.resolve(projectDir, t.rel)));
    if (missing.length > 0) return `Task file not found: ${missing.map((t) => t.rel).join(", ")}. Write it first.`;
    // The prompt is the task path and nothing else, so every instruction lives in a file.
    if (!DISPATCH_PROMPT.test((input.prompt ?? "").trim()) || own.length > 1) {
      return `Send ${target} one line, "Task: ${own[0].rel}". Put any extra instruction in the task file.`;
    }
    const problems = taskProblems(readFileSync(path.resolve(projectDir, own[0].rel), "utf8"), own[0]);
    if (problems.length > 0) {
      return `${own[0].rel} doesn't follow its template (.claude/templates/): ${problems.join("; ")}.`;
    }
    // Dispatch gate: the next task waits until every task already dispatched in the sprint has its report. This is
    // the check that holds for background agents, which can finish past a SubagentStop block. Tasks written ahead
    // (the planner writes every round-1 task at once) don't count until they are dispatched.
    const dispatched = dispatchedTasks(projectDir, own[0].sprintDir);
    const waiting = unreportedTasks(projectDir, own[0].sprintDir).filter(
      (rel) => rel !== own[0].rel && dispatched.includes(rel),
    );
    if (waiting.length > 0) {
      return `Waiting on reports for: ${waiting.join(", ")}. Get each report written (continue that agent) before dispatching the next task.`;
    }
    recordDispatch(projectDir, own[0]);
    return null;
  }

  if (tool === "Bash" || tool === "PowerShell") {
    const command = input.command ?? "";
    if (KILL_BY_NAME.test(command)) {
      return "Killing processes by image name is forbidden: it kills the user's other Node processes. Stop only the PID you started (taskkill /PID <pid> /F).";
    }
    if ((isSubagent || isHelper) && GIT_OWNED_BY_LEAD.some((re) => re.test(command))) {
      return `The lead owns branches, pushes and PRs; ${agent} must not run this. Report back to the lead instead.`;
    }
    return null;
  }

  if (!["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(tool)) return null;

  const filePath = input.file_path ?? input.notebook_path;
  if (!filePath) return null;
  const rel = projectRelative(filePath, projectDir);

  if (rel === null) {
    if (agent === "reviewer") return "The reviewer is read-only. Report the finding to the lead instead of editing.";
    return null; // outside the project (temp files): not ours to police
  }
  if (isHelper) {
    return `${agent} is a helper agent and may not edit the project (tried ${rel}). Code work goes to a role agent through a task file.`;
  }

  // Sprint files: briefs and tasks belong to the planner (and the lead), close to the lead, each report to its agent.
  const sprint = sprintFile(rel);
  // close.md ends a sprint, so it waits for every report (the last agent of a sprint has no later dispatch gate).
  if (sprint?.kind === "close" && !isSubagent) {
    const sprintDir = rel.split("/").slice(0, 3).join("/");
    const waiting = unreportedTasks(projectDir, sprintDir);
    if (waiting.length > 0) return `Close the sprint after every task has a report. Missing: ${waiting.join(", ")}.`;
  }
  if (sprint && isSubagent) {
    if (sprint.kind === "report") {
      if (sprint.agent !== agent) return `${agent} may write only its own report (reports/${agent}-r<n>.md), not ${rel}.`;
      const problems = reportProblems(resultingText(tool, input, path.resolve(projectDir, filePath)), agent);
      if (problems.length > 0) {
        return `Your report doesn't follow .claude/templates/report.md: ${problems.join("; ")}.`;
      }
      return null;
    }
    if (agent === "planner" && (sprint.kind === "brief" || sprint.kind === "task")) return null;
    return `${rel} is the ${sprint.kind === "close" ? "lead's" : "planner's or the lead's"} to write; ${agent} writes only its own report.`;
  }
  if (agent === "planner") {
    if (rel.startsWith(".design/specs/")) return null;
    return `The planner writes specs (.design/specs/), briefs and tasks (.design/sprints/), not ${rel}. Put code changes in a task.`;
  }
  if (agent === "reviewer") {
    return "The reviewer is read-only. Write findings to your report file instead of editing.";
  }

  if (AREAS[agent] && !inArea(agent, rel)) {
    if (agent === "tester") {
      return `The tester writes only under tests/ (tried ${rel}). Report the defect to the lead with the suspected file.`;
    }
    if (isUnderTests(rel)) {
      return `Tests belong to the tester (tried ${rel}). List the cases the tester should cover in your report instead.`;
    }
    return `${agent} writes only ${AREAS[agent].note} (tried ${rel}). Name the needed change in your report; the lead routes it.`;
  }

  const { after, before } = writeTexts(tool, input, path.resolve(projectDir, filePath));
  if (count(after, ONLY_PATTERN) > count(before, ONLY_PATTERN)) {
    return "Don't add .only( to a test: it silently skips the rest of the suite.";
  }
  if (agent !== "tester") {
    for (const pattern of SKIP_PATTERNS) {
      if (count(after, pattern) > count(before, pattern)) {
        return "Only the tester may add test.fixme / .skip, and it must link the sprint that removes it.";
      }
    }
  }
  return null;
}

/** The whole file as it will be after a Write, Edit or MultiEdit. */
function resultingText(toolName, input, absPath) {
  if (toolName === "Write") return input.content ?? "";
  let text = existsSync(absPath) ? readFileSync(absPath, "utf8") : "";
  const edits = toolName === "MultiEdit" ? (input.edits ?? []) : [input];
  for (const e of edits) {
    const from = e.old_string ?? "";
    text = e.replace_all ? text.split(from).join(e.new_string ?? "") : text.replace(from, e.new_string ?? "");
  }
  return text;
}

/** The planner's prompt starts with its mode; mode `tasks` names an approved spec, a sprint folder and a branch. */
function plannerPromptProblem(prompt, projectDir) {
  const mode = /^Mode:\s*(spec|tasks)\b/.exec(prompt.trim())?.[1];
  if (!mode) return 'Start the planner\'s prompt with "Mode: spec" or "Mode: tasks" (see .claude/agents/planner.md).';
  if (mode === "spec") return null;
  const spec = /\.design[\\/]+specs[\\/]+[a-z0-9-]+\.md/.exec(prompt)?.[0].replaceAll("\\", "/");
  if (!spec || !existsSync(path.resolve(projectDir, spec))) {
    return "Mode tasks needs an existing spec: name .design/specs/<feature>.md in the prompt.";
  }
  if (!/^Status:\s*approved\b/m.test(readFileSync(path.resolve(projectDir, spec), "utf8"))) {
    return `${spec} is not approved yet ("Status: approved …"). The user (or the lead, when the user waives it) approves the spec before tasks are written.`;
  }
  if (!/\.design[\\/]+sprints[\\/]+\d+-[a-z0-9-]+/.test(prompt) || !/\bBranch:\s*`?[\w./-]+/.test(prompt)) {
    return "Mode tasks needs the sprint folder (.design/sprints/<#>-<name>/) and \"Branch: <branch>\" in the prompt.";
  }
  return null;
}

/** What a task file lacks against its template (.claude/templates/task-*.md), as short phrases. */
function taskProblems(text, task) {
  const problems = [];
  const fix = /^# Task:.*\(fix\)/m.test(text);
  const required = fix ? ["## Fix", "## Done when"] : TASK_SECTIONS[task.agent];
  for (const heading of required) {
    if (!text.split(/\r?\n/).some((line) => line.trim().startsWith(heading))) problems.push(`no "${heading}" section`);
  }
  if (!/^Brief:/m.test(text)) problems.push(`no "Brief:" line`);
  if (fix && !/^Source:/m.test(text)) problems.push(`no "Source:" line naming the tester or reviewer report`);
  const reportTo = /^Report to:.*$/m.exec(text)?.[0].replaceAll("\\", "/") ?? "";
  if (!reportTo.includes(task.report)) problems.push(`"Report to:" must name ${task.report}`);
  const placeholder = PLACEHOLDER.exec(text.replace(/<!--[\s\S]*?-->/g, ""));
  if (placeholder) problems.push(`template placeholder "${placeholder[0]}" left in`);
  return problems;
}

/** What a report lacks against .claude/templates/report.md, as short phrases. */
function reportProblems(text, agent) {
  const problems = [];
  if (!new RegExp(`^# Report: ${agent}\\b.*\\bstatus: (?:done|failed|blocked)\\b`, "m").test(text)) {
    problems.push(`first line "# Report: ${agent} · round <n> · status: done | failed | blocked"`);
  }
  const gate = /^## Gate\b([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text);
  if (!gate) problems.push(`no "## Gate" section`);
  else if (!/\bexit(?: code)?\s*:?\s*-?\d+/i.test(gate[1])) problems.push(`"## Gate" needs each command with "exit <code>"`);
  for (const heading of REPORT_SECTIONS[agent] ?? []) {
    if (!new RegExp(`^${heading}`, "m").test(text)) problems.push(`no "${heading}" section`);
  }
  return problems;
}

// The hook's own record of dispatched tasks, one path per line. Agents can't write it (it is neither a task nor a
// report), and it stays in the sprint folder as part of the record.
const DISPATCH_LOG = "dispatched.txt";

/** Task paths dispatched so far in a sprint. */
function dispatchedTasks(projectDir, sprintDir) {
  const log = path.resolve(projectDir, sprintDir, DISPATCH_LOG);
  return existsSync(log) ? readFileSync(log, "utf8").split(/\r?\n/).filter(Boolean) : [];
}

function recordDispatch(projectDir, task) {
  if (dispatchedTasks(projectDir, task.sprintDir).includes(task.rel)) return;
  appendFileSync(path.resolve(projectDir, task.sprintDir, DISPATCH_LOG), `${task.rel}\n`);
}

/** Task files in a sprint folder that have no matching report yet. */
function unreportedTasks(projectDir, sprintDir) {
  const tasksDir = path.resolve(projectDir, sprintDir, "tasks");
  if (!existsSync(tasksDir)) return [];
  return readdirSync(tasksDir)
    .filter((name) => /^[a-z]+-r\d+\.md$/.test(name))
    .filter((name) => !existsSync(path.resolve(projectDir, sprintDir, "reports", name)))
    .map((name) => `${sprintDir}/tasks/${name}`);
}

/** SubagentStop: a role agent that was handed a task can't finish before its report file exists. Checked live on
 * 2026-10-13: a background agent that finishes through its hand-back still stops after this block, so the dispatch
 * gate above is the check that holds; this one only helps foreground agents. */
function decideStop(event, projectDir) {
  const agent = event.agent_type;
  if (!ROLE_AGENTS.has(agent) || event.stop_hook_active) return null; // never loop on our own block
  const transcript = event.agent_transcript_path;
  if (!transcript || !existsSync(transcript)) return null;
  // The spawning prompt comes first in the transcript, so the first task path of this agent is its task.
  const task = taskRefs(readFileSync(transcript, "utf8")).find((t) => t.agent === agent);
  if (!task || existsSync(path.resolve(projectDir, task.report))) return null;
  return `Write your report to ${task.report} (format: .claude/templates/report.md) before you finish, then reply with one line: "<status> — ${task.report}".`;
}

function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      process.exit(0); // never block on input we can't read
    }
    const projectDir = process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd();
    const reason =
      event.hook_event_name === "SubagentStop" ? decideStop(event, projectDir) : decide(event, projectDir);
    if (reason) {
      process.stderr.write(`[guard-paths] ${reason}\n`);
      process.exit(2);
    }
    process.exit(0);
  });
}

main();
