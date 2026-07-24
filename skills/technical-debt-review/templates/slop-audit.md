# Codebase Slop Audit — [repo]

**Repository:** [name / path]
**Stack:** [languages, frameworks, package layout]
**Scope:** [what's in — dirs/packages; what's excluded — dist/, vendored, generated]
**Date:** [DATE] · **Branch:** [branch] · **Method:** [tools + passes; see method log]

> Write this report to a gitignored location (e.g. `.local/slop-audit-<date>.md`). The
> audit is read-only — no working-tree file is modified.

---

## 1. Executive summary

[3–5 sentences. Honest overall level — is this above or below the AI-slop baseline? Name
the 2–3 dominant systemic patterns and where they concentrate. State the top 3 to fix
first. Don't inflate: a disciplined codebase with concentrated debt should be described as
such, and "explicitly not slop" findings prove the audit was discerning.]

**Overall slop level:** [low / moderate-concentrated / high] — [one clause on remediability]

---

## 2. Scorecard

One row per category. Count = findings raised; worst severity across them; one-line note.

| # | Category | Count | Worst severity | Note |
|---|----------|-------|----------------|------|
| 1 | Duplication & near-duplication | | | |
| 2 | Premature abstraction / over-engineering | | | |
| 3 | Dead & unreachable code | | | |
| 4 | Defensive theater | | | |
| 5 | Verbose / inflated implementations | | | |
| 6 | Comment / docstring slop | | | |
| 7 | Naming / organization slop | | | |
| 8 | Type slop | | | |
| 9 | Error-handling slop | | | |
| 10 | Test slop / gaps | | | |
| 11 | Dependency slop | | | |
| 12 | Structural / architectural slop | | | |
| 13 | Config & scaffolding slop | | | |
| 14 | Documentation drift | | | |

**Totals by severity:** Critical [n] · High [n] · Medium [n] · Low [n]
**Totals by effort:** S [n] · M [n] · L [n]

---

## 3. Systemic patterns (fix once, at the source)

The most valuable section. Each root cause is the *parent* of many §4 findings — fixing
the pattern retires the children. Give each a stable ID and name the children.

- **P1 — [root cause].** [What it is, how many findings it generates, the fix-at-source.]
- **P2 — [root cause].** …
- **P3 — [root cause].** …

---

## 4. Findings

Grouped by severity, then category. IDs are stable (`SLOP-NNN`). Every finding:

**SLOP-001 · [category] · `path:line-range`**
- **Evidence:** [minimal quote / the tool output / the `diff` proving identity]
- **Why it's slop here:** [why *this instance* is unjustified — what it costs, why the
  pattern lacks a reason that survives scrutiny. "I'd do it differently" is not a finding.]
- **Recommended fix:** [the change; note if it's a `refactoring` / `code-slop-cleanup` job]
- **Severity:** [Critical/High/Medium/Low] · **Confidence:** [High/Med/Low — if Low, what
  would confirm it] · **Effort:** [S/M/L] · **Risk of fix:** [none/low/med/high] ·
  **Dependencies:** [other SLOP IDs, or none] · **Parent:** [Pn, if any]

[Repeat, CRITICAL/HIGH first.]

---

## 5. Remediation plan

### Quick wins — ship immediately (S effort, low/no risk)
- [Subtraction/rename/dead-code deletions and correctness one-liners, with SLOP IDs]

### Structural work — batched by theme
- **Theme A ([root]):** [ordered SLOP IDs; note the sequence dependency]
- **Theme B …**

### Suggested sequence
- **Phase 1:** [items] — *Verify:* [command that must stay green]
- **Phase 2:** [items] — *Verify:* …

---

## 6. Explicitly NOT slop (considered and deliberately not flagged)

Items examined and judged justified — proves the audit was discerning and stops the team
re-litigating. [e.g. "two storage adapters — intentional, parity-tested; only their
duplicated internals are flagged"; "parameterless catches — deliberate best-effort
degradation, reason commented".]

---

## 7. Method log

- **Scope covered:** [dirs/packages read in full vs sampled]
- **Tools run (command → outcome):** [`jscpd … → 13% / 217 clones`, `mypy → 45 errors`,
  `knip → …` — with observed output; "not available" if a tool couldn't run, never fabricated]
- **Verification:** [what was grep-/`diff`-confirmed; sub-audit claims re-checked]
- **Blind spots:** [unreadable/generated files, platform paths not exercisable, tools not
  run — so the reader knows the audit's edges]

---

## 8. Open questions

[Judgment calls needing user input — which subsystem matters most, unknown team pain,
whether a "speculative" module has a near-term consumer. Never guessed silently.]
