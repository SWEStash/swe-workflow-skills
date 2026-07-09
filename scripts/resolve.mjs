#!/usr/bin/env node
// Resolve roles.json into skill lists and skillOverrides maps.
//
// Dependency-free helper shared by install.mjs / uninstall.mjs (import) and by the
// SessionStart hook + the /role command (CLI). Pure JSON + set logic — runs on
// Linux, macOS, and Windows with only the Node that Claude Code already requires.
//
// Usage (CLI):
//   node resolve.mjs roles                       List role keys + labels (TSV).
//   node resolve.mjs skills <role>               Resolved skill set for a role (one per line).
//   node resolve.mjs label  <role>               Human label for a role.
//   node resolve.mjs overrides [role]            Emit a skillOverrides JSON object marking
//                                                every installed skill outside (pinned ∪ role)
//                                                as "name-only". Installed skill names are read
//                                                from stdin (newline-separated). No role => only
//                                                the pinned set stays on (the baseline).
//   node resolve.mjs apply <settings.local.json> <skills_dir> [role]
//                                                Merge the name-only baseline (for [role], or
//                                                pinned-only) into the settings file's
//                                                skillOverrides, preserving all other keys and
//                                                any overrides for non-installed skills.
//   node resolve.mjs prune <settings.local.json> [skill ...]
//                                                Remove the given skills from the settings
//                                                file's skillOverrides (used by uninstall).
//                                                Drops skillOverrides entirely when empty.
//   node resolve.mjs validate <skills_dir>       Integrity check: every referenced skill
//                                                exists, and every non-meta skill is in >=1 role.
//
// roles.json is read from $ROLES_JSON if set, else ../roles.json relative to this file.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROLES_JSON =
  process.env.ROLES_JSON || join(HERE, "..", "roles.json");

// ---- core resolution -------------------------------------------------------

export function loadRoles(rolesPath = DEFAULT_ROLES_JSON) {
  return JSON.parse(readFileSync(rolesPath, "utf-8"));
}

function roleOrDie(data, role) {
  const roles = data.roles || {};
  if (!(role in roles)) {
    const known = Object.keys(roles).sort().join(", ");
    die(`unknown role '${role}' (known: ${known})`);
  }
  return roles[role];
}

// Role working set = its core set UNION its own skills, order-stable.
export function resolvedSkills(data, role) {
  const r = roleOrDie(data, role);
  const core = (data.core || {})[r.core || "universal"] || [];
  const seen = new Set();
  const out = [];
  for (const skill of [...core, ...(r.skills || [])]) {
    if (!seen.has(skill)) {
      seen.add(skill);
      out.push(skill);
    }
  }
  return out;
}

// Skills that stay `on` (full description, auto-trigger): the pinned set, plus the
// active role's working set when a role is given.
export function keepOnSet(data, role) {
  const keep = new Set(data.pinned || []);
  if (role) for (const s of resolvedSkills(data, role)) keep.add(s);
  return keep;
}

export function nameonlyMap(data, installed, role) {
  const keepOn = keepOnSet(data, role);
  const map = {};
  for (const s of installed) if (!keepOn.has(s)) map[s] = "name-only";
  return map;
}

// Directory entries that are skills (subdirectories), sorted.
export function installedSkills(skillsDir) {
  return readdirSync(skillsDir)
    .filter((e) => statSync(join(skillsDir, e)).isDirectory())
    .sort();
}

// ---- disabled-skills marker ------------------------------------------------
//
// Lets a user opt a skill OUT of routing/auto-trigger and have it *survive* the
// SessionStart hook. A plain settings.local.json edit can't: applyBaseline owns
// every installed skill's entry and rewrites it each session. Instead the choice
// lives in a `.disabled-skills` marker beside the skills (like `.active-role`),
// which applyBaseline folds in on every write — so the hook re-asserts the
// disable rather than reverting it.
//
// Format: one skill per line, optional state after whitespace; `#` comments and
// blank lines ignored. Valid states are the two that hide a skill from the model:
//   data-modeling                 -> user-invocable-only (default; human /name still works)
//   data-modeling off             -> off (fully hidden)

export const DISABLE_STATES = new Set(["user-invocable-only", "off"]);
export const DEFAULT_DISABLE_STATE = "user-invocable-only";

export function disabledMarkerPath(skillsDir) {
  return join(skillsDir, ".disabled-skills");
}

// Parse the marker into Map<skill, state>. Best-effort: a missing or unreadable
// file yields an empty map (never throws — the hook must not fail on it).
export function readDisabled(skillsDir) {
  const path = disabledMarkerPath(skillsDir);
  const map = new Map();
  if (!(existsSync(path) && statSync(path).isFile())) return map;
  let text = "";
  try {
    text = readFileSync(path, "utf-8");
  } catch {
    return map;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [name, state] = line.split(/\s+/);
    if (!name) continue;
    map.set(name, DISABLE_STATES.has(state) ? state : DEFAULT_DISABLE_STATE);
  }
  return map;
}

// Same, but restricted to skills actually installed here (stale names dropped).
export function loadDisabled(skillsDir) {
  const installed = new Set(installedSkills(skillsDir));
  const map = new Map();
  for (const [name, state] of readDisabled(skillsDir)) {
    if (installed.has(name)) map.set(name, state);
  }
  return map;
}

// Persist Map<skill, state>, sorted. Removes the marker entirely when empty so an
// enabled-everything state leaves no file behind (mirrors pruneSettings dropping
// an empty skillOverrides).
export function writeDisabled(skillsDir, map) {
  const path = disabledMarkerPath(skillsDir);
  const names = [...map.keys()].sort();
  if (names.length === 0) {
    if (existsSync(path)) rmSync(path);
    return;
  }
  const lines = names.map((n) => (map.get(n) === DEFAULT_DISABLE_STATE ? n : `${n} ${map.get(n)}`));
  writeFileSync(path, lines.join("\n") + "\n");
}

// ---- settings I/O ----------------------------------------------------------

// Recursively sort object keys so output is deterministic (mirrors Python's
// json.dump(..., sort_keys=True)).
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = sortKeysDeep(value[k]);
    return out;
  }
  return value;
}

export function loadSettings(settingsPath) {
  if (existsSync(settingsPath) && statSync(settingsPath).isFile()) {
    const text = readFileSync(settingsPath, "utf-8");
    try {
      return JSON.parse(text) || {};
    } catch (e) {
      // A corrupt (e.g. hand-edited) file must NOT read as empty: downstream
      // writers would rebuild it from {} and silently destroy the user's
      // settings. Throw so callers skip the write (the SessionStart hook
      // catches this and leaves the file alone; the CLI surfaces it).
      throw new Error(`unparseable JSON in ${settingsPath} — fix or remove it (${e.message})`);
    }
  }
  return {};
}

export function writeSettings(settingsPath, settings) {
  mkdirSync(dirname(resolvePath(settingsPath)), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(sortKeysDeep(settings), null, 2) + "\n");
}

// ---- apply / prune ---------------------------------------------------------

// Merge the name-only baseline into a settings file. Returns {nameOnly, on, role}.
export function applyBaseline(data, settingsPath, skillsDir, role) {
  if (role === "all" || role === "none") role = null;
  if (role) roleOrDie(data, role);

  const installed = installedSkills(skillsDir);
  const desired = nameonlyMap(data, installed, role); // {skill: "name-only"} tail

  const settings = loadSettings(settingsPath);
  let existing = settings.skillOverrides;
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) existing = {};

  // Preserve overrides for skills we don't manage (not installed here); we own every
  // installed skill's entry: name-only for the tail, absent (=> on) otherwise.
  const installedSet = new Set(installed);
  const merged = {};
  for (const [k, v] of Object.entries(existing)) if (!installedSet.has(k)) merged[k] = v;
  Object.assign(merged, desired);

  // User-disabled skills override the baseline: an explicit opt-out wins over
  // name-only AND over a pinned/role-promoted "on" (a pinned skill the user
  // disabled becomes user-invocable-only, not on). Read from the marker each
  // call so the hook re-asserts the disable instead of reverting it.
  const disabled = loadDisabled(skillsDir);
  for (const [s, state] of disabled) merged[s] = state;

  settings.skillOverrides = merged;

  writeSettings(settingsPath, settings);
  const nameOnly = Object.keys(desired).length;
  return { nameOnly, on: installed.length - nameOnly, role, disabled: disabled.size };
}

// Remove the given skills from a settings file's skillOverrides. Returns removed count.
export function pruneSettings(settingsPath, skills) {
  if (!(existsSync(settingsPath) && statSync(settingsPath).isFile())) return { removed: 0, missing: true };
  const settings = loadSettings(settingsPath);
  const overrides = settings.skillOverrides;
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return { removed: 0, noOverrides: true };
  }
  const want = new Set(skills);
  let removed = 0;
  for (const s of want) {
    if (s in overrides) {
      delete overrides[s];
      removed++;
    }
  }
  if (Object.keys(overrides).length > 0) settings.skillOverrides = overrides;
  else delete settings.skillOverrides; // drop the empty key entirely
  writeSettings(settingsPath, settings);
  return { removed };
}

// ---- validate --------------------------------------------------------------

export function validate(data, skillsDir) {
  const errors = [];

  // Every skill referenced anywhere in the SSOT.
  const referenced = new Set([...(data.pinned || []), ...(data.meta_only || [])]);
  for (const core of Object.values(data.core || {})) for (const s of core) referenced.add(s);
  const inARole = new Set();
  for (const role of Object.keys(data.roles || {})) {
    for (const s of resolvedSkills(data, role)) {
      referenced.add(s);
      inARole.add(s);
    }
  }

  // Every referenced skill must exist on disk.
  for (const skill of [...referenced].sort()) {
    if (!isDir(join(skillsDir, skill))) errors.push(`referenced skill missing on disk: ${skill}`);
  }

  // Every non-meta skill on disk must belong to >=1 role (no orphans).
  const meta = new Set(data.meta_only || []);
  const universal = new Set((data.core || {}).universal || []);
  const technical = new Set((data.core || {}).technical || []);
  const covered = new Set([...inARole, ...universal, ...technical]);
  for (const entry of readdirSync(skillsDir).sort()) {
    if (!isDir(join(skillsDir, entry))) continue;
    if (meta.has(entry)) continue;
    if (!covered.has(entry)) errors.push(`orphan skill (in no role/core): ${entry}`);
  }
  return errors;
}

function isDir(p) {
  return existsSync(p) && statSync(p).isDirectory();
}

// ---- CLI -------------------------------------------------------------------

export function die(msg, code = 1) {
  process.stderr.write(`resolve.mjs: ${msg}\n`);
  process.exit(code);
}

function readStdin() {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const CLI = {
  roles(data) {
    for (const [key, r] of Object.entries(data.roles || {})) {
      process.stdout.write(`${key}\t${r.label || key}\n`);
    }
  },
  skills(data, args) {
    if (!args[0]) die("skills requires a <role>");
    for (const s of resolvedSkills(data, args[0])) process.stdout.write(s + "\n");
  },
  label(data, args) {
    if (!args[0]) die("label requires a <role>");
    process.stdout.write(roleOrDie(data, args[0]).label || args[0]);
    process.stdout.write("\n");
  },
  overrides(data, args) {
    const role = args[0] || null;
    if (role) roleOrDie(data, role);
    const installed = readStdin()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    process.stdout.write(JSON.stringify(sortKeysDeep(nameonlyMap(data, installed, role)), null, 2) + "\n");
  },
  apply(data, args) {
    if (args.length < 2) die("apply requires <settings.local.json> <skills_dir> [role]");
    const { nameOnly, on, role } = applyBaseline(data, args[0], args[1], args[2]);
    process.stdout.write(
      `applied: ${nameOnly} name-only, ${on} on (role=${role || "baseline"}) -> ${args[0]}\n`,
    );
  },
  prune(_data, args) {
    if (!args[0]) die("prune requires <settings.local.json> [skill ...]");
    const settingsPath = args[0];
    const res = pruneSettings(settingsPath, args.slice(1));
    if (res.missing) process.stdout.write(`pruned: 0 (no settings file at ${settingsPath})\n`);
    else if (res.noOverrides) process.stdout.write(`pruned: 0 (no skillOverrides) -> ${settingsPath}\n`);
    else process.stdout.write(`pruned: ${res.removed} skillOverrides entries -> ${settingsPath}\n`);
  },
  validate(data, args) {
    if (!args[0]) die("validate requires a <skills_dir>");
    const errors = validate(data, args[0]);
    if (errors.length) {
      for (const e of errors) process.stderr.write(`FAIL: ${e}\n`);
      process.exit(1);
    }
    process.stdout.write(`OK: roles.json integrity verified against ${args[0]}\n`);
  },
};

// Commands that don't read roles.json — they work on a settings file alone, so they
// must run even when resolve.mjs is installed away from roles.json (e.g. under hooks/).
const NO_ROLES_DATA = new Set(["prune"]);

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || !(cmd in CLI)) {
    die(`usage: resolve.mjs <${Object.keys(CLI).join("|")}> [args]`, 2);
  }
  const data = NO_ROLES_DATA.has(cmd) ? {} : loadRoles();
  CLI[cmd](data, args);
}

// Run as CLI only when invoked directly (not when imported). Compare case-insensitively
// on Windows, where the invoking path's drive-letter / casing may differ from the
// module URL's even when they point at the same file.
function samePath(a, b) {
  const x = resolvePath(a);
  const y = resolvePath(b);
  return process.platform === "win32" ? x.toLowerCase() === y.toLowerCase() : x === y;
}
if (process.argv[1] && samePath(process.argv[1], fileURLToPath(import.meta.url))) {
  main();
}
