# Roles & activation model

This library uses a **name-only baseline with an active orchestrator** so that a
large skill set stays reliable on any context window.

**Orchestrator-routed activation is a core feature in its own right** — not just a
way to manage cropping. The `skill-router` deterministically selects and invokes the
right skill from a full catalog, so activation **does not depend on Claude's
description-based auto-triggering** (which is probabilistic and degrades as the skill
set grows). Routing both eliminates cropping *and* makes activation predictable and
testable — the repo ships a routing-eval harness ([EVALS.md](EVALS.md)) to keep it
honest. The source of truth is [`roles.json`](../roles.json); the catalog and
marketplace are generated from it.

## The problem this solves

Claude Code injects each installed skill's `name`+`description` into a per-session
listing capped at `skillListingBudgetFraction` (**1% of the context window** —
only ~20–22 descriptions fit on a 200k window). Past the cap it **drops the
least-recently-used descriptions arbitrarily**, silently stripping the keywords
skills need to auto-trigger. With 40+ skills, description-based triggering becomes
unreliable and uncontrolled.

## How it works

- **Pinned skills stay `on`** (full description, auto-trigger): the `skill-router`
  orchestrator plus the safety Iron-Law skills — `verification-before-completion`,
  `tdd-workflow`, `bug-investigating`, `incident-response`, `code-reviewing`.
- **Every other skill is `name-only`**: listed by name, still invocable, but it
  does **not** auto-trigger and its description costs ~nothing. The listing never
  overflows, so the window size is irrelevant. `name-only` is Claude Code's own
  state — its docs recommend it for low-priority skills; the library's contribution
  is applying it *wholesale* across the catalog and re-asserting it every session,
  not the state itself.
- **The orchestrator activates the rest.** `skill-router` reads the generated
  `catalog.json` (every skill's full description, with no budget pressure), matches
  your intent, and **invokes the chosen skill by name**. This replaces ~40 fragile
  description matches with one reliable router (kept `on`, reinforced by the
  SessionStart hook nudge, always available as `/skill-router`). Routing — not
  auto-trigger — is the activation path the library relies on.
- **Roles promote a working set back to `on`.** Activating a role flips its skills
  to auto-trigger for direct, one-hop use of your daily set.

| `skillOverrides` value  | In listing | Auto-triggers | User-invocable |
|-------------------------|------------|---------------|----------------|
| `on` (default)          | name+desc  | yes           | yes            |
| `name-only`             | name only  | no            | yes            |
| `user-invocable-only`   | hidden     | no            | yes (`/name`)  |
| `off`                   | hidden     | no            | no             |

`skillOverrides` and the listing **hot-reload** when `settings.local.json`
changes, so the baseline and role switches apply without a restart.

## Routing flow

```mermaid
flowchart TD
    H["SessionStart hook<br/>writes the name-only baseline + router nudge"]
    U["User intent<br/>(or a new phase of work)"]
    R{{"skill-router<br/>(pinned, always loaded)"}}
    C["Reads catalog.json<br/>every skill's full description, no budget cost"]
    M["Matches intent → one or more skills"]
    I["Invokes the chosen skill(s) by name"]
    W["Skill runs its workflow"]
    P{"Work shifts to<br/>a new phase?"}
    D["Done"]
    POOL[("name-only skills<br/>invocable, not auto-triggered")]
    ROLE["/role &lt;name&gt;"]

    H -. primes the session .-> R
    U --> R
    R --> C
    C --> M
    M --> I
    I --> W
    W --> P
    P -- "yes — re-route" --> R
    P -- no --> D
    POOL --- C
    ROLE -. "promotes a set back to auto-trigger" .-> POOL
```

The router is the only decision point: it draws from the full catalog (not the
budget-limited listing), invokes by name, and is re-entered every time the work
changes phase. A role just flips part of the name-only pool back to auto-trigger for
direct one-hop use.

## What routing looks like in a session

The router isn't a one-time gate — Claude re-consults it as the *kind* of work
changes, so each phase loads only the skill it needs. A single feature might play out
like this:

```text
you ▸ "Add OAuth login to the API."

       ┌─ skill-router ──────────────────────────────────────────────┐
phase  │ matches intent → invokes by name                            │
───────┼─────────────────────────────────────────────────────────────┤
plan   │ → feature-planning      scope tasks, acceptance criteria      │
design │ → architecture-design   ADR: session vs token, where auth lives
       │ → data-modeling         user/session schema + migration       │
build  │ → tdd-workflow          red → green → refactor                │
review │ → security-audit  +  code-reviewing   (fan-out: one prompt,   │
       │                                        two skills)            │
ship   │ → deployment-checklist  pre-deploy safety + rollback          │
       └─────────────────────────────────────────────────────────────┘

# A new phase later in the session re-routes — the testing skill wasn't
# loaded an hour ago, so the router fetches it now:
you ▸ "Now add tests for the token-refresh edge cases."
       → skill-router → test-suite-design

# Working in one hat all session? Promote the set so it auto-triggers:
you ▸ /role backend
       backend skills now auto-trigger; everything else stays one route away.
```

Two things to notice: a single request can **fan out** to several skills
(`security-audit` *and* `code-reviewing`), and a later phase **re-routes** to a skill
that wasn't loaded earlier — which is exactly why routing beats one-shot
auto-triggering at this scale.

## Two ways to avoid cropping (and where each works)

Cropping has exactly two cures, and which install method you pick comes down to which
one a given surface can use:

1. **Name-only baseline (lever ①)** — keep descriptions out of the listing for all but
   the pinned set. Scales to any number of skills. But it *is* `skillOverrides`, and
   **`skillOverrides` only affects skills under `.claude/skills/`** (personal / project
   / enterprise level). Applying it is a settings write — done by the installer and
   re-asserted by the hook. Works where settings + hooks run: **CLI and Cowork.**
2. **Small install (lever ②)** — install fewer skills than the budget (~20). Weaker (it
   caps your working set) but needs no settings, so it works **everywhere**, including
   Claude Code on the web and claude.ai chat. This is exactly what a per-role plugin does.

### Why plugins can't carry the baseline

Per the Claude Code docs, **"Plugin skills are not affected by `skillOverrides`."** No
plugin setting and no hook can mark a plugin's skills name-only — the only visibility
control for a plugin's skills is enabling/disabling the plugin. So a single
"everything" plugin would inject all 40+ descriptions and crop on *every* surface, CLI
included. That's why the full library ships via the **installer** (lever ①) and the
marketplace ships **per-role plugins** (lever ②), each small enough to fit — and why
the per-role plugins omit `skill-router` (with no baseline to route around, and no
catalog it could read, it would only waste a listing slot).

## Roles

| Role key   | Persona                          | Core      |
|------------|----------------------------------|-----------|
| `backend`  | Backend / Full-stack Engineer    | technical |
| `frontend` | Frontend Engineer                | technical |
| `devops`   | DevOps / SRE / Platform Engineer | technical |
| `ml`       | ML Engineer / MLOps              | technical |
| `ai`       | AI Engineer (LLM apps)           | technical |
| `data`     | Data Engineer                    | technical |
| `data-scientist` | Data Scientist             | technical |
| `security` | Security Engineer                | technical |
| `architect`| Architect / Staff Engineer       | technical |
| `em`       | Engineering Manager / Tech Lead  | universal |
| `pm`       | Product / Project Manager        | universal |
| `strategy` | Strategy / Founder Review        | universal |
| `qa`       | QA / Test Engineer               | technical |
| `mobile`   | Mobile Engineer                  | technical |
| `designer` | Designer / UX                    | universal |

A role's working set = its **core** ∪ its own skills. Cores: **universal** =
`skill-router`, `brainstorming`, `feature-planning`; **technical** =
`skill-router`, `feature-planning`, `plan-execution`, `git-workflow`,
`code-reviewing`, `verification-before-completion`, `bug-investigating`,
`project-documentation`. Inspect with `node scripts/resolve.mjs skills <role>`
or list roles with `node scripts/resolve.mjs roles`. Promoted-set sizes stay at
or under the ~20-description crop cap (`backend` and `devops` both sit exactly
at 20 — any addition to either, or to the technical core, forces a trim or a
role split first). `subagent-orchestration` is deliberately role-less
(`meta_only`, like `writing-skills`): it's a way of working, not a hat — always
one route away.

## Install (CLI — the full dynamic model)

This is the only path that delivers the **whole library** without cropping, because
the name-only baseline (`skillOverrides`) applies only to skills in `.claude/skills/`
— see [Why plugins can't carry the baseline](#why-plugins-cant-carry-the-baseline).

The installer is **pure Node** — the runtime Claude Code already requires — so these
commands run unchanged on **Linux, macOS, and Windows** (no bash, Python, or `sed`).

```bash
node install.mjs                     # all skills + machinery + hook + baseline -> ./.claude/
node install.mjs --global            # ...to the user config dir
node install.mjs --no-hook           # skip the hook (baseline still applied at install)
node install.mjs --role pm           # hard subset: just the PM skills (no orchestrator gating)
node install.mjs --role pm --prune   # ...and drop other library skills from a prior install
```

The default installs **all** skills plus the machinery (catalog/role markers,
`resolve.mjs`, the `/role` command), **applies the name-only baseline** to
`settings.local.json` immediately, and installs the SessionStart hook. Because the
baseline is written at install time and `skillOverrides` persists, the install is
**crop-safe right away** — even before you wire the hook, and with `--no-hook`. The
hook (on by default) **re-asserts** the baseline on every session boundary
(`startup|resume|clear|compact`), emits `reloadSkills`, and injects the router
nudge — needed because the skill listing isn't re-injected after `/compact`. The
installer prints the `settings.json` snippet to enable it; it never edits your settings.

> **Wire the hook (required for auto-routing).** Installing is two steps: the baseline
> makes the install crop-safe immediately, but the **router nudge only fires once the hook
> is wired**. Until you merge the printed `SessionStart` snippet into `settings.json`,
> Claude isn't prompted to consult `skill-router` first, so skills won't auto-route and the
> baseline isn't re-asserted after `/compact`. Merge the block, start a new session, and run
> `/doctor` to confirm the hook is registered. `--no-hook` is the explicit opt-out (baseline
> still applies; auto-routing stays off). The per-role **plugins** need no hook.

Re-running install is idempotent: each skill is re-copied cleanly (no stale
leftover files). `--prune` additionally removes previously-installed library skills
outside the new selection (never your own custom skills). `--global` resolves to
`$CLAUDE_CONFIG_DIR` when that env var is set, else `~/.claude`; explicit `--dir`
always wins.

### Uninstall

```bash
node uninstall.mjs                   # remove from ./.claude/
node uninstall.mjs --global          # ...from the user config dir
node uninstall.mjs --dry-run         # preview only
```

Removes only what the installer created (this repo's skills, the catalog/role
markers, `resolve.mjs`, the hook script, the `/role` command) and prunes the
library's `skillOverrides` from `settings.local.json`. It prompts first (`--yes` to
skip) and prints the `SessionStart` block to delete from `settings.json` — which it
never edits. The `.active-role` marker is only written by `--role` (and rewritten by
`/role`); `/role all|none` and `uninstall.mjs` clear it.

### Switch roles at runtime

```text
/role            # show the active role + list roles
/role backend    # promote the backend set to auto-trigger
/role all        # reset to baseline (only pinned skills auto-trigger)
```

`/role` rewrites `settings.local.json` (hot-reloads) and records the choice in an
`.active-role` marker so the hook re-asserts it across compaction.

### Advanced: disable a skill from routing

Routing every skill is the point of this library — the orchestrator enforces a
consistent SDLC method. But the workflow is personal, and you may not want a
particular skill in the mix. You can opt a skill **out** of routing and
auto-trigger:

```bash
npx swe-workflow-skills disable data-modeling   # from a clone: node disable.mjs disable data-modeling
npx swe-workflow-skills disable data-modeling --off   # fully hide it
npx swe-workflow-skills enable  data-modeling   # undo
npx swe-workflow-skills list-disabled           # see what's disabled
```

Both forms stop the skill from being routed or auto-triggered — that's the shared
"disable" behavior. `--off` is the stronger variant; the only thing it changes is
whether the manual `/<skill>` escape hatch survives:

| | `disable <skill>` (default) | `disable <skill> --off` |
|---|---|---|
| `skillOverrides` value written | `user-invocable-only` | `off` |
| Router / model can auto-select it | no | no |
| You can still run it manually as `/<skill>` | **yes** | no |
| Appears in the `/` menu | yes | hidden |

So the default keeps the skill out of the automatic workflow but reachable when you
deliberately ask for it (`/data-modeling`); `--off` removes it entirely until you
`enable` it again. Flags combine as you'd expect — `--off` is independent of the
target dir, e.g. `disable data-modeling --off --global`; only `--global` and `--dir`
are mutually exclusive (they both name where to install/target). `enable <skill>`
reverses either one back to the name-only baseline.

This is an **advanced opt-out** — it bypasses the router's method enforcement for
that skill, so reach for it only when a skill genuinely doesn't fit how you work.
It even works on a pinned safety skill, which just means giving up that guardrail.

Why a command instead of editing `settings.local.json` by hand (or cycling the
state in Claude Code's native `/skills` menu): the SessionStart hook rewrites every
installed skill's `skillOverrides` entry each session, so a manual `off` edit — or a
`/skills` change — is reverted at the next session boundary. The command is the
**persistent form of what `/skills` does**: it records your choice in a
`.disabled-skills` marker beside the skills, which the hook folds into the baseline
every time — so the disable **persists**. (No hook installed?
The command still writes the marker and applies it immediately; the marker is
honored whenever the baseline is next applied.)

## Install (plugins — the recommended, cross-surface path)

For everywhere hooks don't run — **Claude Code on the web, claude.ai chat, and
Cowork** — and as the simplest managed install on the CLI too, the repo is a
marketplace of **per-role plugins**. Each is a hard subset (lever ②), so the subset
*is* the scope: small enough to never crop, no orchestrator or baseline needed.
Generated from `roles.json` by `scripts/build-plugins.mjs` into
[`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json) and `plugins/`
(do not edit by hand).

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-pm@swe-workflow
```

In **claude.ai chat** the same marketplace is added from Customize → Plugins (Team/
Enterprise admins can distribute it org-wide); bundled **skills and slash-commands
work**, while **hooks and sub-agents are greyed out** (Cowork-only). On **Claude Code
web**, plugins and skills load but **hooks don't run** — which is exactly why these
are per-role subsets rather than one full-library plugin (see
[Why plugins can't carry the baseline](#why-plugins-cant-carry-the-baseline)).
Verified against the Claude Code / claude.ai docs, 2026-06.
