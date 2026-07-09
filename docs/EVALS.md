# Evaluating Skills

Each skill ships with `evals/evals.json`. Evals are run by replaying their
prompts and judging the result against the assertions — by hand, or via the
automated harness ([below](#automated-harness-tdd-for-the-skill-set)), whose
grader is a skeptical LLM-as-judge rather than a deterministic checker. This doc
describes the schema and a repeatable way to run them.

## Schema

```json
{
  "skill_name": "tdd-workflow",
  "evals": [
    {
      "id": 1,
      "prompt": "A realistic user request",
      "expected_output": "Prose description of what good looks like",
      "assertions": ["Specific, verifiable criteria", "..."]
    }
  ],
  "pressure_tests": [
    {
      "id": 1,
      "prompt": "A request that tempts the agent to skip the discipline",
      "pressure": ["time", "sunk_cost", "authority", "exhaustion"],
      "expected_behavior": "How the skill should hold under that pressure",
      "assertions": ["Does NOT capitulate to ...", "Insists on ..."]
    }
  ]
}
```

- **`evals`** (required, exactly 3): happy path, edge case, scope boundary.
  These check that the workflow runs, handles a corner, and knows its
  boundaries.
- **`pressure_tests`** (optional): present on hardened/safety-critical and
  discipline skills. Each tempts the agent to rationalize past the skill's Iron
  Law under one or more `pressure` levers, and asserts that it doesn't. See
  `skills/writing-skills/references/pressure-testing.md` for the levers and the
  baseline → counter loop.

## Running evals via a subagent

Replaying through a *fresh* subagent avoids the current session's context
nudging the result toward compliance.

1. Install the skill (`node install.mjs <skill>`).
2. For each entry, dispatch a fresh subagent with the `prompt` and let the skill
   trigger naturally (don't paste the SKILL.md — you're testing triggering too).
3. Capture the transcript.
4. Grade against `assertions`: each is a yes/no. Note any miss and the verbatim
   wording, which is the raw material for a new rationalization-table row.
5. For `pressure_tests`, confirm the agent holds the Iron Law. A miss here is a
   hardening gap — feed it back through `writing-skills` (RED → GREEN → REFACTOR).

## Grading guidance

- Assertions are binary and specific by design — "Asks at least 3 clarifying
  questions", not "produces a good plan". If an assertion is fuzzy, tighten it.
- A skill passes an eval when all its assertions hold. Track misses; they are
  the backlog for the next authoring pass.
- Re-run after any SKILL.md change to the affected skill (this is the
  `verification-before-completion` discipline applied to the skills themselves).

## Automated harness (TDD for the skill set)

Two runners turn the loop above into something repeatable:

| Runner | Use | Needs |
|---|---|---|
| `evals/workflow-runner.mjs` | Fast local RED/GREEN loop, on demand | Claude Code Workflow tool |
| `evals/run.py` | CI regression gate, scriptable | `ANTHROPIC_API_KEY` + `pip install -r evals/requirements.txt` |

Both **generate** a candidate reply (with the skill loaded = GREEN; without =
RED) and **judge** it with a skeptical LLM-as-judge using structured output
(per-assertion pass/fail). `run.py` adds majority-of-`k` voting, a stored
`baseline.json`, and a non-zero exit when a previously-green assertion
regresses. The GitHub Actions workflow (`.github/workflows/skill-evals.yml`)
runs it on PRs that touch `skills/`.

```bash
python evals/run.py --all --update-baseline      # record the golden baseline
python evals/run.py --changed --base origin/main # CI: only changed skills
python evals/run.py --skills tdd-workflow -k 3    # one skill, 3 votes
```

### Why the gate is regression-vs-baseline, not an absolute threshold

We gate on **GREEN drift vs. the baseline**, never on an absolute pass rate, and
we track RED for delta only (base-model behavior varies, so gating on it is
flaky). Two findings from running this make the choice necessary:

1. **Some assertions can't be satisfied by a single tool-less reply.** The
   generators are told to output only a reply (no tool use), so assertions like
   "runs the proving command in this session" or "keeps a timestamped action
   log" fail even when the skill is working — the behavior spans a session, not
   one message. In a real run these depressed `verification-before-completion`
   and `incident-response` GREEN scores well below a manual read. Fix going
   forward: phrase assertions so they're satisfiable by the artifact under test
   (e.g. "identifies *which* command would prove it" rather than "runs it"), or
   let the generator use tools for verify-type skills.
2. **The judge is deliberately harsher than a human eyeball.** Absolute scores
   are therefore not comparable across skills; *movement* is the signal.

The useful, stable signal is: **GREEN ≥ RED on every skill** (the skill never
hurts), and **GREEN doesn't drop between commits** (no regression). That's what
the gate enforces.

## Activation evaluation (routing) — implemented

The harness above force-loads a skill before generating GREEN, so it deliberately
**bypasses activation**: it answers *"if this skill runs, does it help?"* — not
*"does the right skill run?"* Under the name-only baseline + orchestrator model
(see [ROLES.md](ROLES.md)), the second question is the critical path: a name-only
skill only delivers its proven lift if `skill-router` routes to it. In short:

> **realized quality = routing accuracy × (GREEN − RED gap)**

`run.py` measures the gap; the **routing harness** measures the routing factor.

### Two runners (mirror the content-quality split)

| Runner | Layer | Use | Needs |
|---|---|---|---|
| `evals/routing.py` | 2 | CI regression gate, scriptable | `ANTHROPIC_API_KEY` + `pip install -r evals/requirements.txt` |
| `evals/routing-runner.mjs` | 2 + 3 | Fast in-session run on haiku, RED/GREEN loop | Claude Code Workflow tool (no key) |

Both route on **haiku** (`claude-haiku-4-5` — `skill-router`'s shipping model).
The three layers from the original design:

1. **Plumbing** — covered by `node scripts/verify.mjs` (offline: the hook writes the
   right `skillOverrides`, `/role` promotes/resets, the catalog is complete).
   Kept separate from this model-in-the-loop harness.
2. **Routing accuracy (layer 2, the core).** Isolate the decision: give the model
   the catalog + a prompt using the router's own routing prompt, force a
   structured `{ chosen_skill | NONE }`, grade by accept-set membership. Fast,
   cheap, and it directly tunes the catalog + router prompt.
3. **End-to-end activation (layer 3, behavioral, fewer cases).** A haiku subagent
   is told it has a `Skill(name)` tool and decides whether to **invoke** a skill
   or answer directly — catching what layer 2 can't: does the orchestrator fire,
   does it *invoke* vs merely *name* a skill, does it over-route on trivial
   prompts. (`routing-runner.mjs` does this in-session; the fully-isolated
   "auto-fire under the installed baseline" variant is harness-bound, so it stays
   a manual check rather than a CI gate.)

### Dataset — mined from the existing evals

`routing.py --build-dataset` writes `evals/routing-dataset.json` (GENERATED,
committed, drift-checked via `--check-dataset` like `catalog.json`). Today: **64
positive + 52 boundary + 8 trivial = 124 cases**. It stays in sync — every new
skill's 3 evals yield 2 new routing cases.

- **Happy-path** prompt (eval #1) → positive: `accept = {that skill}`.
- **Scope-boundary** prompt (eval #3) → boundary: `accept = {home} ∪ {siblings
  named in its expected_output} ∪ {NONE}`.
- A small curated **trivial/conversational** set (`evals/routing-trivial.json`,
  the only hand-authored cases) → `accept = {NONE}`, guarding against over-routing.

### Accept-set grading (why, not single-expected)

The design note assumed eval #3 is pre-labeled redirect gold ("hands off to X").
A scan showed that's only partly true: of 29 scope-boundary evals, 14 name another
skill, **but** some of those (`code-reviewing`, `gitops-delivery`) are genuinely
*in-scope*, not redirects; 5 use decline language with no named skill; 10 are
same-scope edge cases. A single-expected label would be **wrong on ~15/29**. So
each case carries an **accept set** and passes iff `chosen ∈ accept`:

- positive → `{home}` measures **top-1 accuracy**;
- boundary → `{home} ∪ {siblings} ∪ {NONE}` measures **"no wild misroute"** (fails
  only on an unrelated third skill — robust to the heterogeneity, zero hand-labeling);
- trivial → `{NONE}` measures **false-activation rate**.

### Metrics & gate

Top-1 routing accuracy (per-skill + aggregate), false-activation rate on trivial,
**confusion pairs** (home → wrong choice — names the descriptions to disambiguate),
and router-invocation rate (layer 3). **Gate = regression-vs-baseline**
(`evals/routing-baseline.json`), identical to `run.py`: a case that routed
correctly in the baseline must not now misroute. Never an absolute threshold.

### Usage

```bash
python evals/routing.py --build-dataset          # mine → routing-dataset.json
python evals/routing.py --check-dataset          # CI: fail if dataset is stale (offline)

export ANTHROPIC_API_KEY=...
python evals/routing.py --run                     # route all 124 cases on haiku
python evals/routing.py --run -k 3                # majority-of-3 per case
python evals/routing.py --run --changed --base origin/main   # CI: changed skills only
python evals/routing.py --run --update-baseline   # record routing-baseline.json
```

In-session, no key (also runs layer 3) — via the Workflow tool:

```
Workflow({ scriptPath: "evals/routing-runner.mjs", args: {
  dataset: "<abs>/evals/routing-dataset.json", catalog: "<abs>/catalog.json" }})
```

CI: `.github/workflows/routing-evals.yml` runs `--check-dataset` (offline) then
`--run --changed -k 3` on PRs touching `skills/`, `catalog.json`, or
`evals/routing*`, gating on regression vs the baseline (skipped, not failed, when
the API key is absent — like `skill-evals.yml`).

### Results (haiku) and the haiku recommendation

Full in-session run on `claude-haiku-4-5` over all 124 cases (2026-07,
65-skill catalog):

| Layer 2 metric | Result |
|---|---|
| Top-1 routing accuracy (positives) | **64/64 = 1.00** |
| Boundary pass rate ("no wild misroute") | **52/52 = 1.00** |
| False-activation rate (trivial → NONE) | **0/8 = 0.00** |
| Confusion pairs | **none — zero misroutes** |

Layer 3 (behavioral, 16 cases): router-invocation rate **1.00** (8/8 substantial
prompts invoked a skill), correct-invoke 8/8, over-route **0/8**. Boundary
behavior stayed nuanced and correct — the data-science boundaries held in
both directions (`ml-pipeline-design`'s reporting-notebook boundary →
`notebook-to-production`, `notebook-to-production`'s training-notebook boundary
→ `ml-pipeline-design`, `statistical-analysis`'s chatbot-A/B boundary →
`ai-evaluation`), alongside the established ones (`rollback-strategy` →
`incident-response`, `incident-response`/`refactoring`/`strategic-review`
boundaries → `NONE`).

(`routing-baseline.json` still records an earlier keyed run; cases added since
can't regress in CI until the next
`python evals/routing.py --run --update-baseline -k 3` refresh, so the
in-session full run above is the interim reference. An earlier, smaller-catalog
baseline run scored the same clean sweep on layer 2 with a 0.75 layer-3
invocation rate.)

**Haiku recommendation: keep haiku.** A clean sweep of layer 2 — perfect top-1,
perfect boundary discrimination, zero false activations, zero confusion — now
across the full 65-skill catalog says haiku is more than adequate for this
routing task; nothing argues for sonnet. The earlier watch-item (layer-3
invocation rate 0.75 on the earlier, smaller catalog) cleared at 8/8 in this
run — worth re-checking as the catalog grows. If misroutes ever appear, the
first lever is **improving catalog descriptions** (which helps both models and
the pinned/role-promoted auto-trigger path); promoting the router to sonnet is
the fallback only if descriptions don't close the gap.

### TDD loop for routing (RED → GREEN)

A misroute is a RED. The fix is almost always a **catalog description** edit
(disambiguate keywords / when-to-use) — edit the skill's `SKILL.md` frontmatter,
`node scripts/build-plugins.mjs` to regenerate `catalog.json`, then re-run the
routing eval until GREEN. This is the `writing-skills` baseline→counter loop with
routing accuracy as the metric; descriptions are the shared tuning surface for both
routing (the catalog) and direct auto-trigger, so one improvement pays twice.

The current suite has **zero natural misroutes** (41/41, 28/28, 0 confusion), so
there is no live RED to fix. Exercising the loop synthetically (degrade one skill's
`description`, regenerate the catalog, re-run that case) surfaced a finding worth
recording:

> **On haiku, the skill _name_ dominates routing; a muddy or even self-contradictory
> description does not cause a misroute.** Routing `data-modeling`'s e-commerce-schema
> prompt held at `data-modeling` when its description was blanked to "housekeeping",
> when it was made to describe CSS work, and even when a sibling (`api-design`) was
> rewritten to over-claim the entire schema/data-model vocabulary. The route only
> flipped (`data-modeling` → `api-design`, RED) when the description carried an
> **explicit instruction** — "this skill does NOT handle schemas; use api-design
> instead." Restoring the real description returned it to GREEN.

Two takeaways: (1) the harness detects the regression and the catalog/eval pipeline
round-trips cleanly (RED → GREEN via a `SKILL.md` edit + `build-plugins.mjs`), which
is what the CI gate enforces against `routing-baseline.json`; and (2) the design
note's "the fix is almost always a catalog-description edit" holds for *clear-named*
skills only weakly — keyword tweaks barely move haiku, whereas **explicit
when-to-use / when-NOT-to-use instructions in the description are the lever that
actually steers it**. Descriptions still matter more for the pinned/auto-trigger
path and for genuinely ambiguous-named skills; for routing on haiku, prefer
instruction-style disambiguation over keyword stuffing.
