---
name: writing-skills
description: "Use when authoring, editing, or reviewing a skill in this library — a new SKILL.md, one that under-triggers, or hardening an existing one. Covers description and listing-budget rules, frontmatter, progressive disclosure, the 3-eval rule, and pressure-testing against rationalizations."
when_to_use: "Triggers: write a skill, new skill, edit a skill, skill isn't triggering."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Writing Skills

Author and maintain skills for this library. The canonical rule set lives in
**docs/AUTHORING.md** — read it for descriptions, listing budget, frontmatter,
dynamic context injection, and common mistakes. This skill adds the parts that
must be *applied*, not just read: how to reproduce a skill's failure before
fixing it, how to write a description that actually triggers, and how to
pressure-test.

## ⛔ The Iron Law

**Don't write a skill from imagination — reproduce the failure first, then write the minimum that fixes it.**

Writing a skill is TDD applied to process documentation. If you're fixing a
skill that under-triggers or that an agent rationalizes past, first reproduce
that exact failure (the RED). A skill written to a problem you only *imagined*
tends to over-explain things Claude already knows and miss the real failure mode.

## The authoring loop (RED → GREEN → REFACTOR)

1. **RED — reproduce the failure.** Run the target scenario against a fresh agent
   *without* the skill (or without the new section). Watch what goes wrong and
   capture the *verbatim* excuses it uses ("it's too simple to test", "I'll
   verify after"). See [references/pressure-testing.md](references/pressure-testing.md).
2. **GREEN — write the minimum that addresses those failures.** Don't pad. Match
   the form of the fix to the form of the failure (table below).
3. **REFACTOR — re-test, capture *new* rationalizations, add counters.** Repeat
   until the behavior holds under pressure. Stop when two consecutive runs pass.

### Match the form to the failure

| Baseline failure | Right form in the skill |
|---|---|
| Skips or violates a rule under pressure | An Iron Law + a rationalization table + red flags |
| Output has the wrong shape | A positive recipe / template stating what the output *is* |
| Omits a required element | A structural requirement (named field or slot) |
| Behavior should depend on a condition | A conditional rule ("if X, do Y"), not a blanket rule + exceptions |

## Description discipline (the highest-leverage line)

The `description` decides whether the skill ever runs. Agents follow the
description over the body, so get it right.

- **Write WHEN to use, not WHAT it does.** A description that summarizes the
  internal workflow ("reviews code in two passes") triggers worse than one that
  lists situations ("review this PR, check my code before commit").
- **The listing is `description` + `when_to_use`.** The `Triggers:` list *is* the
  when-to-use expressed as the phrases a user actually types — keep casting that
  net wide. **New skills put it in `when_to_use`; existing skills migrate lazily**
  (whenever next touched). A migration must be a **pure move**: triggers go to
  `when_to_use`, the **boundary/delegation instructions STAY in `description`**
  (they're what steers haiku routing — EVALS.md). The catalog builder concatenates
  both fields — check with `node scripts/build-plugins.mjs` + `git diff
  catalog.json` that content is unchanged (a trailing boundary reorders ahead of
  the triggers; that's fine). No re-baseline needed.
- **~350 chars** combined listing target (hard caps: `description` 1024, combined
  1536 — the builder errors above either). Over the listing budget, the
  *least-invoked* skills' descriptions drop silently — `/doctor` reports it. See
  AUTHORING.md "Listing Budget".
- **Anti-pattern:** describing mechanics/steps instead of triggering situations.

## Structure and budget (brief — see AUTHORING.md for detail)

- Frontmatter: `name`, `description`, `when_to_use`, `allowed-tools` — do NOT
  set `model` (inline pins are ignored at runtime; on forked skills they
  override the user's model choice and quota bucket — see AUTHORING.md
  "Frontmatter Fields"). Newer fields where they fit:
  `context: fork` + `agent` (heavy report-producing skills — must write the full
  report to a file and put anything needing user input in an "Open questions"
  section, since a fork returns only a summary and can't ask the user),
  `paths` (file-scoped), `disable-model-invocation` (deliberate-only workflows),
  `effort`. Dynamic `` !`cmd` `` injection: cheap `--stat`-style commands only,
  `|| true` failure-tolerant — see AUTHORING.md's injection rules.
- Progressive disclosure: keep SKILL.md tight (aim < 300 lines); push deep
  domain knowledge to `references/`, output formats to `templates/`. On
  compaction only a skill's first ~5k tokens are re-attached — front-load the
  Iron Law and workflow; write standing instructions, not one-time steps.
- Exactly **3 evals** (happy path / edge case / scope boundary) with specific,
  verifiable assertions. For hardened skills, add an optional `pressure` eval
  (see `verification-before-completion` and the safety-critical skills for the
  pattern).
- Register new skills in `skill-router` so they're discoverable.

## When to harden vs. keep open-field

Apply rigor where mistakes are expensive; keep freedom where judgment matters.

- **Harden** (Iron Law + rationalization table + red flags): fragile, safety-
  critical workflows — tests, migrations, deploys, security, incidents.
- **Keep open-field** (explanatory, flexible): creative/advisory work —
  architecture exploration, UX, estimation, proposals. Rigidity there produces
  worse outcomes, not better ones.

## Retiring skills (obsolescence review)

As base models improve, a skill can become pure overhead. Once per release cycle
— or on a major base-model update — re-run the skill's 3 evals RED on shipping
models via `evals/workflow-runner.mjs`; re-sample ×3 on borderline scores and
read the judge journal before calling a result variance (a "flaky" case is often
a real content gap the skill causes). If RED ≈ GREEN across all 3 evals (0/0
tool-dependent assertion pairs don't count), **slim first** — cut what the model
does unaided; keep the Iron Law, boundaries, and cross-skill references — then
re-run GREEN (gate: GREEN ≥ RED per case). Retire only after a slimmed skill
stays RED ≈ GREEN a full cycle later, with a deprecation notice in
CHANGELOG/ROLES.md first (removal is user-visible to role and plugin consumers).
Full policy: docs/AUTHORING.md § Obsolescence review.

## See also

- docs/AUTHORING.md — the canonical rules and common mistakes.
- [references/pressure-testing.md](references/pressure-testing.md) — running baseline scenarios and the pressure levers.
- `docs/EVALS.md` — the automated RED/GREEN harness that replays evals through subagents and gates regressions in CI.
- `verification-before-completion` — the discipline that proves a skill change works (run the eval, read the result).
