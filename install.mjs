#!/usr/bin/env node
// Install Claude Code skills from this repo. Runs on Linux, macOS, and Windows
// using only the Node that Claude Code already requires (no bash / python / sed).
//
//   node install.mjs                 # all skills + machinery + hook -> ./.claude/
//   node install.mjs --global        # ...to the user config dir
//   node install.mjs --role pm       # just the PM subset
//   node install.mjs --help          # full usage

import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  chmodSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import {
  loadRoles,
  resolvedSkills,
  applyBaseline,
} from "./scripts/resolve.mjs";

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(REPO_ROOT, "skills");
const RESOLVE_SRC = join(REPO_ROOT, "scripts", "resolve.mjs");

if (!isDir(SKILLS_DIR)) {
  fatal("must be run from the swe-workflow-skills repo root");
}

const USAGE = `Usage: install.mjs [options] [skill1 skill2 ...]

Install Claude Code skills from this repo. By default installs ALL skills with a
name-only activation baseline (only the skill-router orchestrator + safety skills
auto-trigger; the rest are invoked on demand). Scope to a role at runtime with the
/role command, or install a hard subset with --role.

Options:
  -g, --global     Install to the user config dir: $CLAUDE_CONFIG_DIR if set,
                   else ~/.claude/ (default without this flag: ./.claude/)
  -d, --dir DIR    Install to a custom Claude config directory DIR
                   (mutually exclusive with --global)
  -r, --role ROLE  Install only one role's skills (a lean, hard subset; see
                   --list for roles). Without it, all skills are installed.
  -p, --prune      After installing the selected set, remove previously-installed
                   library skills that are NOT in the new selection (never touches
                   your own custom skills). Use to narrow a prior all-skills install.
  -f, --force      Overwrite a same-named skill directory that this installer did
                   not create (by default such a collision is skipped, so your own
                   custom skill with a library name is never clobbered).
  -k, --hook       (default) Install the SessionStart hook that re-asserts the
                   name-only baseline each session + injects the router nudge
                   (prints the settings snippet; never edits settings)
      --no-hook    Skip the SessionStart hook. The name-only baseline is still
                   applied at install time (persists in settings.local.json).
  -l, --list       List available skills and roles
  -h, --help       Show this help

Arguments:
  skill names      Install specific skills only (advanced; skips the role/
                   orchestrator machinery unless skill-router is included)

Examples:
  install.mjs                          # all skills + machinery + hook -> ./.claude/
  install.mjs --global                  # all skills + hook, to the user config dir
  install.mjs --global --no-hook        # ...baseline applied, but no hook installed
  install.mjs --role pm                 # just the PM subset
  install.mjs --role pm --prune         # PM subset; drop other library skills
  install.mjs --dir /etc/claude         # all skills to /etc/claude/
  install.mjs feature-planning          # one skill, no machinery`;

function isDir(p) {
  return existsSync(p) && statSync(p).isDirectory();
}
function fatal(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}
function warn(msg) {
  process.stderr.write(`Warning: ${msg}\n`);
}
function log(msg) {
  process.stdout.write(msg + "\n");
}
function listSkillDirs() {
  return readdirSync(SKILLS_DIR)
    .filter((e) => isDir(join(SKILLS_DIR, e)))
    .sort();
}
// Expand a leading ~ the way the bash installer did (manual, not shell-dependent).
function expandTilde(p) {
  if (p === "~" || p.startsWith("~/") || p.startsWith("~\\")) return homedir() + p.slice(1);
  return p;
}
// Forward-slash form of a path (no-op on POSIX). Node accepts "/" on Windows too.
function toPosix(p) {
  return p.replaceAll("\\", "/");
}

// ---- arg parsing -----------------------------------------------------------

let global = false;
let hook = true;
let prune = false;
let force = false;
let configDir = "";
let role = "";
const selected = [];

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "-g" || a === "--global") global = true;
  else if (a === "-d" || a === "--dir") {
    configDir = argv[++i];
    if (configDir === undefined) fatal("--dir requires a path");
  } else if (a.startsWith("--dir=")) configDir = a.slice("--dir=".length);
  else if (a === "-a" || a === "--all") {
    /* accepted for back-compat; installing all is the default */
  } else if (a === "-r" || a === "--role") {
    role = argv[++i];
    if (role === undefined) fatal("--role requires a role name");
  } else if (a.startsWith("--role=")) role = a.slice("--role=".length);
  else if (a === "-p" || a === "--prune") prune = true;
  else if (a === "-f" || a === "--force") force = true;
  else if (a === "-k" || a === "--hook") hook = true;
  else if (a === "--no-hook") hook = false;
  else if (a === "-l" || a === "--list") {
    log("Available skills:");
    for (const s of listSkillDirs()) log("  " + s);
    log("");
    log("Roles (--role, or /role at runtime):");
    try {
      const data = loadRoles(join(REPO_ROOT, "roles.json"));
      for (const [key, r] of Object.entries(data.roles || {})) log(`  ${key}\t${r.label || key}`);
    } catch {
      log("  (could not read roles.json)");
    }
    process.exit(0);
  } else if (a === "-h" || a === "--help") {
    log(USAGE);
    process.exit(0);
  } else if (a.startsWith("-")) {
    process.stderr.write(`Unknown option: ${a}\n${USAGE}\n`);
    process.exit(1);
  } else selected.push(a);
}

// Load + validate the role early (mirrors the bash `label` precheck).
let rolesData = null;
try {
  rolesData = loadRoles(join(REPO_ROOT, "roles.json"));
} catch {
  rolesData = null;
}
if (role) {
  if (!rolesData || !(rolesData.roles && role in rolesData.roles)) {
    fatal(`unknown role '${role}'. Run 'install.mjs --list' to see roles.`);
  }
}

// Positional args must be exact skill names, never paths: a traversal like
// `install.mjs ../..` would pass the isDir guard below and the clean-copy rmSync
// would then delete outside the destination. Reject before touching anything.
if (selected.length > 0) {
  const known = new Set(listSkillDirs());
  const bad = selected.filter((s) => !known.has(s));
  if (bad.length > 0) {
    fatal(`unknown skill(s): ${bad.join(", ")}. Run 'install.mjs --list' to see skills.`);
  }
}

// ---- resolve destination ---------------------------------------------------

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
mkdirSync(dest, { recursive: true });

// Resolve the skill set: explicit args > role subset > all (default).
let skillSet = selected;
if (skillSet.length === 0) {
  skillSet = role ? resolvedSkills(rolesData, role) : listSkillDirs();
}

// ---- provenance manifest ---------------------------------------------------
// Records which skill directories THIS installer created, so uninstall/--prune
// only ever remove our own skills and a re-install never clobbers a user's custom
// skill that happens to share a library name. See docs SECURITY.md (LOW-003).
const MANIFEST = join(dest, ".swe-workflow-manifest.json");

function readManifestSkills() {
  if (existsSync(MANIFEST)) {
    try {
      const m = JSON.parse(readFileSync(MANIFEST, "utf-8"));
      if (Array.isArray(m.skills)) return new Set(m.skills);
    } catch {
      /* unreadable manifest -> treat as absent */
    }
  }
  return null; // null = no manifest present
}

const priorManifest = readManifestSkills();
// A prior swe-workflow install (any version) leaves these machinery markers even
// before manifests existed. If neither a manifest nor a marker is present, the dest
// is not one we've installed into, so a same-named dir there must be the user's.
const priorInstall =
  priorManifest !== null ||
  existsSync(join(dest, ".roles.json")) ||
  existsSync(join(claudeDir, "hooks", "resolve.mjs"));

// Do we own the skill dir currently at dest? Manifest is authoritative when present;
// otherwise fall back to "is this dest a prior swe install at all?" so pre-manifest
// upgrades still overwrite our own skills rather than skipping them.
function installerOwns(skill) {
  if (priorManifest !== null) return priorManifest.has(skill);
  return priorInstall;
}

// ---- copy skills -----------------------------------------------------------

let errors = 0;
const installedNow = [];
for (const skill of skillSet) {
  const src = join(SKILLS_DIR, skill);
  if (!isDir(src)) {
    process.stderr.write(`Error: unknown skill '${skill}'\n`);
    errors++;
    continue;
  }
  const destPath = join(dest, skill);
  // Never clobber a same-named directory we didn't create unless --force.
  if (isDir(destPath) && !force && !installerOwns(skill)) {
    warn(
      `skipping '${skill}': a skill of that name already exists and was not installed ` +
        `by swe-workflow-skills. Use --force to overwrite it.`,
    );
    continue;
  }
  // Clean copy: drop any prior version first so files removed upstream don't linger.
  rmSync(destPath, { recursive: true, force: true });
  cpSync(src, destPath, { recursive: true });
  installedNow.push(skill);
  log(`Installed: ${skill} -> ${destPath}`);
}

// --prune: narrow a prior install to the current selection. Only ever removes skills
// that exist in our source tree AND that this installer created (so the user's own
// custom skills — including any that share a library name — are never touched).
const pruned = new Set();
if (prune) {
  const keep = new Set(skillSet);
  for (const s of listSkillDirs()) {
    if (!keep.has(s) && isDir(join(dest, s)) && installerOwns(s)) {
      rmSync(join(dest, s), { recursive: true, force: true });
      pruned.add(s);
      log(`Pruned: ${s} (not in selection)`);
    }
  }
}

// Rewrite the provenance manifest: every library skill we own that is still present.
// = (what we owned before) ∪ (installed this run) − (pruned this run), intersected
// with library skill dirs actually on disk. Skipped collisions never enter it.
const libNames = new Set(listSkillDirs());
const ownedSkills = new Set([...(priorManifest || []), ...installedNow]);
const manifestSkills = [...ownedSkills]
  .filter((s) => !pruned.has(s) && libNames.has(s) && isDir(join(dest, s)))
  .sort();
if (installedNow.length > 0 || priorManifest !== null || prune) {
  let manifestVersion = "";
  try {
    manifestVersion = readFileSync(join(REPO_ROOT, "VERSION"), "utf-8").trim();
  } catch {
    /* VERSION is optional metadata in the manifest */
  }
  writeFileSync(
    MANIFEST,
    JSON.stringify({ installer: "swe-workflow-skills", version: manifestVersion, skills: manifestSkills }, null, 2) + "\n",
  );
}

// ---- orchestrator machinery (only when skill-router is in the set) ---------

const hasRouter = skillSet.includes("skill-router");
let hookPath = "";

if (hasRouter) {
  // Catalog + role map alongside the skills, for the orchestrator and resolve.mjs.
  copyIfExists(join(REPO_ROOT, "roles.json"), join(dest, ".roles.json"));
  copyIfExists(join(REPO_ROOT, "catalog.json"), join(dest, ".catalog.json"));

  // resolve.mjs is the shared engine for the hook + /role command. Park it next to
  // where the hook lives.
  const toolsDir = join(claudeDir, "hooks");
  mkdirSync(toolsDir, { recursive: true });
  cpSync(RESOLVE_SRC, join(toolsDir, "resolve.mjs"));

  if (role) {
    writeFileSync(join(dest, ".active-role"), role + "\n");
    log(`Wrote role marker -> ${join(dest, ".active-role")} (${role})`);
  }

  // Install the /role command, substituting absolute paths. The command body runs
  // through Claude Code's Bash tool (Git Bash on Windows), so substitute forward-slash
  // paths: Node accepts them on every OS and they avoid backslash-escaping pitfalls in
  // the shell's double-quoted strings.
  const cmdSrc = join(REPO_ROOT, "commands", "role.md");
  if (existsSync(cmdSrc)) {
    const cmdDestDir = join(claudeDir, "commands");
    mkdirSync(cmdDestDir, { recursive: true });
    const filled = readFileSync(cmdSrc, "utf-8")
      .replaceAll("@@RESOLVE@@", toPosix(join(toolsDir, "resolve.mjs")))
      .replaceAll("@@SKILLS@@", toPosix(dest))
      .replaceAll("@@SETTINGS@@", toPosix(join(claudeDir, "settings.local.json")))
      .replaceAll("@@ROLES@@", toPosix(join(dest, ".roles.json")))
      .replaceAll("@@ACTIVE_ROLE@@", toPosix(join(dest, ".active-role")));
    writeFileSync(join(cmdDestDir, "role.md"), filled);
    log(`Installed /role command -> ${join(cmdDestDir, "role.md")}`);
  }

  // Apply the name-only baseline now, so a fresh install never overflows the skill
  // listing (cropping). skillOverrides persists in settings.local.json, so this holds
  // even before the hook is wired and with --no-hook; the hook just re-asserts it.
  try {
    const data = loadRoles(join(dest, ".roles.json"));
    applyBaseline(data, join(claudeDir, "settings.local.json"), dest, role || null);
    log(`Applied name-only baseline -> ${join(claudeDir, "settings.local.json")}`);
  } catch {
    warn("could not apply the name-only baseline (skills may crop until you run /role).");
  }
}

// ---- hook ------------------------------------------------------------------

if (hook) {
  const hookSrc = join(REPO_ROOT, "hooks", "session-start.mjs");
  if (!existsSync(hookSrc)) {
    process.stderr.write(`Error: hook script not found at ${hookSrc}\n`);
    errors++;
  } else if (!hasRouter) {
    warn("--hook needs the orchestrator; install includes no skill-router, skipping hook.");
  } else {
    const hookDestDir = join(claudeDir, "hooks");
    mkdirSync(hookDestDir, { recursive: true });
    cpSync(hookSrc, join(hookDestDir, "session-start.mjs"));
    try {
      chmodSync(join(hookDestDir, "session-start.mjs"), 0o755);
    } catch {
      /* chmod is a nicety; the hook is invoked via `node`, not executed directly */
    }
    hookPath = join(hookDestDir, "session-start.mjs");
    log(`Installed hook script -> ${hookPath}`);
    log("");
    log("The name-only baseline is already applied. To have it re-asserted every");
    log("session (and the router nudge injected), merge this into");
    log(`${join(claudeDir, "settings.json")} (the installer does NOT edit settings for you):`);
    log("");
    log(hookSnippet(hookPath));
    log("");
    log("Start a new session and run /doctor to confirm the hook is registered.");
    log("(Prefer no hook? Re-run with --no-hook; the baseline still applies.)");
  }
}

if (errors !== 0) process.exit(1);

function copyIfExists(src, destPath) {
  if (existsSync(src)) cpSync(src, destPath);
}

// Double-quote a path for the POSIX shell that runs the hook command, escaping the
// chars that stay active inside double quotes (\ $ ` "). Without the $/` escapes, a
// config path containing e.g. `$(cmd)` would run that command substitution at every
// session start. For \ and " this produces exactly what JSON.stringify used to (so
// Windows paths render unchanged); cmd.exe keeps the backslash before $/`, but paths
// with those chars are effectively POSIX-only.
function shellQuote(p) {
  return '"' + p.replace(/[\\$`"]/g, (c) => "\\" + c) + '"';
}

// The SessionStart block to merge into settings.json.
function hookSnippet(path) {
  const block = {
    hooks: {
      SessionStart: [
        {
          matcher: "startup|resume|clear|compact",
          hooks: [{ type: "command", command: `node ${shellQuote(path)}` }],
        },
      ],
    },
  };
  return JSON.stringify(block, null, 2)
    .split("\n")
    .map((l) => "  " + l)
    .join("\n");
}
