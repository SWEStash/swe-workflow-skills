---
name: writing-skills
description: "Use when authoring, editing, or reviewing a skill in this library — a new SKILL.md, one that under-triggers, or hardening an existing one. Covers description and listing-budget rules, frontmatter, progressive disclosure, the 3-eval rule, and pressure-testing against rationalizations. Triggers: write a skill, new skill, edit a skill, skill isn't triggering."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Writing Skills

Author and maintain skills for this library. The canonical rule set lives in the
README's "Building Skills" section — read it for descriptions, listing budget,
frontmatter, and common mistakes. This skill adds the parts that must be
*applied*, not just read: how to reproduce a skill's failure before fixing it,
how to write a description that actually triggers, and how to pressure-test.

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
- **Our format is a compliant hybrid:** `<when/purpose>. Triggers: <keywords>. <boundary>`.
  The `Triggers:` list *is* the when-to-use expressed as the phrases a user
  actually types — keep casting that net wide.
- **~350 chars** (listing-budget constraint; hard cap 1024). Longer descriptions
  get silently dropped at scale — `/doctor` reports it. See README "Listing Budget".
- **Anti-pattern:** describing mechanics/steps instead of triggering situations.

## Structure and budget (brief — see README for detail)

- Frontmatter: `name`, `description`, `model` (haiku/sonnet/opus by reasoning
  need), `allowed-tools`.
- Progressive disclosure: keep SKILL.md tight (aim < 300 lines); push deep
  domain knowledge to `references/`, output formats to `templates/`.
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

## See also

- README "Building Skills" — the canonical rules and common mistakes.
- [references/pressure-testing.md](references/pressure-testing.md) — running baseline scenarios and the pressure levers.
- `EVALS.md` (repo root) — the automated RED/GREEN harness that replays evals through subagents and gates regressions in CI.
- `verification-before-completion` — the discipline that proves a skill change works (run the eval, read the result).
