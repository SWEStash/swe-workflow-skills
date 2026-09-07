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
- For a skill with `context: fork` in its frontmatter, write assertions against
  the **returned summary**. The full report goes to a file that neither the
  harness nor the calling conversation ever sees, so an assertion aimed at the
  written artifact tests nothing. See limitation 5 below.
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
| `evals/workflow-runner.mjs` | Fast local RED/GREEN loop; **produces the committed baseline** | Claude Code Workflow tool |
| `evals/run.py` | CI regression gate, scriptable; **consumes that baseline** | `ANTHROPIC_API_KEY` + `EVAL_GEN_MODEL`/`EVAL_JUDGE_MODEL` + `pip install -r evals/requirements.txt` |

Both **generate** a candidate reply (with the skill loaded = GREEN; without =
RED) and **judge** it with a skeptical LLM-as-judge using structured output
(per-assertion pass/fail, keyed on assertion index). Both support
majority-of-`k` voting; `run.py` adds a non-zero exit when a previously-green
assertion regresses. The GitHub Actions workflow (`.github/workflows/skill-evals.yml`)
runs it on PRs that touch `skills/`.

**The two arms present the model the same condition**, so their rows are
comparable: RED is tool-less in both, and GREEN in both may read files inside
the skill's own directory (see "What the harnesses can see" below).

```bash
export EVAL_GEN_MODEL=claude-opus-5 EVAL_JUDGE_MODEL=claude-opus-5
python evals/run.py --all --update-baseline      # record the golden baseline
python evals/run.py --changed --base origin/main # CI: only changed skills
python evals/run.py --skills tdd-workflow -k 3    # one skill, 3 votes
```

### The shared baseline (`evals/baseline.json`)

Written by the **in-session Workflow arm** (subscription-funded), committed, and
consumed as the CI gate by the **Python arm** — the same split
`evals/routing-baseline.json` already uses. Shape: top-level `_note` / `model` /
`k` / `runner` / `option` / `summary`, then `skills.<name>."{kind}:{id}"` rows
carrying `green` and `red` **per-assertion boolean arrays** plus their own
`model` / `k` / `runner`.

Two properties matter:

- **Partial files are valid.** `run.py` chains `.get()`, so uncovered cases
  simply don't gate — which is what makes a large sweep resumable and safe to
  commit in batches.
- **Model is recorded, not pinned.** `run.py` has no default model on purpose:
  a stale hardcoded pin plus a committed baseline manufactures false regressions
  library-wide the day a new model ships. The gate compares **only rows whose
  recorded model matches the model now running**, and prints "not comparable"
  otherwise rather than reporting a regression. `workflow-runner.mjs`'s
  `MODEL = 'opus'` is a harness shorthand, not a model id — the session that runs
  the sweep reports the resolved id, and that string goes into the provenance
  fields.

**`k` is per row.** The original sweep was recorded at k=1 (one sample per case),
matching the routing precedent. **As of 2026-09-07 that is history: every row is
at k>=3** (215 cases at k=3, 19 at k=5), every remaining single-sample case having
been re-measured. A row's own `k` is still the authority and the
top-level value only summarises. CI runs `-k 3` against a baseline with no k=1 rows,
so the gate now compares like with like.

Vote in the Workflow arm by passing `{ k, cases }` instead of a bare case array
(a bare array still means k=1). Each assertion is a majority of `k` independent
generate-and-judge rounds per arm — independent generations, because generator
variance is the larger of the two and re-judging one reply would measure only the
smaller. **Ties fail**, matching the judge's own instruction to fail when in
doubt. A round that dies drops out rather than counting as a round of falses; the
survivors vote and the row records the count actually voted, so a quota death
degrades a row to k=2 instead of recording a fabricated failure. Only a total
wipeout of an arm excludes the case.

**k=1 is noisy enough to mislead.** Of seven cases that scored GREEN below RED at
k=1, three evaporated at k=3 — and RED moves too: one case scored RED 5/5 then
4/5 on consecutive k=3 runs. Confirm a one-assertion gap at k>1 before treating it
as a defect, let alone editing a skill for it.

### Merging a run into the baseline (`evals/merge-baseline.mjs`)

`workflow-runner.mjs` **returns** its results and writes nothing, so a Workflow-arm
run has to be merged in. Do it with the helper, not by hand:

```bash
node evals/merge-baseline.mjs <results.json> --model claude-opus-5 \
     --note "2026-08-27, branch main / parent 50c44b6: <what it covered>, N cases."
```

`<results.json>` is the `{ results, errored, total, baseline }` object the runner
returned. The merge is **row-level**, keyed by `(skill, case-id)`: k=3 rows
supersede their k=1 predecessors, every untouched row stays byte-identical, and
re-merging the same results is a no-op — so it does not matter which of two
concurrent sessions merges first. `--dry-run` prints the plan and writes nothing;
`--baseline` / `--out` retarget the file (merge against a copy to rehearse).

It recomputes `summary` from **all** rows (including the `skills` count the runner
never emits), rewrites the top-level `k` summary string, and appends `--note` to the
`_note` coverage paragraph. It also reports the two numbers a merge should be judged
on: assertions newly green, and **gate coverage given up** — every assertion that was
green and is now red, which is exactly what `run.py` fails on. A k=3 row superseding
a k=1 one legitimately does that; the point is that it gets named rather than
absorbed.

`--transcripts <dir>` points it at the run's workflow transcripts and refuses any
row whose **control arm loaded the skill under test** (limitation 8) — the row is
not a control, so it must not be recorded as one. Cross-skill loads and
`context: fork` calls are reported and allowed through. `--allow-contaminated`
records them anyway, the way `--allow-degraded` does for short rows.

`--note` is checked before anything else: it **refuses** a planning label
(`Cycle 2`, `Phase 3`, `CP1.4`) because the note ships inside `baseline.json`,
whose `_note` is a single ~29,000-character line — a private label there renders
as one unreadable diff line and reaches readers who cannot resolve it. A bare run
id only warns; it is weak provenance, not a label pretending to be a reference.

It refuses to write when a row looks wrong rather than recording it: `--model` still
set to the `opus` shorthand or carrying a variant suffix like `claude-opus-5[1m]`
(either makes every merged row skip as "not comparable" instead of gating); a row
whose verdict count disagrees with the case's current `evals.json` (the arrays are
positional — deleting one assertion shifts every index above it); `green`/`red` of
different lengths; a row all-false in both arms (the agents-died signature); or a row
that voted fewer rounds than the run targeted (resume the run, or `--allow-degraded`).

**Do not** use `run.py --update-baseline` to fold in a partial run: it merges
skill-level (`{**base_skills, **results}`), so re-running a subset of one skill's
cases drops that skill's other rows.

### Results (content evals, full catalog)

`claude-opus-5`, all 66 skills, 234 cases, 1311 assertions, **every row at k>=3**.

**What RED actually is.** RED answers the same prompt without the skill's *content* —
it cannot read any `SKILL.md`, `references/` or `templates/`. Both arms do carry the
session's skill listing (~63KB of every skill's name, description and trigger
keywords), so RED knows the library exists and what each skill claims; that is a
constant on both sides and cancels. **So the gain measures what a skill's body and
references add over that skill merely being installed and listed** — the right
counterfactual for a name-only library, where the listing is always in context.
See limitation 7 for what it means for assertion design.

| Metric | Result |
|---|---|
| Assertions passed, no skill body (RED) | **855 / 1311 = 65.2%** |
| Assertions passed, skill loaded (GREEN) | **1283 / 1311 = 97.9%** |
| Gain | **+32.6 points** |
| Cases where GREEN beats RED | **177 / 234** |
| Cases where GREEN ties RED | **57 / 234** |
| Cases where GREEN is *below* RED | **0 / 234** |

**The zero is the number to protect.** A skill that scores below the model without its
content is worse than no skill at all. **There are also zero RED-true / GREEN-false
assertions** anywhere in the library. The 57 ties are mostly cases where RED already
saturates — no headroom left to show, not a skill doing nothing — and saturation
concentrates by case kind: `eval:1` 5%, `eval:2` 33%, `eval:3` 28%, pressure 26%.
Scope-boundary cases saturate because three of their four assertions (recognise the
request, name the sibling skill, withhold the wrong deliverable) are satisfied by the
roster alone; only "states the boundary" discriminates.

**The gain does not track reference mass**, which is worth knowing before optimising
for depth:

| Band (references+templates bytes ÷ SKILL.md bytes) | Skills | RED → GREEN | Gain |
|---|---|---|---|
| zero (no references at all) | 16 | 66.8% → 97.3% | **+30.5** |
| light (0 < ratio < 1) | 22 | 69.2% → 93.9% | +24.7 |
| heavy (ratio ≥ 1) | 28 | 65.6% → 93.7% | +28.1 |

Pearson r between reference ratio and GREEN gain is **−0.06** across the 66 skills —
no relationship. The zero-reference skills are the control that makes this readable:
they gained the *most* with nothing to read, so the gain comes from the instruction
itself. Note the standing confound — GREEN gained tool access alongside reference
access — which is exactly why the zero-reference band matters.

Recorded at **k>=3 for every row** (215 at k=3, 19 at k=5) as of 2026-09-07; `k` is
per row. All 173 remaining single-sample cases have since been re-measured, so the
k=1 caveat that used to sit here no longer applies.

### Why the gate is regression-vs-baseline, not an absolute threshold

We gate on **GREEN drift vs. the baseline**, never on an absolute pass rate, and
we track RED for delta only (base-model behavior varies, so gating on it is
flaky). Several findings from running this make the choice necessary:

1. **Some assertions can't be satisfied by a single tool-less reply.** The
   generators are told to output only a reply (no tool use), so assertions like
   "runs the proving command in this session" or "keeps a timestamped action
   log" fail even when the skill is working — the behavior spans a session, not
   one message. In a real run these depressed `verification-before-completion`
   and `incident-response` GREEN scores well below a manual read. Fix: phrase
   assertions so they're satisfiable by the artifact under test (e.g.
   "identifies *which* command would prove it" rather than "runs it"). The
   generator now *does* get a read tool scoped to the skill directory — see (3)
   — but it still cannot execute a command or write a file, so genuinely
   session-spanning assertions remain out of reach; (4) says what to do with them.
2. **The judge is deliberately harsher than a human eyeball.** Absolute scores
   are therefore not comparable across skills; *movement* is the signal.
3. **GREEN can see `references/` and `templates/` — RED still can't act.** This
   used to be the harness's biggest blind spot: about half the library's
   instructional content lives in those directories (428KB across 50 of 66
   skills), and neither runner read a byte of it, so reference-heavy skills
   scored as though that content didn't exist and **an improvement to a reference
   file could not move any score**. Both arms now use **option A**: the GREEN
   generator may read files inside the skill's *own* directory. Read-only — no
   write, no bash. RED is unchanged and tool-less; that contrast is the whole
   signal.

   **The two arms enforce that scope differently, and the difference matters.**
   `run.py` enforces it in code: the request carries exactly one tool, whose path
   guard resolves the request and rejects `..`, absolute paths outside the root,
   and symlink escapes — write and bash are not refused, they are absent.
   `workflow-runner.mjs` runs its GREEN generator as `agentType: 'general-purpose'`,
   which carries the full tool set; there the scope is **enforced by the prompt
   alone**. A stray write or a read outside the skill directory is possible in
   principle, and the sharper risk is eval integrity rather than security — a GREEN
   agent that reads a *sibling* skill is no longer measuring what the row claims.
   Fingerprint `skills/` before and after a sweep (`find skills -type f | sort |
   xargs sha256sum | sha256sum`) to detect it. Tightening this is a deliberate
   re-baseline, not a silent edit: changing the agent type changes the eval
   condition and makes new rows incomparable with everything already recorded.

   The authoring rule **inverts**: an assertion satisfiable only from
   `references/` or `templates/` is now legitimate and should be kept. Do not
   copy reference depth up into `SKILL.md` to make a score move — that defeats
   progressive disclosure, and it is no longer necessary. There is still **no
   `reference-dependent` field** in the schema, and neither runner honours one;
   don't invent a marker.

   Two costs come with the grant. GREEN is now nondeterministic in a second way
   (which files the agent chooses to open), and GREEN has *tool access* as well
   as reference access — so a GREEN movement is not by itself proof the
   references caused it. The 16 zero-reference skills are the control pool for
   that question.

4. **Tool-dependent assertions: partially inverted.** An assertion requiring the
   model to *demonstrate a lookup* is now satisfiable **when the thing looked up
   lives inside the skill's directory** — that's exactly what option A grants.
   What stays unreachable is anything needing a **real repo, a write, or an
   executed command**: "runs it fresh in this session and reads the exit code",
   "saves the ADR to the filesystem", "grounds the judgment in what the repo
   declared protected". The harness supplies no repo and no write tool, so those
   fail forever regardless of how good the skill is.

   Such an assertion contributes **zero gate signal** by construction — the
   regression check only fires on `was && !now`, so a permanently-false assertion
   can never catch anything. Delete it and record why in the test's
   `expected_output` / `expected_behavior`, then verify that behavior in a real
   session or the layer-3 routing harness, which does hand the model tools. Two
   tells if you're unsure: **0/N unanimous in GREEN across successive rewrites**,
   or **0/N in both arms** (nothing to discriminate).

   The distinction still matters because the two look identical from the score:
   content *present* in `SKILL.md` still fails if satisfying it requires an action
   the harness forbids. Promoting more text will not fix it.
5. **Item 4's failure mode has a skill-side twin: the skill routes the output
   away itself.** A skill that both *demands* an output and *routes it elsewhere*
   hands the model a documented licence to defer, and the score looks identical
   to a content gap. The four `context: fork` skills (`strategic-review`,
   `project-review`, `security-audit`, `technical-debt-review`) each carry a
   clause of the shape "write the full report to a file … only the summary
   returns, everything unwritten is lost", plus an **Open questions** section for
   judgment calls. `strategic-review` shows the trap: `SKILL.md:90` requires it to
   "name a recommended path and why", while `:98` files "which strategic fork to
   take" under Open questions.

   **The diagnostic is to check RED.** RED never reads the SKILL.md, so if RED
   fails the same assertion, no clause in the skill can be the cause — the problem
   is the assertion's wording against the prompt. Applying that test to this
   library retired every fork-context row that looked unreachable: an audit of all
   14 cases / 76 assertions across the four skills found **zero** assertions
   unreachable because of `context: fork`. Assertions naming a *report section*
   render inline fine and pass. What the clause actually produces is an **untested
   instruction** — no assertion anywhere covers the write-to-file behavior, so
   verify it in a live session or the layer-3 routing harness rather than adding an
   assertion the harness can never satisfy.

   `project-review/SKILL.md:95-101` is the clause shape to copy: it ends "and
   mention it in the summary", which keeps Open-questions content inside the
   returned artifact and therefore inside the harness's reach.
6. **~~Most of the baseline rests on single samples~~ — RESOLVED 2026-09-07.**
   This limitation described 173 of 234 cases sitting at k=1 while CI ran
   `run.py -k 3`, so sampling noise on a marginal row read as a regression. The
   remediation cycle re-measured every one of them: **the baseline is now k>=3
   throughout** (215 at k=3, 19 at k=5) and the gate compares like with like.
   Kept as a numbered entry so the reasoning survives — the finding that half of
   k=1 *reds* evaporate at k=3 still holds, and **any new row must be recorded at
   k>=3**. A bare case array in the Workflow runner still means k=1; pass
   `{ k, cases }`.
7. **Both arms see every skill's description, so the contrast is body-vs-description.**
   The harness injects the session's skill listing (~63KB of names, descriptions
   and trigger keywords) into **both** generators — verified: 29/29 GREEN and
   28/28 RED agents in a sampled run carry it. RED is therefore not a model that
   has never heard of this library; it knows every skill exists and what each one
   claims, and can route by roster without reading any skill content.
   **This is a constant, not a confound** — it is present on both sides and
   cancels. What the gain measures is exactly the deployment-relevant question:
   **does a skill's body and references add value over that skill merely being
   installed and listed?** For a name-only library, where the listing is always
   in context, that is the right counterfactual, and the figure is neither
   inflated nor a lower bound.
   The consequence is about **assertion design**, not about the arms: an
   assertion satisfiable from a description alone cannot isolate the body, because
   the description is on both sides by construction. That is why "refers to skill
   X" assertions discriminate weakly — RED passes 6 of 15 of them (GREEN 15/15,
   its edge coming from being told to follow the skill rather than from content
   RED lacks) — and it is the mechanism behind scope-boundary saturation, where
   three of four assertions per case are description-satisfiable and only "states
   the boundary" tests the body.
8. **RED occasionally loaded the skill under test — now prevented and detected.** The
   treatment in this A/B is *the skill being loaded*, so the control must load
   none. GREEN loads by **reading the file** (`greenGen`: "First read that file"),
   which is why GREEN legitimately shows `Read`/`cat` against its own directory;
   GREEN never invokes the `Skill` tool. RED is only *told* "Do NOT use any tools"
   — `workflow-runner.mjs` spawns it as `agent(redGen(it), …)`, the default workflow subagent with **no
   tool restriction**, and `agent()` has no tool-restriction option.
   Measured across every recorded run: **16 `Skill` calls out of 1571 RED
   generators (1.0%)**, every one succeeding. Two of them do not contaminate the
   A/B, and they are different rounds, so **true contamination is 14**:
   - **15 of 16 loaded the skill under test**; the exception invoked a *sibling*
     (`cicd-pipeline eval:3` → `release-management`), which is redundancy signal
     rather than contamination — on a scope-boundary case that is arguably the
     right answer.
   - **15 of 16 actually injected a body** (the transcript shows
     `Base directory for this skill: …` and the full `SKILL.md`); the exception was
     a `context: fork` skill, which launches a background agent and returns only
     "launched (forked execution, running in the background)". That is why
     `strategic-review eval:1` records RED 0/7 *despite* a successful call.

   No RED agent ever found a `SKILL.md` by reading the filesystem, which is
   unsurprising: it has no knowledge of the project layout.
   **The contamination is self-limiting**, which is why the invariants hold. 10 of
   13 affected case-runs leaked **one round of three**, and majority-of-3 cannot be
   flipped by a single round unless the other two split — so the k>=3 baseline is
   largely immune. A leaked round is also not GREEN: it gets `SKILL.md` only,
   mid-conversation, from the globally installed copy rather than the version under
   test.
   The fork behaviour also **constrains the fix**: the four fork skills
   (`strategic-review`, `project-review`, `security-audit`,
   `technical-debt-review`) would silently load *nothing* through a Skill-tool
   path, so GREEN must keep loading by file read.
   **The fix is not to ban all skills in RED — it is to deny the skill under
   test.** Allowing RED to route to *siblings* is signal worth keeping: if RED
   solves the task via another skill, this one may be redundant. That case already
   exists — in `cicd-pipeline eval:3`, RED invoked `release-management`, which on a
   scope-boundary case is arguably the correct answer.

   **What is in place now.** The fix is not to ban all skills in RED — it is to
   deny *the skill under test*, keeping sibling routing as signal:

   - **Prevention.** `redGen` names it: "Do NOT use any tools — and in particular
     do NOT invoke the `<skill>` skill". The blanket ban alone did not hold,
     precisely on the prompts that most evoke the skill. Naming it tells RED which
     skill is under test, but **both arms already carry the full skill listing**
     (limitation 7), so the name is not information RED lacked.
   - **Detection.** `evals/check-red-leaks.mjs` scans a run's transcripts and
     classifies each RED skill load as same-skill (contamination, fatal),
     cross-skill (redundancy signal, reported), or a `context: fork` call (no body
     injected, harmless). It reads the fork set from the skills' own frontmatter
     and attributes each leaked round to a row by its prompt, since a transcript's
     `agent-*.meta.json` carries no label. `--self-test` runs it against committed
     fixtures and is wired into the `drift` CI job.
   - **Merge gate.** `merge-baseline.mjs --transcripts <dir>` refuses any row whose
     control arm loaded the skill under test.

   **Field-tested.** The five rows whose control arm had loaded the skill under
   test were re-measured under the prohibition: 15/15 RED rounds loaded nothing,
   and all five rows kept their GREEN vectors exactly, giving up no gate coverage.
   RED moved by one assertion net — but it moved *up* on two assertions, which
   de-contamination cannot cause, so that net sits inside k=3 sampling jitter.
   Read the re-measure as confirmation that the rows are clean, **not** as a
   measurement of what the leak was costing. The one majority-contaminated row
   (two of three rounds) came back only one assertion lower, which is further
   evidence for limitation 7: RED gets most of such a case from the prompt and the
   skill listing, not from the body.

   **`evals/run.py` needs no equivalent and deliberately has none:** its RED arm
   calls `messages.create` with no `tools` parameter at all (contrast the GREEN
   arm's `tool_runner`), so it is structurally incapable of loading a skill.
   Changing its prompt would alter the CI arm's control for no benefit.

   **Two caveats on the numbers above.** The prompt change means rows measured
   after it are not prompt-identical in the *control arm* to rows measured before.
   The gate is unaffected — `run.py` compares GREEN only and never reads RED — but
   a lift comparison spanning that boundary is comparing two slightly different
   controls. And the 1571 denominator was true when counted: workflow transcripts
   age off disk, and a re-scan today finds 1250 RED generators still present,
   containing all 16 of the same calls.

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
committed, drift-checked via `--check-dataset` like `catalog.json`). Today: **65
positive + 65 boundary + 8 trivial = 138 cases**. It stays in sync — every new
skill's 3 evals yield 2 new routing cases.

- **Happy-path** prompt (eval #1) → positive: `accept = {that skill}`.
- **Scope-boundary** prompt (eval #3) → boundary: `accept = {home} ∪ {siblings
  named in its expected_output} ∪ {NONE}`.
- A small curated **trivial/conversational** set (`evals/routing-trivial.json`,
  the only hand-authored cases) → `accept = {NONE}`, guarding against over-routing.

**Editing an `evals.json` therefore edits this dataset**, which is easy to miss because the
fields involved are not the ones the content harness reads. An `eval:1` or `eval:3` prompt
changes a case; an `eval:3` **assertion or `expected_output`** changes a boundary case's
*accept set*, because siblings are found by scanning that text for skill names. Run
`--build-dataset` and commit, or the `routing` CI job fails on `--check-dataset`.

**Read the rebuild diff rather than committing it blind.** The scan is a plain substring
match, so *any* mention of a skill name lands in the accept set — including one you wrote to
explain that a name is wrong. Retargeting `deployment-repo eval:3` off a stale skill once
produced an accept set holding **both** the old and new owner, because the `expected_output`
narrated which was stale; the note describing the bug re-introduced it, loosening the
boundary test to accept a route to a skill with no relevant content. Keep
`expected_output` as prose about what a good answer looks like — history belongs in the
commit message, not the fixture.

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
python evals/routing.py --run                     # route all 138 cases on haiku
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

Full run on `claude-haiku-4-5` over the then-126-case dataset (2026-07, 66-skill
catalog), recorded at **k=1** (one sample per case). The committed baseline
(`evals/routing-baseline.json`) now covers 138 cases: the 12 boundary cases the
dataset gained when twelve skills got their missing third eval, plus one rewritten
positive prompt, were re-recorded in-session and all pass, so the rates below still
hold at 65/65, 65/65 and 0/8:

| Layer 2 metric | Result (k=1) |
|---|---|
| Top-1 routing accuracy (positives) | **65/65 = 1.00** |
| Boundary pass rate ("no wild misroute") | **65/65 = 1.00** |
| False-activation rate (trivial → NONE) | **0/8 = 0.00** |
| Confusion pairs | **none** |

Layer 3 (behavioral, 16 cases): router-invocation rate **1.00** (8/8 substantial
prompts invoked a skill), correct-invoke 8/8, over-route **0/8**.

A single-draw clean sweep invites the obvious question — *is the dataset just
crafted to pass?* Two checks say the result is real but should be stated precisely,
not as "everything perfect". (Both checks below were run on the **then-124-case**
dataset — 64 positive / 52 boundary / 8 trivial — before the catalog grew to 66
skills; their per-case counts are that run's, not today's.)

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

(`routing-baseline.json` records the **k=1** full 138-case run — refreshed 2026-07
via the in-session runner — so every case gates in CI; the k=3 pass above is a
stability probe, not the committed gate. An earlier, smaller-catalog baseline
scored the same layer-2 sweep but only a 0.75 layer-3 invocation rate; this run
clears layer 3 at 8/8.)

**Haiku recommendation: keep haiku.** Stable top-1 accuracy, no wild misroutes,
and zero false activations across the full 66-skill catalog — reproduced at k=3 —
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
hand-authored set** written **without** copying phrasing from any skill's
`evals.json` and deliberately **avoiding each skill's own `Triggers:` keywords**
(0/92 paraphrases contained an own-trigger phrase at the time of the run). Same
`{ id, kind, skill, prompt, accept[] }` shape; the authoring category is encoded in
the `id` prefix.

**The file now holds 162 cases** (101 paraphrase · 25 confusable · 18 trap · 18
trivial). The recorded run below was made on the **150-case** version; the 12 cases
added since — the claim-shaped routing probes landed with the completion-gate work —
have **not** been routed, so they are outside the result. Re-run the probe to bring
the record forward. The 150-case composition it measured was:

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

**Result (`claude-haiku-4-5`, k=3, 2026-07, on the then-150-case set — 451 route
agents, 0 errors):** a
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
gate stays the mined 138-case k=1 run).

### TDD loop for routing (RED → GREEN)

A misroute is a RED. The fix is almost always a **catalog description** edit
(disambiguate keywords / when-to-use) — edit the skill's `SKILL.md` frontmatter,
`node scripts/build-plugins.mjs` to regenerate `catalog.json`, then re-run the
routing eval until GREEN. This is the `writing-skills` baseline→counter loop with
routing accuracy as the metric; descriptions are the shared tuning surface for both
routing (the catalog) and direct auto-trigger, so one improvement pays twice.

The current suite has **zero natural misroutes** (65/65 positive, 53/53 boundary,
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
