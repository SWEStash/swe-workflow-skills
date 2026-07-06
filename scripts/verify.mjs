#!/usr/bin/env node
// End-to-end verification for the name-only-baseline + orchestrator activation.
// Runs offline (no API key) on Linux, macOS, and Windows — pure Node, no bash.
// Exits non-zero on the first failure.
//
//   node scripts/verify.mjs

import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  loadRoles,
  nameonlyMap,
  applyBaseline,
  pruneSettings,
  validate,
  installedSkills,
} from "./resolve.mjs";
import { parseFrontmatter, listingOf } from "./build-plugins.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NODE = process.execPath;
const data = loadRoles(join(ROOT, "roles.json"));
const SKILL_DIRS = installedSkills(join(ROOT, "skills"));
const TOTAL = SKILL_DIRS.length;
const PINNED = (data.pinned || []).length;
const NAME_ONLY = TOTAL - PINNED; // skills cropped under the baseline

const TMP = mkdtempSync(join(tmpdir(), "swe-verify-"));
process.on("exit", () => rmSync(TMP, { recursive: true, force: true }));

let stepNo = 0;
function step(title) {
  stepNo++;
  console.log(`${stepNo}. ${title}`);
}
function pass(msg) {
  console.log(`  ok: ${msg}`);
}
function fail(msg) {
  console.error(`  FAIL: ${msg}`);
  process.exit(1);
}
function check(cond, msg) {
  if (!cond) fail(msg);
}
function install(args) {
  execFileSync(NODE, [join(ROOT, "install.mjs"), ...args], { stdio: "ignore" });
}
function uninstall(args) {
  execFileSync(NODE, [join(ROOT, "uninstall.mjs"), ...args], { stdio: "ignore" });
}
function readJSON(p) {
  return JSON.parse(readFileSync(p, "utf-8"));
}
function isDir(p) {
  return existsSync(p) && statSync(p).isDirectory();
}
function fakeSkillTree(dir) {
  mkdirSync(join(dir, "skills"), { recursive: true });
  for (const s of SKILL_DIRS) mkdirSync(join(dir, "skills", s), { recursive: true });
  return join(dir, "skills");
}

// 1 — roles.json integrity
step("roles.json integrity");
check(validate(data, join(ROOT, "skills")).length === 0, "validate found errors");
pass("every referenced skill exists; no orphans");

// 1b — version single-source (VERSION drives package.json + the marketplace)
step("version single-source is in sync");
const VER = readFileSync(join(ROOT, "VERSION"), "utf-8").trim();
const pkgVer = readJSON(join(ROOT, "package.json")).version;
check(pkgVer === VER, `package.json version ${pkgVer} != VERSION ${VER}`);
const mktVer = readJSON(join(ROOT, ".claude-plugin", "marketplace.json")).version;
check(mktVer === VER, `marketplace version ${mktVer} != VERSION ${VER}`);
pass(`VERSION, package.json, and marketplace all agree on ${VER}`);

// 2 — generator + catalog + JSON validity
step("generator + catalog + JSON validity");
execFileSync(NODE, [join(ROOT, "scripts", "build-plugins.mjs")], { stdio: "ignore", cwd: ROOT });
const jsonFiles = [];
for (const base of ["plugins", ".claude-plugin"]) {
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (isDir(p)) walk(p);
      else if (e.endsWith(".json")) jsonFiles.push(p);
    }
  };
  if (isDir(join(ROOT, base))) walk(join(ROOT, base));
}
jsonFiles.push(join(ROOT, "catalog.json"));
for (const f of jsonFiles) {
  try {
    readJSON(f);
  } catch {
    fail(`invalid JSON: ${f}`);
  }
}
const catalog = readJSON(join(ROOT, "catalog.json")).skills;
const catNames = new Set(catalog.map((s) => s.name));
const diskNames = new Set(SKILL_DIRS);
check(
  catNames.size === diskNames.size && [...catNames].every((n) => diskNames.has(n)),
  "catalog != skills on disk",
);
check(catalog.every((s) => s.description), "catalog has an empty description (listing = description + when_to_use)");
// when_to_use awareness: a skill using the description/when_to_use split must land
// concatenated in the catalog, for both single-line and block-scalar values.
const fx = join(TMP, "fixture-SKILL.md");
writeFileSync(
  fx,
  `---\nname: fixture\ndescription: "Does X. Boundary: not Y."\nwhen_to_use: "Triggers: do x, run x."\n---\nbody\n`,
);
check(
  listingOf(parseFrontmatter(fx)) === "Does X. Boundary: not Y. Triggers: do x, run x.",
  "when_to_use (single-line) not concatenated into the listing",
);
writeFileSync(
  fx,
  `---\nname: fixture\ndescription: Does X.\nwhen_to_use: >-\n  Triggers: do x,\n  run x.\nmodel: haiku\n---\nbody\n`,
);
check(
  listingOf(parseFrontmatter(fx)) === "Does X. Triggers: do x, run x.",
  "when_to_use (block scalar) not folded into the listing",
);
check(listingOf(parseFrontmatter(fx, "fb")) !== "", "fixture parse produced an empty listing");
pass("marketplace + catalog.json valid; catalog covers every skill; when_to_use concatenation verified");

// 3 — override computation
step("override computation");
const base = nameonlyMap(data, SKILL_DIRS, null);
check(!("skill-router" in base) && !("tdd-workflow" in base), "pinned must stay on");
check(base["api-design"] === "name-only", "non-pinned must be name-only at baseline");
const pm = nameonlyMap(data, SKILL_DIRS, "pm");
check(!("prd-writing" in pm), "in-role skill must be on");
check(pm["api-design"] === "name-only", "out-of-role skill must be name-only");
pass("baseline crops all non-pinned; role promotes its set");

// 4 — apply merges into settings, preserving keys
step("apply merges into settings, preserving keys");
const skillsDir4 = fakeSkillTree(join(TMP, "apply"));
const s4 = join(TMP, "apply", "s.json");
writeFileSync(s4, JSON.stringify({ model: "opus", skillOverrides: { external: "off" } }));
applyBaseline(data, s4, skillsDir4, "pm");
const d4 = readJSON(s4);
check(d4.model === "opus", "preserve unrelated key");
check(d4.skillOverrides.external === "off", "preserve unmanaged override");
check(!("prd-writing" in d4.skillOverrides), "pm skill should be on");
check(d4.skillOverrides["api-design"] === "name-only", "out-of-role should be name-only");
// Corrupt settings must throw (not read as {}): a silent {} would let the next
// write rebuild the file and destroy the user's settings.
const sCorrupt = join(TMP, "apply", "corrupt.json");
writeFileSync(sCorrupt, '{ "model": "opus", }');
let corruptThrew = false;
try {
  applyBaseline(data, sCorrupt, skillsDir4, null);
} catch {
  corruptThrew = true;
}
check(corruptThrew, "applyBaseline must throw on a corrupt settings file");
check(
  readFileSync(sCorrupt, "utf-8") === '{ "model": "opus", }',
  "corrupt settings file must be left untouched",
);
pass("settings merge preserves other keys + unmanaged overrides; corrupt file throws untouched");

// 5 — install (default = all + machinery + hook + baseline applied)
step("install (default = all + machinery + hook + baseline applied)");
const inst = join(TMP, "inst");
install(["--dir", inst]);
check(
  readdirSync(join(inst, "skills")).filter((e) => isDir(join(inst, "skills", e))).length === TOTAL,
  `expected ${TOTAL} skills`,
);
for (const f of [
  "skills/.roles.json",
  "skills/.catalog.json",
  "hooks/resolve.mjs",
  "hooks/session-start.mjs",
  "commands/role.md",
]) {
  check(existsSync(join(inst, f)), `missing ${f}`);
}
check(!readFileSync(join(inst, "commands", "role.md"), "utf-8").includes("@@"), "unsubstituted placeholders");
const instOv = readJSON(join(inst, "settings.local.json")).skillOverrides;
check(
  Object.values(instOv).filter((v) => v === "name-only").length === NAME_ONLY,
  `expected ${NAME_ONLY} name-only at install`,
);
check(!("skill-router" in instOv), "router must stay on");
const nohook = join(TMP, "nohook");
install(["--no-hook", "--dir", nohook]);
check(!existsSync(join(nohook, "hooks", "session-start.mjs")), "--no-hook should not install the hook");
check(
  Object.values(readJSON(join(nohook, "settings.local.json")).skillOverrides).filter((v) => v === "name-only")
    .length === NAME_ONLY,
  "--no-hook must still apply the baseline",
);
pass(`default installs hook + applies ${NAME_ONLY} name-only baseline; --no-hook keeps baseline, skips hook`);

// 5b — installer hardening: positional args are exact skill names; hook snippet is shell-safe
step("installer rejects path-traversal args + shell-escapes the hook snippet");
const trav = join(TMP, "trav");
let travFailed = false;
try {
  execFileSync(NODE, [join(ROOT, "install.mjs"), "--dir", trav, "../.."], { stdio: "ignore" });
} catch {
  travFailed = true;
}
check(travFailed, "install must reject a path-traversal positional arg");
check(!existsSync(trav), "rejected install must not create the destination");
const single = join(TMP, "single");
install(["--dir", single, "feature-planning"]);
check(isDir(join(single, "skills", "feature-planning")), "exact skill names must still install");
// A config dir containing `$(pwd)` must come out backslash-escaped in the printed
// hook snippet, or the command substitution would run at session start.
const evil = join(TMP, "evil-$(pwd)");
const evilOut = execFileSync(NODE, [join(ROOT, "install.mjs"), "--dir", evil], { encoding: "utf-8" });
check(evilOut.includes("\\\\$(pwd)"), "hook snippet must shell-escape $ in the config path");
pass("traversal args rejected before any copy; $(...) in the config path is escaped in the snippet");

// 6 — SessionStart hook writes baseline + reloadSkills (preserving keys)
step("SessionStart hook writes baseline + reloadSkills (preserving keys)");
writeFileSync(join(inst, "settings.local.json"), JSON.stringify({ model: "x" }));
const hookOut = execFileSync(NODE, [join(inst, "hooks", "session-start.mjs")], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
const hookJSON = JSON.parse(hookOut).hookSpecificOutput;
check(hookJSON.reloadSkills === true, "hook must set reloadSkills");
check(!!hookJSON.additionalContext, "hook must emit additionalContext");
const d6 = readJSON(join(inst, "settings.local.json"));
check(d6.model === "x", "hook must preserve other settings keys");
check(
  Object.values(d6.skillOverrides).filter((v) => v === "name-only").length === NAME_ONLY,
  `expected ${NAME_ONLY} name-only at baseline`,
);
check(!("skill-router" in d6.skillOverrides), "router stays on");
pass(`hook writes ${NAME_ONLY} name-only baseline, reloadSkills, valid JSON, preserves keys`);

// 7 — role set/reset engine (what /role drives)
step("role set/reset (the engine behind /role)");
const s7 = join(inst, "settings.local.json");
applyBaseline(data, s7, join(inst, "skills"), "pm");
check(!("prd-writing" in readJSON(s7).skillOverrides), "pm not promoted");
applyBaseline(data, s7, join(inst, "skills"), "none");
check(readJSON(s7).skillOverrides["prd-writing"] === "name-only", "reset to baseline should re-crop pm skills");
pass("role apply promotes its set; reset returns to baseline");

// 7b — a stale/invalid .active-role must NOT break the hook (best-effort baseline)
step("hook tolerates a stale .active-role (no abort, falls back to baseline)");
writeFileSync(join(inst, "settings.local.json"), JSON.stringify({ model: "x" }));
writeFileSync(join(inst, "skills", ".active-role"), "ghost-role-removed-from-roles\n");
let staleOut;
try {
  staleOut = execFileSync(NODE, [join(inst, "hooks", "session-start.mjs")], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  fail("hook exited non-zero on a stale .active-role");
}
const staleCtx = JSON.parse(staleOut).hookSpecificOutput.additionalContext;
check(!staleCtx.includes("Active role:"), "stale role should fall back to baseline (no role line)");
check(
  Object.values(readJSON(join(inst, "settings.local.json")).skillOverrides).filter((v) => v === "name-only")
    .length === NAME_ONLY,
  "stale role must still write the baseline",
);
rmSync(join(inst, "skills", ".active-role"), { force: true });
pass("stale .active-role: hook still emits the nudge + baseline, exit 0");

// 8 — prune removes managed keys, preserves the rest, drops empty
step("prune removes managed keys, preserves the rest");
const p8 = join(TMP, "p.json");
writeFileSync(p8, JSON.stringify({ model: "x", skillOverrides: { "api-design": "name-only", external: "off" } }));
pruneSettings(p8, ["api-design"]);
const d8 = readJSON(p8);
check(d8.model === "x", "preserve unrelated key");
check(JSON.stringify(d8.skillOverrides) === JSON.stringify({ external: "off" }), "should keep only unmanaged");
const p8b = join(TMP, "p2.json");
writeFileSync(p8b, JSON.stringify({ skillOverrides: { "api-design": "name-only" } }));
pruneSettings(p8b, ["api-design"]);
check(!("skillOverrides" in readJSON(p8b)), "prune should drop empty skillOverrides");
pass("prune removes managed keys, keeps unmanaged, drops empty skillOverrides");

// 9 — install --prune narrows to the selection (keeps user skills)
step("install --prune narrows to the selection (keeps user skills)");
const narrow = join(TMP, "narrow");
install(["--dir", narrow]);
mkdirSync(join(narrow, "skills", "zz-user-skill"), { recursive: true });
install(["--role", "pm", "--prune", "--dir", narrow]);
check(isDir(join(narrow, "skills", "prd-writing")), "pm skill missing after prune");
check(!isDir(join(narrow, "skills", "containerization")), "non-pm skill should be pruned");
check(isDir(join(narrow, "skills", "zz-user-skill")), "user skill must be preserved");
pass("--prune removes non-selected library skills, preserves user skills");

// 10 — uninstall removes our files, prunes local settings, preserves user skill + settings.json
step("uninstall removes our files, prunes local settings, preserves user skill + settings.json");
const un = join(TMP, "un");
install(["--dir", un]);
mkdirSync(join(un, "skills", "zz-user-skill"), { recursive: true });
writeFileSync(
  join(un, "settings.local.json"),
  JSON.stringify({ model: "x", skillOverrides: { "api-design": "name-only", external: "off" } }),
);
writeFileSync(join(un, "settings.json"), JSON.stringify({ hooks: { SessionStart: [] } }));
uninstall(["--yes", "--dir", un]);
for (const gone of [
  "skills/api-design",
  "skills/.roles.json",
  "skills/.catalog.json",
  "hooks/resolve.mjs",
  "hooks/session-start.mjs",
  "commands/role.md",
]) {
  check(!existsSync(join(un, gone)), `uninstall left ${gone}`);
}
check(isDir(join(un, "skills", "zz-user-skill")), "user skill must be preserved");
check(existsSync(join(un, "settings.json")), "settings.json must be untouched");
const d10 = readJSON(join(un, "settings.local.json"));
check(d10.model === "x", "preserve unrelated key");
check(!("api-design" in (d10.skillOverrides || {})), "library override should be pruned");
check((d10.skillOverrides || {}).external === "off", "unmanaged override preserved");
pass("uninstall removes library files, prunes local overrides, keeps user skill + settings.json");

// 11 — --global honors CLAUDE_CONFIG_DIR
step("--global honors CLAUDE_CONFIG_DIR");
const cfg = join(TMP, "cfg");
execFileSync(NODE, [join(ROOT, "install.mjs"), "--global"], {
  stdio: "ignore",
  env: { ...process.env, CLAUDE_CONFIG_DIR: cfg },
});
check(
  isDir(join(cfg, "skills")) &&
    readdirSync(join(cfg, "skills")).filter((e) => isDir(join(cfg, "skills", e))).length >= 1,
  "--global did not install under CLAUDE_CONFIG_DIR",
);
pass("--global installs under CLAUDE_CONFIG_DIR when set");

console.log("\nALL CHECKS PASSED");
