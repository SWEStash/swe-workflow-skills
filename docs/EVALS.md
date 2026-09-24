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

Per row it also prints **how many assertions discriminate** — GREEN passes and RED
fails — naming them by index. That is a different question from the gate's: `run.py`
compares GREEN only and never reads RED, so a row where the control matches the skill
still protects against regression. What it has lost is the ability to show the skill
adds anything. A row at 1 is a single judge call away from measuring nothing, and a
row at 0 measures nothing already; both are candidates for a stronger fixture or a
sharper assertion, not for adding content to the skill.

`--transcripts <dir>` points it at the run's workflow transcripts and refuses any
row whose **control arm loaded the skill under test**, or whose **judge read an
`evals.json`** (limitation 8) — the first row is not a control and the second was not
judged on the reply, so neither may be recorded. Cross-skill loads, `context: fork`
calls and judge calls that reach outside the reply are reported and allowed through;
judge computation over the reply is allowed. It also records the hash of the skill
listing the controls saw on each row, and warns when that listing differs from the
row's previous measurement (limitation 7).
`--allow-contaminated` records them anyway, the way `--allow-degraded` does for short
rows.

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

`claude-opus-5`, all 66 skills, 234 cases, 1314 assertions, **every row at k>=3**.

**What RED actually is.** RED answers the same prompt without the skill's *content* —
it cannot read any `SKILL.md`, `references/` or `templates/`. Both arms do carry the
session's skill listing (~63KB of every skill's name, description and trigger
keywords), so RED knows the library exists and what each skill claims; within a run
that is a constant on both sides and cancels (limitation 7 on why it is not constant
between runs). **So the gain measures what a skill's body and
references add over that skill merely being installed and listed** — the right
counterfactual for a name-only library, where the listing is always in context.
See limitation 7 for what it means for assertion design.

| Metric | Result |
|---|---|
| Assertions passed, no skill body (RED) | **850 / 1314 = 64.7%** |
| Assertions passed, skill loaded (GREEN) | **1286 / 1314 = 97.9%** |
| Gain | **+33.2 points** |
| Cases where GREEN beats RED | **195 / 234** |
| Cases where GREEN ties RED | **39 / 234** |
| Cases where GREEN is *below* RED | **0 / 234** |

**The zero is the number to protect.** A skill that scores below the model without its
content is worse than no skill at all. **There are also zero RED-true / GREEN-false
assertions** anywhere in the library. The 39 ties are mostly cases where RED already
saturates — no headroom left to show, not a skill doing nothing — and saturation
concentrates by case kind: `eval:1` 8%, `eval:2` 23%, `eval:3` **6%**, pressure 28%.
Scope-boundary cases used to saturate at 18% because three of their four assertions
(recognise the request, name the sibling skill, withhold the wrong deliverable) were
satisfied by the roster alone. Rewriting 26 of them against a sibling the roster cannot
disambiguate took that to 5% (6% since, from a row outside the rewrite) — and moved the
discriminating assertion from "states the boundary" to the routing assertion itself
(limitation 9).

**The gain does not track reference mass**, which is worth knowing before optimising
for depth:

| Band (references+templates bytes ÷ SKILL.md bytes) | Skills | RED → GREEN | Gain |
|---|---|---|---|
| zero (no references at all) | 16 | 63.3% → 98.8% | **+35.5** |
| light (0 < ratio < 1) | 22 | 66.4% → 97.2% | +30.7 |
| heavy (ratio ≥ 1) | 28 | 63.9% → 98.0% | +34.1 |

Pearson r between reference ratio and GREEN gain is **−0.09** across the 66 skills —
no relationship. The zero-reference skills are the control that makes this readable:
they gained the *most* with nothing to read, so the gain comes from the instruction
itself. Note the standing confound — GREEN gained tool access alongside reference
access — which is exactly why the zero-reference band matters.

Recorded at **k>=3 for every row** (189 at k=3, 44 at k=5, 1 at k=4) as of 2026-09-22; `k` is
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
   **Within a run this is a constant, not a confound** — it is present on both sides
   and cancels. **Between runs it is not constant.** Which skills are listed with
   their full description, rather than by name, varied between runner sessions with
   no change to the repo, and a control's routing follows it: on one unchanged
   scope-boundary prompt the control named the sibling skill in 0 of 5 rounds in one
   session and 5 of 5 in the next, where a third skill's description that routes to
   that sibling was listed in full only in the second. So a RED verdict on a
   description-satisfiable assertion holds for the session that produced it, and a
   RED change between two runs of such an assertion is not evidence of anything
   until the listings are compared. The comparison is now recorded rather than
   remembered: `check-red-leaks.mjs` prints a hash of the listing the controls saw,
   `merge-baseline.mjs --transcripts` stores it on each row as `listing`, and warns
   when a row's controls saw a different listing than its previous measurement (or
   when one run's controls saw more than one). Rows merged before this carry no hash
   and are not compared.

   What the gain measures is exactly the deployment-relevant question:
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

   **The judges had the same gap, and it was found the same way.** Judges run as
   workflow subagents with the full tool set, and their prompt never said to judge
   the quoted reply alone. A scan of every judge transcript still on disk — 4,661 of
   them — found **65 (1.4%) making tool calls outside the verdict**. Most grepped a
   skill file to check a reply's claim against the repo. **In 10 runs a judge opened
   an `evals.json`**, which carries each case's `expected_output`: the answer key the
   generator never saw. One such row was caught before merging when three of its six
   judges read the key and quoted it back in their verdicts. The same three layers now
   apply to judges:

   - **Prevention.** `judgeP` tells the judge to open, read or search no file,
     directory or web page — no `evals.json`, no `SKILL.md` — because checking a reply
     against the repo measures the repo. **It deliberately does not ban tools
     outright.** A judge may compute over the quoted reply: count the characters of a
     drafted description, or run a snippet the reply wrote to check its arithmetic.
     Those calls make a length or correctness verdict more accurate, and a blanket ban
     would take them away — the same trap as the generator ban that once hid every
     skill's `references/` from scoring (limitation 3).
   - **Detection.** `check-red-leaks.mjs` also scans judges, attributing each to a row
     by the prompt it quotes, and sorts every call beyond the schema's own
     `StructuredOutput` three ways: a read of any `evals.json` or `expected_output` is
     an **answer-key read** (fatal) — and `.local/` counts as one, because the run's
     brief, payload and results name each case's assertions and which one a batch just
     added; a non-shell tool, or a shell command that reads a
     path outside `/tmp` or runs anything but a compute verb, **reaches outside the
     reply** (reported); what remains is **computation** (allowed). Judges compute in
     their scratch space — the reply's code written to a file under `/tmp` and run, or
     a `node -e` / `python3 -c` body — so the detector reads the command rather than
     matching words in it: script bodies are checked for file, process and network
     APIs, and every other path must sit under `/tmp`. Matching words alone had
     reported every scratch run as a repo read. On the 3,763 judge transcripts on disk
     on 2026-09-16 the split is 14 / 77 / 51; all 51 computation calls count characters,
     check the reply's arithmetic or re-run code it contained, and all 77 reported
     calls read a skill, doc or repo path.
   - **Merge gate.** `--transcripts` refuses a row whose judge read the answer key, and
     refuses the **whole batch** when such a read cannot be attributed to a row — there is
     then no way to tell which case that judge was scoring. It also warns per row when RED
     passes an assertion GREEN fails, since the library publishes zero of those.

   Measured once, and it is why the `.local/` rule exists: three judges in one batch read
   that batch's own runner brief, which named the newly added assertion on every row they
   were scoring. The reads were unattributable, so the two rows in that run were re-measured
   rather than recorded.

   **The same comparability caveat applies:** rows judged after the prompt change were
   judged under a different instruction than rows before it. The twelve baseline rows
   whose latest run had a judge read an `evals.json` or grep a skill file were
   re-measured under the new prompt, at their original k, with every judge scan clean:
   seven came back identical, four lost one assertion and one gained two. One loss was
   plainly answer-key-assisted — an assertion that a reply "uses the template" had been
   passed by judges who opened the template itself. The scan cannot see runs whose
   transcripts have aged off disk, so older rows may carry the same defect unmeasured.

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
   a lift comparison spanning that boundary compares two different controls, and
   **the difference is not always small.** Measured on nine rows re-run across the
   boundary: five comparable rows moved the control by 0 to 1 assertion, inside the
   sampling floor — but `project-documentation eval:1` moved **six of nine**, its
   control rising 1/9 to 7/9 while GREEN stayed byte-identical. Its old control
   vector passed only "grounds the README in the real manifest" and failed every
   content assertion, the signature of a control that **declined to produce the
   artifact at all**; the current control writes one. That is answer posture, and
   limitation 10 records what happened when sixteen such rows were re-measured:
   a third of their combined gain did not survive. **But the signature is not a
   reliable predictor of which rows are affected** — see limitation 10 — so the
   safe reading is simply that a large gain recorded under the old control is
   unconfirmed until that row is re-run, with no shortcut for guessing which ones
   will move.

   And the 1571 denominator was true when counted: workflow transcripts age off
   disk, and a re-scan today finds 1250 RED generators still present, containing
   all 16 of the same calls.

9. **Most rows measure one assertion or none, and scope-boundary cases are
   saturated by construction.** `merge-baseline.mjs` reports, per row, how many
   assertions GREEN passes and RED fails (`node .local/regen-discrimination.mjs`
   recomputes it library-wide). Across 234 rows: **39 discriminate on nothing, 76
   on exactly one.** It concentrates by case kind, and the concentration is
   structural rather than an authoring lapse:

   | Kind | Rows | Zero | One | Total lift |
   |---|---|---|---|---|
   | `eval:1` happy path | 66 | 7 | 13 | **+183** |
   | `eval:2` edge case | 66 | 16 | 18 | +106 |
   | `eval:3` scope boundary | 66 | **6** | 31 | **+103** |
   | pressure | 36 | 10 | 14 | +44 |

   **37 of 66 scope-boundary rows discriminate on 0 or 1 assertion, but only 6 now
   measure nothing at all.** The cause is
   the shape of the case: it asks four things and a bare model gets three of them
   free — it recognises the request kind, names the right sibling skill (the skill
   listing supplies the roster — limitation 7), and withholds the wrong
   deliverable. All that is left to test is whether the reply can **state the
   boundary**. Before any were rewritten, three such cases scored an identical
   control vector `[T,T,T,F]` on what were, in different words, the same four
   assertions.

   **Twenty-one have since been rewritten, and the fix works — but not the way it
   was expected to.** Give the prompt an in-scope half *and* a half owned by a
   sibling that the roster does not disambiguate. Across the first ten rows,
   discriminating assertions went 3 to 9, then to **17** after a second pass on the
   three left measuring nothing. Eleven more followed: scope-boundary rows measuring
   nothing dropped from 13 to **6** library-wide and their total gain rose to +99.

   **What actually became the discriminator was the routing assertion, not the
   boundary statement.** Across those eleven rows the control named the correct
   sibling **0 times out of 11** — the roster genuinely could not settle the split,
   which is exactly what the design is for. The treatment named it 5 times, so that
   assertion now separates the arms wherever the skill routes at all. The other six
   are real cross-skill gaps rather than measurement artifacts.

   **And "states the boundary" turned out to be only about a third effective, so
   most of them are gone.** Of 22 such assertions, 7 discriminated and **12 failed in
   both arms** — neither the skill nor the bare model articulates the split as a
   principle, though both act on it. The two ideas are in tension: the harder the
   roster finds the split, the less either arm states it as a rule. The 12 dead ones
   were **deleted**, on the grounds that they duplicate the "separates the two
   halves" assertion and then add a demand to state a rule *about* the answer — the
   compound-assertion trap in a different costume. They also gated nothing in either
   arm, so the usual objection to deleting a free assertion (it still protects GREEN
   against regression) did not apply. The 7 that work are kept: there the boundary is
   crisp enough to name (`api-design` against storage design, `cicd-pipeline` against
   release policy). **Treat this assertion as optional and justify it per case**, not
   as the load-bearing part of the shape.

   Deleting them needed no re-measurement, which is worth knowing as a technique:
   generators never see the assertion list (`workflow-runner.mjs` passes only the
   prompt), so removing the **last** assertion and popping the matching verdict off
   each arm leaves every other verdict measured against an unchanged reply. Six of
   the twelve were re-measured anyway for an unrelated fix, which doubles as a check
   on that reasoning.

   Three rules came out of doing it, all learned by breaking them. **All three are
   patterns with a sample size, not laws — see limitation 11 before applying any of
   them to a batch:**

   - **Check the two descriptions against each other before choosing the sibling.**
     If either skill's description names the other *with the boundary stated*, the
     "names the right sibling" assertion cannot discriminate — the roster has
     already answered it. One rewrite paired a skill with the sibling whose own
     description reads "design-time analysis of a system not yet built → <the skill
     under test>", so the control passed that assertion for free by construction.
     **Check every description that routes to the sibling, not only the pair's.** A
     third skill's description that hands the sibling a matching problem ("contracts,
     freshness → <sibling>") answers the assertion just as well whenever that
     description is in the session's listing — and whether it is can differ between
     sessions (limitation 7).
   - **Never let the prompt's own facts state the boundary.** One rewrite said "the
     design is still on the whiteboard" and "in production for two years" — which
     *is* the design-time-versus-running distinction, so both arms simply read it
     back and the row went from one discriminating assertion to none.
   - **Two structural conjuncts, never three.** An assertion requiring a handoff to
     name a task breakdown *and* acceptance criteria *and* dependencies is failed
     on the missing third by judges who record the first two as present.

   Budget the cost before repeating it, and budget it higher than seems reasonable:
   the first ten rows added nine newly ungated assertions, and the next eleven added
   sixteen — two thirds of them concentrated in the boundary assertion above and in
   genuine routing gaps. Library-wide ungated assertions went 34 to 49 in one batch.
   These are not all assertion bugs; a harder fixture surfaces real gaps that then
   need fixing. Work in batches with a fix budget, not one sweep.

   **Naming a sibling only in a trailing cross-reference section is not enough on
   its own.** Measured across the eleven rows: of the five skills whose `SKILL.md`
   named the sibling, the treatment routed to it in **one**; of the six that never
   named it, it routed in **four**. Read that as suggestive and no more — it is
   eleven different skills with eleven different prompts, **not a controlled
   comparison**, and it does not mean naming is useless: all five handoffs that were
   successfully relocated *do* name the sibling, in the step prose the prompt enters.
   Relocating those five took the routing assertion from failing in both arms to
   passing in the skill's arm on all five.

   **A later four-case run cannot tell placement from overlap.** The routing
   assertion discriminated on two rows and failed in every round of both arms on the
   other two. The two failures are the skills whose sibling appears only in a
   trailing list — but they are also the two whose own steps already cover the
   sibling's half (choosing a primary metric; pseudonymising an identifier), and one
   of the two passes names its sibling nowhere at all. Placement and content overlap
   separate those four rows equally well. On one failure the skill did name the
   sibling, attached to the half it already owns, and then did the sibling's work
   itself — which is what a skill whose body covers that work would be expected to do.

   **The same batch shows the pattern is not universal.** A sixth skill got an
   entry-point intervention of the same kind — a scope gate above its first step —
   and its strongest row fell from 9/9 to 5/9, losing first the behaviour the
   displaced step owned. That was reverted. **Confirm a placement change on a few
   cases, with a guard row for any skill whose other cases share the edited prose,
   before applying it across a batch of twelve.** See limitation 11.

   **This is not a gate problem.** `run.py` compares GREEN only and never reads
   RED, so a saturated row still fails CI if the skill regresses. Saturation costs
   **lift measurement**, not regression protection, and the free assertions are
   correct behaviours worth gating — do not delete them to raise a ratio.

   **Nor is it evidence a skill is missing content.** The remedies are a harder
   fixture or a sharper assertion. `accessibility-design eval:2` is the worked
   example: its assertion named a violation the fixture never contained, and
   replacing it with the failure that *is* there produced a both-arms pass on
   genuinely harder ground.

   **Do not sweep any of this by pattern-match.** Assertions phrased as an
   accomplished act ("Runs…", "Checks…") look like limitation 1 and mostly
   aren't: 35 assertions match that shape and **exactly one is currently failing**,
   so a regex sweep would rewrite 34 working rows and invalidate them. Four
   superficially identical symptoms in one cycle had four different causes —
   unreachable assertion, crowding-out, a contradictory assertion pair, and answer
   posture. Read the judge rationales instead. The cheap tell: judges **crediting
   the reply's behaviour while failing its letter** ("commendably refuses…", "no
   check is actually performed, only a guideline") means the assertion really is
   unreachable; judges reporting the behaviour as simply **absent** means the
   content exists but is filed where the prompt cannot reach it.

10. **Part of every lift figure is answer posture, not knowledge.** The harness
    rewards producing an artifact and penalises gathering context first, in **both**
    arms, on the same underlying behaviour. On a "set this up for me" prompt an arm
    may legitimately either build or ask, and the score treats asking as ignorance.
    Confirmed in both directions: a control that asked clarifying questions instead
    of producing a schema scored 1/7 where a producing control scored 6/7, inflating
    that row's gain to +6; and a treatment arm that asked for a staging URL before
    concluding was failed on the letter while judges credited the honesty.

    **The test that separates this from a genuinely unreachable assertion is cheap
    and decisive: did any round produce the artifact?** If none could, the assertion
    is unreachable (limitation 4). If some did and others deferred, it is posture.

    **Consequences.** Two rows both at +6 are not comparable without knowing why the
    control failed. A large control movement between runs is expected exactly where
    the prompt invites a choice between building and asking.

    **This has been measured, not just argued.** Sixteen rows whose control had
    declined to produce an artifact were re-measured together, at their recorded k.
    Their combined gain went **+97 to +65** — a third of it was posture, and the
    library total moved +435 to +403. The treatment arm held on fourteen of the
    sixteen. Six were confirmed posture artifacts, two of them collapsing to **zero**
    gain (`metrics-and-okrs eval:1` and `data-modeling eval:1`, whose controls rose
    to a perfect score); six were confirmed real gains that reproduced; two moved
    only slightly; and two moved on the treatment side instead, which is a different
    problem (see below).

    **The effect is real, but do not trust a screen for it.** These sixteen were
    selected by "control collapsed to 0-2 alongside near-perfect treatment", and
    that predictor did not track the effect. The two rows with *entirely zero*
    controls, predicted to move most, barely moved at all — one not by a single
    assertion — while the two total collapses had non-zero controls and were not
    flagged. A row's gain is confirmed by re-measuring that row, and by nothing
    cheaper.

    **A re-measure can also raise a gain.** `prd-writing eval:1` went +6 to +7 when
    its control fell. The exposure is not one-directional.

    **And a count-stable row is not a stable row.** `tdd-workflow eval:1` held its
    control at 2 of 7 across two vectors with **no assertion in common**
    (`FFTFFTF` then `TTFFFFF`). By contrast the three rows re-measured at k=5
    reproduced byte-identically in both arms. That is the clearest evidence yet for
    paying k=5 on a contested row: at k=3 a stable count can hide complete churn
    underneath.

11. **These limitations describe patterns with sample sizes, not rules that transfer
    to every skill.** Skills differ in what their prompts ask for, where their content
    sits, and what a good answer looks like, so a change that closes a gap in one can
    open one in another. Three times in one programme a pattern derived from a handful
    of cases was applied to a batch and made something worse:

    | Applied uniformly | Outcome |
    |---|---|
    | The four-part scope-boundary assertion shape | Held in the 10 cases it was derived from; its "states the boundary" slot then failed in **both** arms in 9 of 11 new cases, and 12 of 22 instances were retired |
    | "Move the handoff into the step the prompt enters", to 6 skills at once | Worked on 5; on the 6th it cost a 9/9 row four assertions and was reverted |
    | A control-vector signature predicting which recorded gains were posture-inflated | Selected 16 rows of which 8 moved, missed **both** of the two total collapses, and its 2 designated validation rows split 1-1 |

    **So derive the pattern, then confirm it small.** Apply a new authoring or
    assertion pattern to 3-4 cases rather than 12; include a guard row for any skill
    whose other cases share the prose being edited; read the per-row result before
    authoring the next batch. A pattern holding on 3 of 4 is worth continuing; one that
    costs a strong row on its first outing is worth stopping.

    **And a pattern that fails on a skill is telling you about that skill.** The cases
    where the boundary assertion still discriminates are the ones whose split is crisp
    enough to name; the skills where it does not are doing something more entangled.
    Record which skills a pattern does not fit, and why, instead of forcing them into it.

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
  catalog: "<abs>/catalog.json",
  cases: <the .cases array of evals/routing-dataset.json>,
  k: 3 }})
```

The cases go in `args`, not as a path: each agent gets its developer message inline
and reads only the catalog. The dataset carries every case's accept set beside its
prompt, so an agent sent to read it would route with the answer in hand.
`node evals/check-red-leaks.mjs <run-dir>` reports a routing agent that opens
anything but the catalog, and fails the run if it opened a routing dataset,
baseline or held-out file.

CI: `.github/workflows/routing-evals.yml` runs `--check-dataset` (offline) then
`--run --changed -k 3` on PRs touching `skills/`, `catalog.json`, or
`evals/routing*`, gating on regression vs the baseline (skipped, not failed, when
the API key is absent — like `skill-evals.yml`).

### Results (haiku) and the haiku recommendation

Full run on `claude-haiku-4-5` over the 138-case dataset (2026-09, 66-skill
catalog), recorded at **k=3**: three independent samples per case, majority route,
all three votes stored in `evals/routing-baseline.json`. Every case was re-recorded
in this run and nothing was carried forward.

| Layer 2 metric | Result (k=3) |
|---|---|
| Top-1 routing accuracy (positives) | **64/65 = 0.985** |
| Boundary pass rate ("no wild misroute") | **64/65 = 0.985** |
| False-activation rate (trivial → NONE) | **0/8 = 0.00** |
| Confusion pairs | `verification-before-completion → git-workflow`, `project-documentation → release-management` |

Layer 3 (behavioral, 16 cases, one sample each): router-invocation rate **1.00**
(8/8 substantial prompts invoked a skill), correct-invoke 8/8, over-route **0/8**.

**Earlier recordings of this table read 1.00 across the board, and they are not
comparable.** The runner used to send each agent to read the dataset file to find
its prompt, and that file carries every case's accept set beside the prompt. So
those agents routed with the answer in reach. And 28 of the 138 rows had been
recorded against a prompt or accept set that has since changed. The runner now
passes each prompt inline and the agent reads only the catalog, and
`check-red-leaks.mjs` fails a run in which a routing agent opens a routing dataset,
baseline or held-out file. This run's scan was clean.

**The two misroutes.**

- `positive:verification-before-completion:1`: "…tell me it's done and commit it"
  went to `git-workflow` on the majority (votes: `code-reviewing`, `git-workflow`,
  `git-workflow`). The literal "commit it" pulls against the claim-of-done the case
  is about. This is the one split positive.
- `boundary:project-documentation:3`: "Generate a changelog from our recent git
  history. We're about to release v2.1.0" went unanimously to `release-management`,
  whose description lists changelogs and release notes. Its accept set is
  `{project-documentation, NONE}`, so the case fails. Whether the router or the
  accept set is wrong is open. The prompt is release-shaped, and
  `release-management` is a defensible owner.

**Stability.** **132/138 cases were unanimous** across the three samples, including
all 8 trivials. The six splits are the positive above and five boundary cases, all
of which resolved inside their accept set:

| Boundary case | 3 votes | Majority |
|---|---|---|
| `bug-investigating` | bug-investigating ×2, performance-optimization | bug-investigating ✓ |
| `statistical-analysis` | statistical-analysis ×2, data-quality | statistical-analysis ✓ |
| `tdd-workflow` | test-data-strategy ×2, tdd-workflow | test-data-strategy ✓ |
| `test-data-strategy` | test-data-strategy ×2, compliance-privacy | test-data-strategy ✓ |
| `verification-before-completion` | verification-before-completion ×2, plan-execution | verification-before-completion ✓ |

**What the numbers actually establish.** Positive accept sets are strict
single-skill (`{home}`, top-1 exact), so 64/65 there is a genuine signal. Only 9 of
the 65 positive prompts contain the skill's name, spaced or hyphenated; the rest
force intent inference from a scenario. The boundary result was not won on the
`NONE` escape hatch. Of the 64 passing boundary cases, none routed to `NONE`: 26
stayed home and 38 chose a named sibling. The router made real discriminations
against a ~60-skill wrong-answer space. Since the previous recording, 27 of the 65
boundary prompts were rewritten, most of them so that the listing alone does not
settle the owner.

> **Positive top-1 routing is correct on 64/65, with 64 of 65 unanimous; trivial
> rejection is stable (8/8, unanimous NONE); boundary prompts misroute once in 65,
> and 5 of the 65 are split within their accept set.**

**Known limitations (what this does *not* prove).** Coverage is one positive
+ one boundary prompt per skill, all mined from each skill's own `evals.json` and
written by the same hand as the descriptions — so this measures routing on
author-anticipated phrasings, not held-out or adversarial ones (a mild
teaching-to-the-test risk), and a skill can ace its single prompt yet misroute on
paraphrases. Boundary accept-sets include `NONE` by construction. The independent
held-out set below probes this: 155/162, with every miss a terse completion claim.

Boundary routes worth knowing: `notebook-to-production` → `ml-pipeline-design`,
`ml-pipeline-design` → `data-quality`, `rollback-strategy` → `incident-response`,
and `refactoring` → `technical-debt-review`, all unanimous.

(`routing-baseline.json` is this k=3 run, so every case gates on a majority of three
samples, like the content baseline's k>=3 rows. A single sample can't be told apart from a coin flip, and that
was the reason to lift it. An earlier, smaller-catalog baseline scored only a 0.75
layer-3 invocation rate; this run clears layer 3 at 8/8.)

**Haiku recommendation: keep haiku.** Top-1 accuracy of 64/65, one boundary
misroute, and zero false activations across the full 66-skill catalog, at k=3, say
haiku is adequate for this routing task, and nothing argues for sonnet.
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
(0 of the original 92 paraphrases contained an own-trigger phrase when written). Same
`{ id, kind, skill, prompt, accept[] }` shape; the authoring category is encoded in
the `id` prefix.

**The file holds 162 cases:**

- **101 paraphrase positives**, restating each routable skill in a foreign register,
  with `accept = {home}` (strict top-1). Nine of them are terse completion claims
  meant for `verification-before-completion`.
- **25 confusables** across 7 adjacent clusters: `data-modeling`↔`api-design`;
  `ml-pipeline-design`↔`data-pipeline-design`↔`notebook-to-production`;
  `security-audit`↔`threat-modeling`↔`compliance-privacy`;
  `bug-investigating`↔`code-reviewing`↔`project-review`;
  `incident-response`↔`rollback-strategy`↔`resilience-engineering`;
  `brainstorming`↔`prd-writing`↔`feature-planning`; and
  `code-slop-cleanup`↔`refactoring`. Each has a single gold where decidable, and
  6 are two-skill boundary accepts where genuinely ambiguous.
- **18 scope/negation traps**, which name one skill's keywords but belong
  elsewhere or to `NONE`.
- **18 harder trivials**: conversational or factual prompts carrying domain
  keywords, which should route to `NONE`.

Run key-free via the Workflow tool at k=3 (majority of 3 independent haiku
samples), the in-session sibling of the mined runner:

```
Workflow({ scriptPath: "evals/routing-heldout-runner.mjs", args: {
  catalog: "<abs>/catalog.json",
  cases: <the .cases array of evals/routing-heldout.json> }})
```

**Result (`claude-haiku-4-5`, k=3, 2026-09, 162 cases, 486 route agents, clean
leak scan):** paraphrase **94/101**, confusable **25/25** (every cluster separated,
zero confusion), trap **18/18**, trivial **18/18**, false activation **0/23**, and
**159/162 unanimous**.

**All seven misses are terse completion claims meant for
`verification-before-completion`.** Examples: "Let's commit and move on" →
`git-workflow`; "The fix is in. Ship it." → `release-management`; "All set on my
end, go ahead and close this out" → `NONE`, read as a conversational closing. The
one such prompt that asks for the work to be proved routes correctly. This is the
same miss as the mined suite's `verification-before-completion` positive, and it
is the open routing finding.

An earlier record reported a perfect sweep on the then-150-case set, made with a
runner that let agents read the accept sets. On those same 150 cases this run is
also 150/150 and unanimous, so that sweep holds up without the answer key in
reach. Every miss is among the 12 cases added since, which had never been routed.
Two of the six boundary cases now land on their second accepted skill rather than
the intended primary. Honest limits: this is still a single-evaluator set with
pre-decided golds and one or two paraphrases for most skills, so it *lowers*, not
eliminates, the generalization risk. Full write-up:
`evals/routing-heldout-results.md`.

This probe is a **periodic manual generalization check, not a CI gate** — held-out
prompts are meant to find edges (a hard gate would be noisy), and ~490 agents/run
is too expensive per-PR. Unlike `routing-dataset.json` it is **hand-authored, not
generated**, so it is deliberately **not** wired into `--build-dataset` /
`--check-dataset` and does **not** touch `routing-baseline.json` (the committed
gate stays the mined 138-case k=3 run).

### TDD loop for routing (RED → GREEN)

A misroute is a RED. The fix is almost always a **catalog description** edit
(disambiguate keywords / when-to-use) — edit the skill's `SKILL.md` frontmatter,
`node scripts/build-plugins.mjs` to regenerate `catalog.json`, then re-run the
routing eval until GREEN. This is the `writing-skills` baseline→counter loop with
routing accuracy as the metric; descriptions are the shared tuning surface for both
routing (the catalog) and direct auto-trigger, so one improvement pays twice.

The committed baseline has **two live REDs**, listed under Results above:
`verification-before-completion`'s positive and `project-documentation`'s boundary.
Neither has been worked through this loop yet. Exercising the loop synthetically (degrade one skill's
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
