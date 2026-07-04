# Authoring Skills

What you need to know to write a new skill or modify an existing one. This guide is
also packaged as the installable `writing-skills` skill, which adds the Skill
Discovery Optimization (SDO) description rule and pressure-testing (TDD-for-docs) on
top of these rules.

## Skill Architecture

Each skill follows the progressive disclosure pattern:

```
skill-name/
├── SKILL.md              # Entry point: metadata + core workflow (< 500 lines)
├── references/           # Deep-dive docs loaded on demand
│   └── principles.md     # Domain-specific guidelines
├── templates/            # Output templates
│   └── template.md       # Structured output formats
└── scripts/              # Utility scripts (optional)
    └── validate.sh       # Validation helpers
```

## Design Principles

1. **Concise over verbose** — Claude is smart; only add what it doesn't already know.
2. **Progressive disclosure** — SKILL.md is the map; reference files are the territory.
3. **Appropriate freedom** — Strict where fragile, flexible where creative.
4. **Feedback loops** — Validate-fix-repeat for quality-critical operations.
5. **Composable** — Skills can be used independently or combined in workflows.

## Description Is Everything

The `description` field in SKILL.md's YAML frontmatter is the primary mechanism Claude
uses to decide whether to load a skill. If the description doesn't match the user's
prompt, the skill never runs — no matter how good the workflow is.

**Rules for writing descriptions:**
- **Keyword-rich**: Include all the phrases a user might say ("plan this feature",
  "scope this out", "break this down", "sprint planning"). Cast a wide net.
- **Third-person, present tense**: "Use when the user needs to..." not "I help with..."
- **~350 characters, hard cap 1024**: The 1024-char per-skill limit is enforced, but
  it is not the binding constraint at scale. Claude Code only injects skill listings up
  to `skillListingBudgetFraction` of the context (default 1% ≈ 2k tokens). With 30+
  skills installed, ~350 chars per description is a realistic target — anything longer
  and `/doctor` will report descriptions being dropped.
- **Slightly assertive**: "Use when the user reports a bug" triggers more reliably than
  "May be used for bug reports." Under-triggering is the most common failure mode.
- **Include related vocabulary**: If your skill is about deployments, also mention "go
  live", "ship it", "push to production", "release".

**Recommended pattern:** `<one-line purpose>. Triggers: <comma-separated keywords>. <one-line boundary or delegation note>.`

**Skill Discovery Optimization (SDO):** describe *when to use* the skill, not *what it
does internally*. Agents follow the description over the body, so a description that
summarizes the workflow ("reviews code in two passes") triggers worse than one that
lists situations. The `Triggers:` keyword list is the when-to-use expressed as the
phrases a user actually types — that's what makes this format SDO-compliant.

**`when_to_use` (newer frontmatter field):** Claude Code now supports a dedicated
`when_to_use` field; the listing shows `description` + `when_to_use` together
(truncated at 1,536 chars, configurable via `skillListingMaxDescChars`). The natural
split is `description` = purpose + boundary/delegation, `when_to_use` = the trigger
phrases (what our `Triggers:` list encodes today), with the key use case first —
truncation cuts from the end. **In this library, keep the hybrid single-`description`
format for now**: `scripts/build-plugins.mjs` builds `catalog.json` from `description`
only, so trigger phrases moved to `when_to_use` would become invisible to the
`skill-router`. Migrating (builder + all skills + routing-eval re-baseline) is a
tracked roadmap item; do it as one coordinated change, not per-skill.

## Listing Budget

Every installed skill contributes its `name` + `description` (+ `when_to_use`) to a
single listing that Claude Code injects on every prompt, capped by
`skillListingBudgetFraction` in `settings.json` (default `0.01`, i.e. 1% of context).
When the cap is exceeded, the **least-invoked** skills' descriptions are dropped
first, and dropped skills will not auto-trigger. Check with `/doctor` — it reports
shortened/dropped descriptions — and `/context`, which shows the post-budget listing size.

Per-skill visibility is controlled by `skillOverrides`, now first-class in the docs
with four states — `"on"`, `"name-only"`, `"user-invocable-only"`, `"off"` — editable
interactively via the `/skills` menu. The official guidance now recommends exactly
what this library does: keep low-priority skills `"name-only"` to free listing budget.
**Caveat:** plugin-delivered skills are *not* affected by `skillOverrides` (only
enable/disable via `/plugin`), which is why the per-role plugins ship small subsets
instead of carrying the baseline.

**This repo sidesteps the cap with a name-only baseline** rather than by raising the
budget: only a pinned set keeps full descriptions; the rest are listed name-only
(invoked on demand by `skill-router`). So the listing stays tiny on any window — see
[ROLES.md](ROLES.md). A good `description` still matters for every skill: it's what the
orchestrator routes on (from `catalog.json`) and what auto-triggers when a role
promotes the skill to `on`.

(If you instead run a flat install of many skills with descriptions on, you can raise
the budget — e.g. `{ "skillListingBudgetFraction": 0.02 }` — but the baseline approach
is preferred.)

## Frontmatter Fields

All fields are optional except that `description` is strongly recommended. The two we
set on every skill:

| Field | Purpose | Used in this repo |
|---|---|---|
| `model` | Pin a default model when the skill activates | `haiku` for cheap formatting/lookup skills, `sonnet` for most design/review work, `opus` for deep multi-step reasoning (architecture, security audit, debt review, RCA) |
| `allowed-tools` | Restrict tools the skill can call | Most skills use `Read, Grep, Glob, Write, Edit`. Implementation- or infra-adjacent skills add `Bash`. Research-oriented skills (dependency-management, security-audit) add `WebFetch, WebSearch`. |

Newer fields worth knowing (adopt where they fit; see the
[skill settings docs](https://code.claude.com/docs/en/skills) for the full set):

| Field | Purpose | When to use here |
|---|---|---|
| `when_to_use` | Trigger phrases, listed alongside `description` (combined 1,536-char listing cap) | Preferred home for the `Triggers:` list on **new** skills |
| `context: fork` + `agent` | Run the skill in a forked subagent context (Explore/Plan/general-purpose/custom) instead of the main conversation | Heavy read-only review skills (project-review, technical-debt-review, security-audit, strategic-review) — keeps their large intermediate reads out of the main context |
| `paths` | Glob-gated activation — the skill only auto-loads when work touches matching files | File-type-specific skills (e.g. a future IaC or mobile skill scoped to `*.tf`, `ios/**`) |
| `disable-model-invocation` | Skill can only be invoked by the user (`/name`), never auto-selected | Side-effectful workflows that must be deliberate (e.g. a publish/release runbook) |
| `user-invocable: false` | Model-only skill, hidden from the `/` menu | Internal helpers |
| `effort` | Per-skill reasoning-effort override (`low`→`max`) | `low` for mechanical formatting skills; high tiers for audit/RCA skills |
| `argument-hint` / `arguments` | Named/positional arguments for user invocation | Skills commonly run as slash commands |
| `hooks` | Skill-scoped lifecycle hooks | Rarely — prefer the library's SessionStart hook |

None of these count toward the listing budget — only `name` + `description` +
`when_to_use` do. (Custom slash commands are now the same mechanism as skills —
`.claude/commands/x.md` ≡ `.claude/skills/x/SKILL.md`.)

## Dynamic Context Injection and Arguments

SKILL.md bodies support substitutions resolved at load time: `$ARGUMENTS` (or `$1`,
`$2`, named `$name`), `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`,
`${CLAUDE_SESSION_ID}`. Inline `` !`command` `` (and fenced ```` ```! ```` blocks) run
shell *before* Claude reads the skill and inline the live output — e.g. a review skill
can open with `` !`git diff --stat` `` so the diff is present without a tool call.
Use sparingly: it runs on every invocation, costs tokens, and admins can disable it
(`disableSkillShellExecution`). Our workflow skills mostly guide thinking and rarely
need it; it shines for skills that always start from the same live state (a diff, a
PR, test output).

## Content Lifecycle — Write Standing Instructions

An invoked skill's content stays in context for the rest of the session. On
auto-compaction, each previously-invoked skill is re-attached **truncated to its first
5,000 tokens, within a 25,000-token combined budget, most-recent-first** — long bodies
lose their tails and older skills drop entirely. Two consequences:

1. **Write standing instructions, not one-time steps.** "When writing a commit, do X"
   survives re-attachment; "now do step 3" is meaningless after compaction.
2. **Front-load what matters.** The Iron Law, the workflow, and the boundaries belong
   in the first screens of SKILL.md; deep detail goes to `references/` anyway.

Skills also need **retirement review**: as base models improve, a skill can become
pure overhead (the model already does it well unaided). Periodically re-run a skill's
evals RED (without the skill) — if RED ≈ GREEN across the board, retire or slim the
skill rather than letting it spend budget. This mirrors the obsolescence detection the
official skill-creator now practices.

## Token Economy and Progressive Disclosure

Every token in SKILL.md costs budget when the skill is loaded. Reference files cost
zero tokens until Claude explicitly loads them. This creates three loading tiers:

1. **Metadata** (~100 tokens): Skill name + description. Always loaded when matched.
2. **SKILL.md** (< 500 lines): Core workflow, principles, cross-references. Loaded when
   the skill activates.
3. **references/ and templates/**: Deep-dive docs, loaded on demand within a conversation.

A skill with 10,000 lines of reference material costs zero extra tokens until Claude
needs that material. **Put everything Claude already knows in references; put only
what's unique to your workflow in SKILL.md.**

## When to Use Scripts, References, and Templates

| Resource type | Use when | Example |
|---|---|---|
| `references/*.md` | Deep technical detail that's only needed sometimes (patterns, checklists, domain knowledge) | `owasp-top-10.md`, `debugging-patterns.md` |
| `templates/*.md` | Output format matters for consistency (documents, specs, reports) | `adr.md`, `pull-request.md` |
| `scripts/` | A step should always happen identically — pixel-perfect output, file generation, validation | A script that generates a migration file in the project's exact format |

These workflow skills guide *thinking*, not deterministic file operations. When in
doubt, use a reference file over a script.

## Eval Design

Each skill must have exactly 3 evals:

1. **Happy path**: The canonical use case. Good input, skill produces the expected artifact.
2. **Edge case**: Unusual but valid input that tests a corner of the workflow (empty
   state, very large scope, ambiguous requirements).
3. **Scope boundary**: A prompt that seems related but should NOT trigger this skill, or
   that triggers it and correctly hands off to a different skill.

The `assertions` array should contain specific, verifiable criteria — not vague goals
like "produces a good plan."

For safety-critical and discipline skills, add a **`pressure_tests`** block on top of
the three evals: a scenario that tempts the agent to skip the skill's Iron Law under
combined pressure (time, sunk cost, authority, exhaustion), with assertions that it
doesn't capitulate. Bulletproof skills by capturing the exact rationalizations a fresh
agent uses *without* the skill (RED), then writing the minimum that counters them
(GREEN) — see [EVALS.md](EVALS.md) and the `writing-skills` skill. This hardening
pattern (Iron Law + rationalization table + pressure tests) is adopted from
[obra/superpowers](https://github.com/obra/superpowers), which pioneered it.

## Common Mistakes

1. **Over-stuffing SKILL.md**: If your skill is over 300 lines, move domain knowledge to
   `references/`. Claude doesn't need to be taught what a REST API is.
2. **Vague descriptions**: "Helps with development tasks" will never trigger. Be specific.
3. **Time-sensitive content**: Don't include specific version numbers, dates, or tool
   versions in SKILL.md. They go stale. Put them in references/ with a note to check the
   latest docs.
4. **Windows-style paths**: Use forward slashes in all paths — users may be on any OS.
5. **Imperative commands in ALL CAPS**: "ALWAYS use parameterized queries." Modern LLMs
   respond better to reasoning: "Use parameterized queries — string interpolation enables
   SQL injection."
6. **Missing feedback loops**: If a step produces output that could be wrong, add a
   verification step. "Run the tests. If they fail, fix the issue before proceeding."
7. **Not testing the skill**: Write the evals before publishing. A skill that looks good
   but doesn't trigger is useless.

## Model Variance

Skills are tested against Claude Sonnet as the baseline. What works on Sonnet will
typically work on Opus; Haiku may need more explicit guidance in SKILL.md. If you plan
cross-model deployment, test on the lowest-capability model you'll target and add detail
accordingly.

## Explain the Why

Skills that explain *why* a practice matters produce better outcomes than skills that
issue commands. Compare:

- **Command**: "Always write a regression test before fixing a bug."
- **Why**: "Write a regression test before fixing the bug — without it, the same bug
  will silently reappear in a future refactor."

The second version helps Claude make good judgment calls in edge cases. Apply this
throughout your workflow steps.
