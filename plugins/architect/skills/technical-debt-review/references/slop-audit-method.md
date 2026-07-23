# AI-Slop Audit — Method & Tooling

How to run a repo-wide AI-slop audit so its findings are *credible*, not vibes. Two
things separate a trustworthy audit from a plausible-looking one: **static tooling that
measures** (so duplication and dead-code claims are counts, not impressions) and
**per-finding verification** (so every claim has evidence and survives a disproving
attempt). Pair this with the pattern taxonomy in
`code-slop-cleanup/references/slop-patterns.md` (per-category tells + when-it's-NOT-slop).

## The passes

Run in order; each narrows where to read closely.

1. **Map** — languages, packages, entry points, build/test/lint config. Establishes what
   gates the repo *claims* to enforce (see "Gates" below).
2. **Churn** — history is the best slop divining rod. High-churn files and
   large multi-file commits revised within days ("landed then immediately patched") are
   where AI slop concentrates.
3. **Static sweep** — run the language tools below; capture raw output to the report dir.
4. **Read the hotspots** — the intersection of high churn + tool hits + large units. Don't
   read everything; read where the signals converge.
5. **Verify every load-bearing claim** — grep/`diff`/trace before writing it down.

## Tooling by language

Run what the repo's stack supports; record the exact command and its observed output in
the method log. If a tool isn't available, say so — never fabricate its result.

| Concern | JS/TS | Python | Language-agnostic |
|---------|-------|--------|-------------------|
| **Duplication** (the #1 fingerprint) | `jscpd --min-tokens 60 --reporters json` | `pylint --enable=duplicate-code --min-similarity-lines=6` | `jscpd` supports many langs |
| **Dead code / unused exports** | `knip`, `ts-prune` | `vulture --min-confidence 60` | grep importers per symbol |
| **Unused / phantom deps** | `depcheck`, `knip` | `deptry .` | check manifest vs imports |
| **Type gate** | `tsc --noEmit` | `mypy` (respect the repo's `strict`) | is it declared and does it pass? |
| **Lint gate** | `eslint .` | `ruff check` | run with the repo's config |
| **Complexity / size** | `eslint` complexity rules | `ruff` / `radon cc` | `wc -l`, function-length scan |

**Churn commands (any repo):**
- Hotspots: `git log --name-only --pretty=format: | sort | uniq -c | sort -rn | head`
- "Landed then churned": cross-reference recent large commits against files touched again
  within days.
- Where a symbol/string came from: `git log -S'<token>' --oneline`.

## Reading tool output honestly

- **jscpd's %** is a floor, not a ceiling — token-based clone detection misses
  semantically-identical-but-textually-different copies. If you *didn't* run it, say the
  duplication figure is a manual floor.
- **knip / vulture / ts-prune have false positives** on dynamic references, DI,
  decorator-registered symbols (`@click`, `@mcp.tool()`, route tables), re-exports, and
  type-only usage. **Re-verify every flagged symbol by repo-wide grep** before calling it
  dead — the tool is a candidate generator, not the verdict.
- **A declared strict gate sitting on N errors is a finding**, not a passing gate:
  `mypy strict = true` with 45 errors means the gate rotted and stopped catching the
  `any`-casts and stale `type: ignore`s it was meant to catch.

## Verification rules (every finding)

- **Evidence or it didn't happen** — cite `path:line-range`, quote minimally.
- **Attempt to disprove before flagging** — trace callers (incl. dynamic/string/DI/reflection/
  external consumers) before "dead"; check history before "unread"; confirm a duplication is
  the same *concept*, not just textually similar (false DRY is worse than repetition).
- **Prove byte-identity with `diff`**, don't eyeball it, when claiming "duplicated verbatim".
- **Confidence, not assertion** — unverifiable usage claims get Confidence: Low with "what
  would confirm this" stated, never asserted as fact.
- **Record what you didn't flag** and **log blind spots** (tools that couldn't run,
  unreadable/generated files, platform paths not exercisable here).

## If delegating to sub-audits

Parallel adversarial sub-audits (source-duplication, tests, docs) scale coverage, but the
main thread must **independently re-verify every load-bearing claim** and correct the
sub-audit where it overreached (e.g. a "diverging enum" that's actually retired-verdict
prose). A forked sub-audit's unverified claim is unfalsifiable downstream — treat sub-audit
output as candidates, not conclusions.
