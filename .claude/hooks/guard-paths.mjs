#!/usr/bin/env node
// PreToolUse guard for the agent team. It enforces in code what the agent prompts only ask for:
// - tester writes only under tests/, reviewer writes nothing, developer/builder don't touch tests/;
// - only the tester may add test.fixme / test.skip, and nobody may add .only;
// - subagents never push, merge, open PRs, switch branches or rewrite history (the lead owns git);
// - nobody kills processes by image name (taskkill /IM kills the user's other Node processes).
// Input: the hook JSON on stdin. Output: exit 2 with a reason on stderr blocks the call; exit 0 allows it.
// See .design/agent-system-status.md, step 2.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const SUBAGENTS = new Set(["developer", "builder", "tester", "reviewer"]);

const SKIP_PATTERNS = [/\btest\.fixme\s*\(/g, /\b(?:test|describe|it)\.skip\s*\(/g];
const ONLY_PATTERN = /\b(?:test|describe|it)\.only\s*\(/g;

const GIT_OWNED_BY_LEAD = [
  /\bgit\s+push\b/,
  /\bgit\s+switch\b/,
  /\bgit\s+checkout\b/,
  /\bgit\s+rebase\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+merge\b/,
  /\bgh\s+pr\s+(?:create|merge|close|ready)\b/,
];
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

  if (tool === "Bash" || tool === "PowerShell") {
    const command = input.command ?? "";
    if (KILL_BY_NAME.test(command)) {
      return "Killing processes by image name is forbidden: it kills the user's other Node processes. Stop only the PID you started (taskkill /PID <pid> /F).";
    }
    if (isSubagent && GIT_OWNED_BY_LEAD.some((re) => re.test(command))) {
      return `The lead owns branches, pushes and PRs; ${agent} must not run this. Report back to the lead instead.`;
    }
    return null;
  }

  if (!["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(tool)) return null;

  const filePath = input.file_path ?? input.notebook_path;
  if (!filePath) return null;
  const rel = projectRelative(filePath, projectDir);

  if (agent === "reviewer") {
    return "The reviewer is read-only. Report the finding to the lead instead of editing.";
  }
  if (rel === null) return null; // outside the project (temp files): not ours to police

  if (agent === "tester" && !isUnderTests(rel)) {
    return `The tester writes only under tests/ (tried ${rel}). Report the defect to the lead with the suspected file.`;
  }
  if ((agent === "developer" || agent === "builder") && isUnderTests(rel)) {
    return `Tests belong to the tester (tried ${rel}). List the cases the tester should cover in your report instead.`;
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
    const reason = decide(event, projectDir);
    if (reason) {
      process.stderr.write(`[guard-paths] ${reason}\n`);
      process.exit(2);
    }
    process.exit(0);
  });
}

main();
