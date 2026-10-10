// Reads .env.local (if present) and loads it into process.env before running the
// Next.js command that follows. The Next.js CLI doesn't read .env.local on its own
// when determining the port, so this manual loading step is needed.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const envPath = path.join(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

const [command, ...args] = process.argv.slice(2);
const result = spawnSync(command, args, { stdio: "inherit", shell: true, env: process.env });
process.exit(result.status ?? 1);
