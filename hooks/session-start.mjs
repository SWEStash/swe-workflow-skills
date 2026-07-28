#!/usr/bin/env node
// swe-workflow-skills — SessionStart hook (the activation baseline writer).
//
// The library uses a "name-only baseline": all skills are installed, but only a
// pinned critical set (the skill-router orchestrator + safety skills) keeps its
// description in context and auto-triggers. Everything else is listed name-only
// (invocable, but not auto-triggered) so the listing never overflows the budget.
//
// On every session boundary (startup|resume|clear|compact) this hook:
//   1. writes that baseline into <claude>/settings.local.json via resolve.mjs
//      (promoting the active role's skills to "on" if a role is set), and
//   2. emits reloadSkills:true so it applies to THIS session, plus a short nudge.
//
// settings.local.json `skillOverrides` and reloadSkills both hot-reload, so the
// crop takes effect immediately. The listing is NOT re-injected after /compact,
// which is why this must run on every boundary.
//
// Pure Node (the one runtime Claude Code guarantees on every OS). Register it as
//   { "type": "command", "command": "node \"<path>/session-start.mjs\"" }
// so it runs identically on Linux, macOS, and Windows.

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(SCRIPT_DIR, "..", "skills");
const SETTINGS = join(SCRIPT_DIR, "..", "settings.local.json");
const ROLES_FILE = join(SKILLS_DIR, ".roles.json");

const BASE = `This project has the swe-workflow skills library installed with a name-only
baseline: only a few critical skills (the \`skill-router\` orchestrator plus the
safety skills) keep their descriptions in context and auto-trigger. Every other
skill is listed by name only — invocable, but it will NOT auto-trigger on its
own. Routing through \`skill-router\` is the ONLY way those skills activate.

Consult \`skill-router\` FIRST — as your very first action, before you explore or
analyze the codebase, spawn subagents, plan, design, or make any Edit/Write — on
any substantial software work: analysis, planning, a structural or data decision,
implementing, debugging, reviewing, refactoring, or shipping. It reads the full
catalog and invokes the right skill by name. Exploring or planning first and
routing "once you understand the problem" is already too late — route, THEN
explore under the chosen skill.

Re-route on each new PHASE of work, not just at session start: when you pivot
from analysis to implementing, to writing tests, to reviewing, to FINISHING
(claiming done, committing, opening a PR), or to shipping, consult
\`skill-router\` again for that phase before you act. The skill for the new
phase almost certainly isn't loaded yet — routing once at the start does not
cover work you start an hour later. Finishing counts: "that's everything",
"let's commit", and "ready to open the PR" begin a phase and need routing too.

Route even when you already believe you know how to proceed — do NOT wait until
you feel unsure, and do NOT talk yourself out of it because the task "looks like a
one-liner," touches only one file, or seems obvious. Small structural changes
(renames, config edits, dependency bumps) and anything that matches a specific
skill's domain (accessibility, API design, security, data modeling, migrations,
performance…) are exactly what the skills are for. When in doubt, route.

Skip ONLY for genuinely trivial, conversational, or information-lookup replies,
or when the user tells you not to use a skill or to "just do X" — the user's
explicit instructions always take precedence.`;

// Active role, if one was set (by install --role or the /role command).
let role = "";
const activeRoleFile = join(SKILLS_DIR, ".active-role");
if (existsSync(activeRoleFile)) {
  try {
    role = readFileSync(activeRoleFile, "utf-8").replace(/\s+/g, "");
  } catch {
    role = "";
  }
}

// Write the name-only baseline (promote pinned ∪ active-role to "on"). Best-effort:
// if resolve.mjs / roles.json / skills aren't present, skip silently. resolve.mjs
// is a sibling once installed; fall back to the repo location for in-tree runs.
async function loadResolve() {
  for (const p of [join(SCRIPT_DIR, "resolve.mjs"), join(SCRIPT_DIR, "..", "scripts", "resolve.mjs")]) {
    if (existsSync(p)) return import(pathToFileURL(p).href);
  }
  return null;
}

function isDir(p) {
  return existsSync(p) && statSync(p).isDirectory();
}

try {
  if (existsSync(ROLES_FILE) && isDir(SKILLS_DIR)) {
    const resolveMod = await loadResolve();
    if (resolveMod) {
      const data = resolveMod.loadRoles(ROLES_FILE);
      // A stale/removed role in .active-role must NOT abort the hook: applyBaseline
      // calls process.exit on an unknown role (uncatchable), which would suppress the
      // nudge below. Fall back to the baseline if the marker no longer names a role.
      if (role && !(data.roles && role in data.roles)) role = "";
      resolveMod.applyBaseline(data, SETTINGS, SKILLS_DIR, role || null);
    }
  }
} catch {
  // best-effort: never block the session if the baseline can't be written
}

let ctx = BASE;
if (role) {
  ctx +=
    `\n\nActive role: ${role} — its skills are promoted to auto-trigger. ` +
    "Switch with `/role <name>` (`/role all` resets to baseline).";
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      reloadSkills: true,
      additionalContext: ctx,
    },
  }) + "\n",
);
