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
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { resolvedSkills } from "./resolve.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
const PLUGINS = join(ROOT, "plugins");
const MARKET_DIR = join(ROOT, ".claude-plugin");
const CATALOG = join(ROOT, "catalog.json");
// Single source of truth for the library version (see docs/RELEASING.md). All
// plugins + the marketplace are versioned in lockstep from this file.
const VERSION = readFileSync(join(ROOT, "VERSION"), "utf-8").trim();

const roles = JSON.parse(readFileSync(join(ROOT, "roles.json"), "utf-8"));

// Parse `name`, `description`, and `when_to_use` from a SKILL.md YAML
// frontmatter block. Values are single-line (optionally quoted) or YAML block
// scalars (`>`/`|` variants), which are folded to one line — the catalog is a
// single-line-per-skill artifact either way.
export function parseFrontmatter(skillMdPath, fallbackName = "") {
  const text = readFileSync(skillMdPath, "utf-8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = m ? m[1] : "";
  const field = (key) => {
    const line = fm.match(new RegExp(`^${key}:[ \\t]*(.*)$`, "m"));
    if (!line) return "";
    const v = line[1].trim();
    if (/^[>|][+-]?$/.test(v)) {
      // Block scalar: gather the following indented lines, fold with spaces.
      const rest = fm.slice(line.index + line[0].length).split(/\r?\n/).slice(1);
      const block = [];
      for (const raw of rest) {
        if (raw.trim() === "") continue;
        if (!/^[ \t]/.test(raw)) break;
        block.push(raw.trim());
      }
      return block.join(" ").replace(/\s+/g, " ").trim();
    }
    return v.replace(/^["']/, "").replace(/["']\s*$/, "").trim();
  };
  return {
    name: field("name") || fallbackName,
    description: field("description"),
    when_to_use: field("when_to_use"),
  };
}

// The routing/listing text for a skill: `description` + `when_to_use` appended,
// mirroring how the platform composes the skill listing. The catalog carries
// this combined string in its `description` field (schema unchanged), so a
// pure-move migration (triggers relocated from description to when_to_use)
// produces a byte-identical catalog entry and the router/evals see no change.
export function listingOf(fmFields) {
  return fmFields.when_to_use
    ? `${fmFields.description} ${fmFields.when_to_use}`
    : fmFields.description;
}

// Build catalog.json: full descriptions for every skill, read by the orchestrator
// (skill-router) at routing time — no listing-budget pressure, but the whole file
// lands in the router's (haiku) context on every routing call, so its total size
// is a budget of its own. Guards below keep drift visible; if the total warning
// fires, the answer is the two-stage routing adaptation tracked in docs/ROLES.md,
// not raising the threshold.
const DESC_HARD_CAP = 1024; // platform cap on the `description` field alone
const LISTING_HARD_CAP = 1536; // platform cap on description + when_to_use combined
const DESC_SOFT_CAP = 600; // this repo's discipline (~350–550 target), on the combined listing
const CATALOG_WARN_CHARS = 48_000; // ~12k tokens per routing call on haiku

function buildCatalog() {
  const skills = readdirSync(SKILLS)
    .filter((e) => statSync(join(SKILLS, e)).isDirectory())
    .sort()
    .map((dir) => {
      const fmFields = parseFrontmatter(join(SKILLS, dir, "SKILL.md"), dir);
      const { name, description } = fmFields;
      const listing = listingOf(fmFields);
      if (description.length > DESC_HARD_CAP) {
        console.error(`ERROR: ${name} description is ${description.length} chars (> ${DESC_HARD_CAP} platform cap)`);
        process.exit(1);
      }
      if (listing.length > LISTING_HARD_CAP) {
        console.error(
          `ERROR: ${name} description + when_to_use is ${listing.length} chars (> ${LISTING_HARD_CAP} platform listing cap)`,
        );
        process.exit(1);
      }
      if (listing.length > DESC_SOFT_CAP) {
        console.warn(`warn: ${name} listing is ${listing.length} chars (> ${DESC_SOFT_CAP} soft cap — trim it)`);
      }
      return { name, description: listing, path: `${dir}/SKILL.md` };
    });
  const json = JSON.stringify({ version: 1, skills }, null, 2) + "\n";
  if (json.length > CATALOG_WARN_CHARS) {
    console.warn(
      `warn: catalog.json is ${json.length} chars (> ${CATALOG_WARN_CHARS}) — the router pays this per routing call; ` +
        `time to implement the two-stage routing adaptation (see docs/ROLES.md follow-ups)`
    );
  }
  writeFileSync(CATALOG, json);
  return skills.length;
}

// Role working set = its core set UNION its own skills, order-stable — the one
// implementation lives in resolve.mjs (imported above); a second copy here had
// already drifted on the missing-`core` default.

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
    const skills = resolvedSkills(roles, key).filter((s) => !PLUGIN_EXCLUDE.has(s));

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
      source: `./plugins/${key}`,
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

// Run only when executed directly — verify.mjs imports parseFrontmatter/listingOf
// without triggering a build.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
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
}
