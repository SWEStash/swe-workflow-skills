#!/usr/bin/env node
// Remove the swe-workflow-skills library from a Claude config directory. Removes only
// what install.mjs created: this repo's skills, the catalog/role markers, resolve.mjs,
// the SessionStart hook, and the /role command. Your own custom skills are never
// touched. The library's skillOverrides entries are pruned from settings.local.json;
// the SessionStart registration in settings.json is left for you to remove by hand
// (this tool never edits settings.json) — the exact block is printed.
//
// Runs on Linux, macOS, and Windows using only Node.
//
//   node uninstall.mjs                  # remove from ./.claude/
//   node uninstall.mjs --global         # remove from the user config dir
//   node uninstall.mjs --dir DIR --dry-run

import { existsSync, statSync, readdirSync, readFileSync, rmSync, rmdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createInterface } from "node:readline/promises";
import { pruneSettings } from "./scripts/resolve.mjs";

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(REPO_ROOT, "skills");

if (!isDir(SKILLS_DIR)) fatal("must be run from the swe-workflow-skills repo root");

const USAGE = `Usage: uninstall.mjs [options]

Remove the swe-workflow-skills library from a Claude config directory.

Options:
  -g, --global   Remove from the user config dir: $CLAUDE_CONFIG_DIR if set, else
                 ~/.claude/ (default without this flag: ./.claude/)
  -d, --dir DIR  Remove from a custom Claude config directory DIR
                 (mutually exclusive with --global)
  -y, --yes      Skip the confirmation prompt
  -n, --dry-run  Print what would be removed; change nothing
  -h, --help     Show this help`;

function isDir(p) {
  return existsSync(p) && statSync(p).isDirectory();
}
function fatal(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}
function log(msg) {
  process.stdout.write(msg + "\n");
}
function expandTilde(p) {
  if (p === "~" || p.startsWith("~/") || p.startsWith("~\\")) return homedir() + p.slice(1);
  return p;
}

// ---- arg parsing -----------------------------------------------------------

let global = false;
let dryRun = false;
let assumeYes = false;
let configDir = "";

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "-g" || a === "--global") global = true;
  else if (a === "-d" || a === "--dir") {
    configDir = argv[++i];
    if (configDir === undefined) fatal("--dir requires a path");
  } else if (a.startsWith("--dir=")) configDir = a.slice("--dir=".length);
  else if (a === "-y" || a === "--yes") assumeYes = true;
  else if (a === "-n" || a === "--dry-run") dryRun = true;
  else if (a === "-h" || a === "--help") {
    log(USAGE);
    process.exit(0);
  } else {
    process.stderr.write(`Unknown option: ${a}\n${USAGE}\n`);
    process.exit(1);
  }
}

let claudeDir;
if (configDir) {
  if (global) fatal("--dir and --global are mutually exclusive");
  claudeDir = resolve(expandTilde(configDir));
} else if (global) {
  claudeDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
} else {
  claudeDir = join(process.cwd(), ".claude");
}
const dest = join(claudeDir, "skills");

if (!isDir(claudeDir)) {
  log(`Nothing to do: ${claudeDir} does not exist.`);
  process.exit(0);
}

const settingsLocal = join(claudeDir, "settings.local.json");

// Build the removal list: only library skills THIS installer created, plus the
// machinery. The provenance manifest is authoritative when present, so a user's own
// custom skill that shares a library name is never removed. Pre-manifest installs
// have no manifest — fall back to matching source-tree skill names (the historical
// behavior) so they can still be uninstalled.
const manifestPath = join(dest, ".swe-workflow-manifest.json");
let manifestSkills = null;
if (existsSync(manifestPath)) {
  try {
    const m = JSON.parse(readFileSync(manifestPath, "utf-8"));
    if (Array.isArray(m.skills)) manifestSkills = m.skills;
  } catch {
    /* unreadable manifest -> fall back to name-match below */
  }
}

let libSkills;
if (manifestSkills !== null) {
  const srcSkills = new Set(readdirSync(SKILLS_DIR).filter((s) => isDir(join(SKILLS_DIR, s))));
  libSkills = manifestSkills.filter((s) => srcSkills.has(s) && isDir(join(dest, s))).sort();
} else {
  libSkills = readdirSync(SKILLS_DIR)
    .filter((s) => isDir(join(SKILLS_DIR, s)) && isDir(join(dest, s)))
    .sort();
}

const targets = [...libSkills.map((s) => join(dest, s))];
for (const f of [
  join(dest, ".roles.json"),
  join(dest, ".catalog.json"),
  join(dest, ".active-role"),
  join(dest, ".swe-workflow-manifest.json"),
  join(claudeDir, "hooks", "resolve.mjs"),
  join(claudeDir, "hooks", "session-start.mjs"),
  join(claudeDir, "commands", "role.md"),
]) {
  if (existsSync(f)) targets.push(f);
}

if (targets.length === 0) {
  log(`Nothing to remove under ${claudeDir} (no swe-workflow-skills install found).`);
  process.exit(0);
}

log(`Will remove from ${claudeDir}:`);
for (const t of targets) log("  " + t);
log(`  (and prune swe-workflow skillOverrides from ${settingsLocal})`);

if (dryRun) {
  log("");
  log("Dry run: nothing changed.");
  process.exit(0);
}

if (!assumeYes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const reply = (await rl.question("Proceed? [y/N] ")).trim();
  rl.close();
  if (!/^(y|yes)$/i.test(reply)) {
    log("Aborted.");
    process.exit(0);
  }
}

// Prune settings.local.json (machine-written baseline). Best-effort.
if (libSkills.length > 0) {
  try {
    pruneSettings(settingsLocal, libSkills);
  } catch {
    process.stderr.write(
      `Warning: could not prune ${settingsLocal} (remove swe-workflow skillOverrides by hand).\n`,
    );
  }
}

for (const t of targets) {
  rmSync(t, { recursive: true, force: true });
  log(`Removed: ${t}`);
}

// Tidy now-empty machinery dirs (ignore failures: the user may keep other content).
for (const d of [dest, join(claudeDir, "hooks"), join(claudeDir, "commands")]) {
  if (isDir(d)) {
    try {
      rmdirSync(d);
      log(`Removed empty dir: ${d}`);
    } catch {
      /* not empty — leave it */
    }
  }
}

log("");
log("Done. If you enabled the SessionStart hook, remove this block from");
log(`${join(claudeDir, "settings.json")} by hand (this tool never edits settings.json):`);
log("");
log(`  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          { "type": "command", "command": "node \\".../hooks/session-start.mjs\\"" }
        ]
      }
    ]
  }`);
