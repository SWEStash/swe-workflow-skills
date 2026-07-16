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

Full run on `claude-haiku-4-5` over all 124 cases (2026-07, 65-skill catalog) —
this is the committed CI baseline (`evals/routing-baseline.json`), recorded at
**k=1** (one sample per case):

| Layer 2 metric | Result (k=1) |
|---|---|
| Top-1 routing accuracy (positives) | **64/64 = 1.00** |
| Boundary pass rate ("no wild misroute") | **52/52 = 1.00** |
| False-activation rate (trivial → NONE) | **0/8 = 0.00** |
| Confusion pairs | **none** |

Layer 3 (behavioral, 16 cases): router-invocation rate **1.00** (8/8 substantial
prompts invoked a skill), correct-invoke 8/8, over-route **0/8**.

A single-draw 124/124 invites the obvious question — *is the dataset just crafted
to pass?* Two checks say the result is real but should be stated precisely, not as
"124 perfect".

**What the numbers actually establish.** Positive accept-sets are strict
single-skill (`{home}`, top-1 exact), so 64/64 there is a genuine signal — and
only 13/64 positive prompts even contain the skill's name as a phrase; the rest
force intent inference from a scenario. The boundary sweep was *not* won on the
`NONE` escape hatch: of 52 boundary cases only 4 routed to `NONE`; 18 hit home and
30 chose a legitimate sibling — i.e. the router made real discriminations against a
~60-skill wrong-answer space.

**Stability at k=3.** Re-running every case with **3 independent haiku samples +
majority vote** (2026-07, via the in-session runner) reproduces the sweep —
positive 64/64, boundary 52/52, false-activation 0/8, **0 majority failures** — so
k=1 was not a lucky draw. The finer signal is *unanimity*: **120/124 cases were
unanimous** across the three samples, including all 64 positives and all 8
trivials. The only wobble was **4/52 boundary cases**, and every split resolved
*inside* the accept-set:

| Boundary case | 3 votes | Majority |
|---|---|---|
| `architecture-documentation` | architecture-design ×2, architecture-documentation | architecture-design ✓ |
| `gitops-delivery` | NONE ×2, gitops-delivery | NONE ✓ |
| `test-suite-design` | NONE ×2, test-suite-design | NONE ✓ |
| `project-review` | code-reviewing, bug-investigating, NONE | code-reviewing ✓ |

The last is the honest edge: three identical prompts produced *three different*
answers, all in-accept — the router has no stable opinion there and the accept-set
absorbs the coin-flip. That is the design working as intended (boundary measures
"no wild misroute," not a single gold answer), but it means **boundary 1.00 is a
soft claim**: ~8% of boundary prompts are genuinely ambiguous within their
accept-set. The defensible summary is therefore:

> **Positive top-1 routing is stable and correct (64/64, unanimous over 3 samples);
> trivial rejection is stable (8/8, unanimous NONE); boundary prompts never wildly
> misroute but are genuinely ambiguous in ~8% of cases.**

**Known limitations (what the sweep does *not* prove).** Coverage is one positive
+ one boundary prompt per skill, all mined from each skill's own `evals.json` and
written by the same hand as the descriptions — so this measures routing on
author-anticipated phrasings, not held-out or adversarial ones (a mild
teaching-to-the-test risk), and a skill can ace its single prompt yet misroute on
paraphrases. Boundary accept-sets include `NONE` by construction. Closing these
was a tracked follow-up — **now done**: an independent held-out / paraphrase
prompt set, not mined from the skills' own evals, graded with the same accept-set
logic. See [Held-out generalization probe](#held-out-generalization-probe-independent)
below.

Data-science boundaries held in both directions (`ml-pipeline-design` ↔
`notebook-to-production`, `statistical-analysis`'s chatbot-A/B → `ai-evaluation`),
alongside the established ones (`rollback-strategy` → `incident-response`;
`incident-response` / `refactoring` / `strategic-review` boundaries → `NONE`).

(`routing-baseline.json` records the **k=1** full 124-case run — refreshed 2026-07
via the in-session runner — so every case gates in CI; the k=3 pass above is a
stability probe, not the committed gate. An earlier, smaller-catalog baseline
scored the same layer-2 sweep but only a 0.75 layer-3 invocation rate; this run
clears layer 3 at 8/8.)

**Haiku recommendation: keep haiku.** Stable top-1 accuracy, no wild misroutes,
and zero false activations across the full 65-skill catalog — reproduced at k=3 —
say haiku is more than adequate for this routing task; nothing argues for sonnet.
The earlier watch-item (layer-3 invocation rate 0.75 on the earlier, smaller
catalog) cleared at 8/8 in this run — worth re-checking as the catalog grows. If
misroutes ever appear, the first lever is **improving catalog descriptions**
(which helps both models and the pinned/role-promoted auto-trigger path);
promoting the router to sonnet is the fallback only if descriptions don't close
the gap.

### Held-out generalization probe (independent)

The mined sweep above measures routing on *author-anticipated* phrasings. To close
the teaching-to-the-test gap, `evals/routing-heldout.json` is a **separate,
hand-authored 150-case set** written **without** copying phrasing from any skill's
`evals.json` and deliberately **avoiding each skill's own `Triggers:` keywords**
(0/92 paraphrases contain an own-trigger phrase). Same `{ id, kind, skill, prompt,
accept[] }` shape; the authoring category is encoded in the `id` prefix:

- **92 paraphrase positives** — every routable skill restated in a foreign
  register, `accept = {home}` (strict top-1);
- **24 confusables** across 6 adjacent clusters (`data-modeling`↔`api-design`;
  `ml-pipeline-design`↔`data-pipeline-design`↔`notebook-to-production`;
  `security-audit`↔`threat-modeling`↔`compliance-privacy`;
  `bug-investigating`↔`code-reviewing`↔`project-review`;
  `incident-response`↔`rollback-strategy`↔`resilience-engineering`;
  `brainstorming`↔`prd-writing`↔`feature-planning`) — single-gold where decidable,
  5 two-skill boundary accepts where genuinely ambiguous;
- **18 scope/negation traps** — name a skill's keywords but route elsewhere/`NONE`;
- **16 harder trivials** — conversational/factual prompts carrying domain keywords
  → `NONE` (double the mined set's 8, pushing harder on false activation).

Run key-free via the Workflow tool at k=3 (majority of 3 independent haiku
samples), the in-session sibling of the mined runner:

```
Workflow({ scriptPath: "evals/routing-heldout-runner.mjs", args: {
  dataset: "<abs>/evals/routing-heldout.json", catalog: "<abs>/catalog.json" }})
```

**Result (`claude-haiku-4-5`, k=3, 2026-07 — 451 route agents, 0 errors):** a
perfect, fully-stable sweep — paraphrase **92/92**, confusable **24/24** (all 6
clusters cleanly separated, **zero confusion pairs**), trap **18/18**, trivial
**16/16**, false-activation **0/21**, and **150/150 unanimous** across the three
samples (0 split, 0 failures). The 5 genuinely-ambiguous boundary cases each landed
unanimously on the *intended primary* — stronger than the mined k=3 pass, where 4
boundary cases split inside their accept-set. So the mined suite's 64/64 is **not**
an artifact of author-shared phrasing: routing survives when keywords are stripped
and the wording is foreign. Honest limits: still a single-evaluator set with
pre-decided golds and only 1–2 paraphrases per skill — it *lowers*, not eliminates,
the generalization risk. Full write-up: `evals/routing-heldout-results.md`.

This probe is a **periodic manual generalization check, not a CI gate** — held-out
prompts are meant to find edges (a hard gate would be noisy), and ~450 agents/run
is too expensive per-PR. Unlike `routing-dataset.json` it is **hand-authored, not
generated**, so it is deliberately **not** wired into `--build-dataset` /
`--check-dataset` and does **not** touch `routing-baseline.json` (the committed
gate stays the mined 124-case k=1 run).

### TDD loop for routing (RED → GREEN)

A misroute is a RED. The fix is almost always a **catalog description** edit
(disambiguate keywords / when-to-use) — edit the skill's `SKILL.md` frontmatter,
`node scripts/build-plugins.mjs` to regenerate `catalog.json`, then re-run the
routing eval until GREEN. This is the `writing-skills` baseline→counter loop with
routing accuracy as the metric; descriptions are the shared tuning surface for both
routing (the catalog) and direct auto-trigger, so one improvement pays twice.

The current suite has **zero natural misroutes** (64/64 positive, 52/52 boundary,
0 confusion — the committed CI baseline), so there is no live RED to fix. Exercising the loop synthetically (degrade one skill's
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

## Interop with Anthropic's skill-creator

Anthropic's official `skill-creator` plugin (`claude-plugins-official`) now ships a
per-skill eval loop, and it overlaps ours by design — both keep test cases in
`evals/evals.json` *inside the skill directory*, both compare the skill loaded vs
absent, and both judge with an LLM. The two are complementary, not competing: use
skill-creator to author and tune one skill; use this harness to **gate a whole catalog
in CI**. The overlap and the gaps:

| Capability | skill-creator | this repo |
|---|---|---|
| Eval cases in `evals/evals.json` inside the skill dir | yes | yes (fixed 3: happy / edge / scope-boundary) |
| With-skill vs without-skill comparison | `benchmark.json` (pass rate, time, tokens) | RED/GREEN gap in `run.py` (GREEN ≥ RED) |
| LLM-as-judge grading | per-run `grading.json` | centralized in `run.py`, **majority-of-k** voting |
| Description / trigger tuning | generates should/should-not-trigger prompts, measures hit rate, proposes edits | mined into the **routing** dataset (positive + boundary cases) |
| Blind A/B of two skill versions | yes | no (out of scope) |
| **CI regression-vs-baseline gate** | **no** (validate is structural only) | **yes** — content *and* routing, gated in CI |
| **Catalog-level routing evals** ("which of N skills activates") | **no** (per-skill only) | **yes** — the routing harness above |
| Pressure tests (adversarial rationalization) | no | yes, on hardened skills |

**Schema mapping.** Our `evals.json` is a superset-compatible shape: `{ skill_name,
evals: [{ id, prompt, expected_output, assertions[] }], pressure_tests? }`. `prompt`
maps directly to skill-creator's test prompt; `expected_output` is the "what good looks
like" prose; `assertions` are the binary judge criteria (skill-creator folds both into
its grading rubric). We deliberately keep **no** `grading.json` / `benchmark.json` in the
repo — grading logic lives in `run.py` so it can enforce regression-vs-baseline rather
than an absolute threshold (see [Metrics & gate](#metrics--gate)). A skill authored here
runs under skill-creator unchanged; the reverse needs only the 3-eval happy/edge/boundary
contract and (for hardened skills) a `pressure_tests` block.

**Positioning.** skill-creator is the better *authoring* and single-skill tuning tool;
this harness is the **CI regression gate and catalog-level routing evaluator it doesn't
provide**. The natural division of labor: tune a skill's description with skill-creator,
then let `run.py` + `routing.py` keep it — and the other 64 — from regressing on every PR.
