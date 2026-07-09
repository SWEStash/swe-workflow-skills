#!/usr/bin/env node
// Disable / enable a single skill from routing and auto-trigger, durably.
//
// The library installs a name-only baseline: skills don't auto-trigger, they're
// invoked by the skill-router. Disabling goes one step further — it hides a skill
// from the router too, for users who don't want the whole corpus routed. This is
// an ADVANCED opt-out of the routed SWE-methodology; most people don't need it.
//
// Why a command (not a manual settings edit): the SessionStart hook re-writes
// every installed skill's skillOverrides entry each session, so a hand edit is
// reverted. This records the choice in a `.disabled-skills` marker beside the
// skills, which the hook folds into the baseline every time — so it persists.
//
// Runs on Linux, macOS, and Windows using only Node.
//
//   node disable.mjs disable <skill>          # -> user-invocable-only (default)
//   node disable.mjs disable <skill> --off    # -> off (fully hidden)
//   node disable.mjs enable  <skill>          # re-enable (back to the baseline)
//   node disable.mjs list                     # show disabled skills
//   node disable.mjs disable <skill> --global # target the user config dir

import { existsSync, statSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import {
  loadRoles,
  applyBaseline,
  installedSkills,
  readDisabled,
  writeDisabled,
  DEFAULT_DISABLE_STATE,
} from "./scripts/resolve.mjs";

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

const USAGE = `Usage: disable.mjs <disable|enable|list> [skill] [options]

Disable or re-enable a skill from routing/auto-trigger (advanced opt-out).

Actions:
  disable <skill>   Hide <skill> from the router. Default state: user-invocable-only
                    (you can still run it manually as /<skill>). Add --off to hide
                    it entirely (not even user-invocable).
  enable  <skill>   Re-enable <skill> (return it to the name-only baseline).
  list              List currently disabled skills.

Options:
  --off          With 'disable': set state to "off" instead of user-invocable-only
  -g, --global   Target the user config dir: $CLAUDE_CONFIG_DIR if set, else
                 ~/.claude/ (default without this flag: ./.claude/)
  -d, --dir DIR  Target a custom Claude config directory DIR
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
let off = false;
let configDir = "";
const positional = [];

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "-g" || a === "--global") global = true;
  else if (a === "--off") off = true;
  else if (a === "-d" || a === "--dir") {
    configDir = argv[++i];
    if (configDir === undefined) fatal("--dir requires a path");
  } else if (a.startsWith("--dir=")) configDir = a.slice("--dir=".length);
  else if (a === "-h" || a === "--help") {
    log(USAGE);
    process.exit(0);
  } else if (a.startsWith("-")) {
    process.stderr.write(`Unknown option: ${a}\n${USAGE}\n`);
    process.exit(1);
  } else positional.push(a);
}

const action = positional[0];
const skill = positional[1];
if (!action || !["disable", "enable", "list"].includes(action)) {
  process.stderr.write(`${USAGE}\n`);
  process.exit(1);
}
if ((action === "disable" || action === "enable") && !skill) {
  fatal(`'${action}' requires a <skill> name`);
}
// Reject path-like / malformed names before any filesystem use.
if (skill && !/^[a-z0-9][a-z0-9-]*$/.test(skill)) {
  fatal(`invalid skill name '${skill}' (expected lowercase letters, digits, hyphens)`);
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
const settingsLocal = join(claudeDir, "settings.local.json");

if (!isDir(dest)) fatal(`no skills found at ${dest} (is the library installed there? try --global or --dir)`);

// Roles data: prefer the installed marker beside the skills, else the repo copy.
function loadRolesData() {
  for (const p of [join(dest, ".roles.json"), join(REPO_ROOT, "roles.json")]) {
    if (existsSync(p)) return loadRoles(p);
  }
  return null;
}

// Active role, so re-applying the baseline preserves the user's promoted set.
function activeRole(data) {
  const f = join(dest, ".active-role");
  if (!existsSync(f)) return null;
  try {
    const r = readFileSync(f, "utf-8").replace(/\s+/g, "");
    return r && data && data.roles && r in data.roles ? r : null;
  } catch {
    return null;
  }
}

// Re-assert the baseline now so the change hot-reloads in the current session
// (like /role), instead of waiting for the next session boundary.
function reapply() {
  const data = loadRolesData();
  if (!data) return; // no roles data (partial/plugin install): marker still written
  try {
    applyBaseline(data, settingsLocal, dest, activeRole(data));
  } catch (e) {
    process.stderr.write(`Warning: wrote the marker but could not re-apply the baseline (${e.message}).\n`);
    process.stderr.write("It will take effect at the next session start.\n");
  }
}

// ---- actions ---------------------------------------------------------------

const disabled = readDisabled(dest);

if (action === "list") {
  if (disabled.size === 0) {
    log("No skills are disabled.");
  } else {
    log("Disabled skills:");
    for (const name of [...disabled.keys()].sort()) log(`  ${name}  (${disabled.get(name)})`);
  }
  process.exit(0);
}

const data = loadRolesData();
const installed = new Set(installedSkills(dest));

if (action === "disable") {
  if (!installed.has(skill)) fatal(`unknown skill '${skill}' — not installed at ${dest}`);
  const state = off ? "off" : DEFAULT_DISABLE_STATE;
  disabled.set(skill, state);
  writeDisabled(dest, disabled);
  reapply();
  log(`Disabled '${skill}' -> ${state}.`);
  if (state === DEFAULT_DISABLE_STATE) {
    log(`The router will no longer invoke it; you can still run it manually as /${skill}.`);
  } else {
    log("It is now fully hidden (not routable and not user-invocable).");
  }
  if (data && Array.isArray(data.pinned) && data.pinned.includes(skill)) {
    log(`Note: '${skill}' is a pinned safety skill — disabling it opts out of that guardrail.`);
  }
  log("This persists across sessions (the hook re-asserts it). Re-enable with:");
  log(`  node disable.mjs enable ${skill}${global ? " --global" : ""}`);
} else {
  // enable
  if (!disabled.has(skill)) {
    log(`'${skill}' is not disabled — nothing to do.`);
    process.exit(0);
  }
  disabled.delete(skill);
  writeDisabled(dest, disabled);
  reapply();
  log(`Enabled '${skill}' — back to the name-only baseline (routable again).`);
}
