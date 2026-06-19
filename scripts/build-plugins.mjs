#!/usr/bin/env node
// Generate the plugin-per-role marketplace from roles.json (the SSOT).
//
//   node scripts/build-plugins.mjs          # (re)generate plugins/ + .claude-plugin/
//   node scripts/build-plugins.mjs --check  # fail if the generated tree is stale
//
// Each role becomes a plugin under plugins/<role>/ with its resolved skill set
// copied from the canonical skills/ (copy, not symlink, for git + portability).
// CI runs --check (which is just: regenerate, then `git diff --exit-code`).

import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
const PLUGINS = join(ROOT, "plugins");
const MARKET_DIR = join(ROOT, ".claude-plugin");
const CATALOG = join(ROOT, "catalog.json");
const VERSION = "0.1.0";

const roles = JSON.parse(readFileSync(join(ROOT, "roles.json"), "utf-8"));

// Parse the `name` and `description` from a SKILL.md YAML frontmatter block.
// Descriptions in this repo are single-line, optionally quoted.
function parseFrontmatter(skillDir) {
  const text = readFileSync(join(SKILLS, skillDir, "SKILL.md"), "utf-8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = m ? m[1] : "";
  const field = (key) => {
    const line = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    if (!line) return "";
    return line[1].trim().replace(/^["']/, "").replace(/["']\s*$/, "").trim();
  };
  return { name: field("name") || skillDir, description: field("description") };
}

// Build catalog.json: full descriptions for every skill, read by the orchestrator
// (skill-router) at routing time — no listing-budget pressure.
function buildCatalog() {
  const skills = readdirSync(SKILLS)
    .filter((e) => statSync(join(SKILLS, e)).isDirectory())
    .sort()
    .map((dir) => {
      const { name, description } = parseFrontmatter(dir);
      return { name, description, path: `${dir}/SKILL.md` };
    });
  writeFileSync(CATALOG, JSON.stringify({ version: 1, skills }, null, 2) + "\n");
  return skills.length;
}

// Role working set = its core set UNION its own skills, order-stable.
function resolvedSkills(roleKey) {
  const r = roles.roles[roleKey];
  const core = roles.core[r.core] || [];
  const out = [];
  for (const s of [...core, ...r.skills]) if (!out.includes(s)) out.push(s);
  return out;
}

// Skills that belong in the CLI dynamic model but NOT in a plugin. The orchestrator
// (`skill-router`) only earns its place under the name-only baseline, where it routes
// among suppressed skills via the catalog. A plugin can't apply that baseline —
// plugin skills are exempt from `skillOverrides` (per the Claude Code docs), so a
// plugin's subset just auto-triggers. The router would have no catalog to route from
// and would only waste a skill-listing-budget slot. Exclude it from plugins.
const PLUGIN_EXCLUDE = new Set(["skill-router"]);

function build() {
  rmSync(PLUGINS, { recursive: true, force: true });
  rmSync(join(MARKET_DIR, "marketplace.json"), { force: true });
  mkdirSync(MARKET_DIR, { recursive: true });

  const marketplacePlugins = [];

  for (const [key, r] of Object.entries(roles.roles)) {
    const pluginDir = join(PLUGINS, key);
    const skills = resolvedSkills(key).filter((s) => !PLUGIN_EXCLUDE.has(s));

    // Copy each resolved skill from the canonical source.
    for (const skill of skills) {
      const src = join(SKILLS, skill);
      if (!existsSync(src)) throw new Error(`role '${key}' references missing skill '${skill}'`);
      cpSync(src, join(pluginDir, "skills", skill), { recursive: true });
    }

    // plugin.json manifest (only file under the plugin's .claude-plugin/).
    const manifest = {
      name: `swe-workflow-${key}`,
      displayName: r.label,
      description: r.description,
      version: VERSION,
      author: { name: "SWEStash" },
      keywords: ["skills", "sdlc", key],
    };
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );

    marketplacePlugins.push({
      name: `swe-workflow-${key}`,
      displayName: r.label,
      description: `${r.description} (${skills.length} skills)`,
      version: VERSION,
      source: { source: "directory", path: `./plugins/${key}` },
    });
  }

  const marketplace = {
    name: "swe-workflow",
    displayName: "SWE Workflow Skills",
    description: "Role-scoped SDLC workflow skills. Install the plugin(s) for your role.",
    version: VERSION,
    owner: { name: "SWEStash" },
    plugins: marketplacePlugins,
  };
  writeFileSync(
    join(MARKET_DIR, "marketplace.json"),
    JSON.stringify(marketplace, null, 2) + "\n",
  );

  writeFileSync(
    join(PLUGINS, "README.md"),
    [
      "# Generated role plugins",
      "",
      "**Do not edit by hand.** This directory is generated from `roles.json` and the",
      "canonical `skills/` by `scripts/build-plugins.mjs`. Edit a skill under `skills/`",
      "or the role map in `roles.json`, then re-run the generator and commit:",
      "",
      "```bash",
      "node scripts/build-plugins.mjs",
      "```",
      "",
      "Each subdirectory is a Claude Code plugin (one per role) exposed via",
      "`.claude-plugin/marketplace.json`. See docs/ROLES.md for installation.",
      "",
    ].join("\n"),
  );

  return marketplacePlugins.length;
}

const count = build();
const catalogCount = buildCatalog();
console.log(`Generated ${count} role plugins + .claude-plugin/marketplace.json + catalog.json (${catalogCount} skills)`);

if (process.argv.includes("--check")) {
  // Catch both modified (diff) and newly-generated (untracked) files.
  const status = execSync("git status --porcelain -- plugins .claude-plugin catalog.json", {
    cwd: ROOT,
    encoding: "utf-8",
  });
  if (status.trim()) {
    console.error("\nFAIL: marketplace tree is stale or uncommitted:\n" + status);
    console.error("Run `node scripts/build-plugins.mjs` and commit the result.");
    process.exit(1);
  }
  console.log("OK: generated marketplace tree is up to date.");
}
