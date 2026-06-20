# Full pre-public / pre-milestone project review — prompt template

A generalized, reusable version of a founder-grade "should we go public?" review.
It orchestrates both review lenses — `strategic-review` (vision, positioning,
market) and `project-review` (scope, roadmap, implementation, evidence) — into a
single interactive decision instrument.

**How to use:** fill the placeholders below and paste as the task prompt, or hand
the filled brief to the skill router. Delete any section that doesn't apply to the
project (e.g. a solo library has no separate validation harness — fold "evidence"
into tests/coverage/changelog).

---

## Parameters

| Placeholder | Meaning | Example |
|---|---|---|
| `{{project_name}}` | What's under review | "Acme Toolkit" |
| `{{repos}}` | Repos/dirs in scope (strategy + implementation + validation) | `../core`, `../spec`, `../validation` |
| `{{strategy_docs}}` | Where vision/scope/roadmap/ADRs live | `docs/vision.md`, `ROADMAP.md` |
| `{{evidence_sources}}` | Tests, coverage, validation results, benchmarks, changelog | `validation/reports/`, `CHANGELOG.md` |
| `{{market_bands}}` | Known competitor bands to refresh + where to hunt for new entrants | "LLMOps, platform-native, prompt vaults" |
| `{{decision_question}}` | The actual decision this informs | "Go public now, later, or repositioned?" |
| `{{deliverable_path}}` | Gitignored output location | `.local/{{project_name}}-review-<date>.html` |
| `{{stance}}` | `options+recommendation` (default) \| `options-only` \| `go/no-go` | `options+recommendation` |
| `{{as_of_date}}` | Date stamp for market findings | `2026-06-20` |

---

## The prompt

> Review the current state of **{{project_name}}** ahead of this decision:
> **{{decision_question}}**. The repos in scope are {{repos}}; the strategy/vision
> material is in {{strategy_docs}}; the evidence it works is in {{evidence_sources}}.
>
> Produce a single, blunt, maximally honest decision instrument. Foreground the most
> uncomfortable finding rather than burying it. Do the following:
>
> 1. **Vision, scope, positioning** (`strategic-review`) — state the thesis in one
>    sentence and name its load-bearing assumption; critique the value proposition and
>    scope; assess where positioning is strong vs. where it leans on unproven assumptions.
> 2. **Implementation vs. roadmap / execution plan** (`project-review`) — map
>    implementation maturity (production-ready vs stub/deferred, by named path);
>    reconcile against the roadmap; surface scope drift and the gap between "built"
>    and "validated".
> 3. **Evidence / validation review** (`project-review`) — read the *actual* numbers
>    in {{evidence_sources}}; report negative or inconclusive results honestly; state
>    the built-vs-validated gap and what evidence would close it.
> 4. **Market research, live, as of {{as_of_date}}** (`strategic-review` →
>    `deep-research`) — refresh {{market_bands}} and hunt for new entrants and adjacent
>    standards; assess platform-absorption / wedge-closure risk; tag each comparable
>    as competitor / complement / integration target. Date-bound every finding and
>    label confirmed vs. inferred.
> 5. **Synthesis** — potential; ranked weak points (lead with the assumption most
>    likely to be false); prioritized, severity-tagged suggestions; and **strategic
>    forks with trade-offs**. Decision stance: **{{stance}}**.
>
> **Deliverable:** one self-contained interactive HTML file at `{{deliverable_path}}`
> (render via `artifact-design`): inline CSS/JS, no external runtime (opens offline),
> sticky section nav, collapsible subsections, a sortable/filterable findings table,
> severity tags, and a strategic-forks comparison panel. Dark, dense, dashboard-style
> — an analyst tool, not marketing. **No git changes** — write only to the gitignored
> path. Every claim cites its source (file path, command output, or dated URL).

---

## Non-negotiables (what the original brief left implicit — bake these in)

- **Cite or label.** Every claim is confirmed (with a source) or inferred (say so).
- **Date-bound the market.** Tag findings "as of {{as_of_date}}"; the landscape moves.
- **Negative evidence is the headline, not a footnote.** If validation is weak,
  lead with it.
- **No verdict creep.** Honor `{{stance}}`. Default presents forks *and* a
  recommendation; never silently collapse to a single forced verdict unless asked.
- **Stay out of git.** Gitignored output only; confirm with `git status` / `git
  check-ignore` after writing.

## Verification checklist

1. File exists at `{{deliverable_path}}` and is git-ignored (`git check-ignore` returns it; `git status` is clean).
2. Opens offline — no external fetches; nav, collapsibles, and the findings table all work; no console errors.
3. Spot-check 3–4 cited numbers against their source files.
4. Synthesis honors `{{stance}}` (e.g. forks-with-recommendation, not a smuggled go/no-go).
