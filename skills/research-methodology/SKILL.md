---
name: research-methodology
description: "Run DS/ML research with defensible claims — framework and rigor, data understood before claims, method decision records, claims traced to evidence, sources verified, and the write-ups that report them. An experiment or results write-up, even a README, is here, not project-documentation. Production serving → ml-model-deployment."
when_to_use: "Triggers: research project, thesis, plan the research track, is this finding solid, can I claim this, why this method, literature review, verify these sources, deep research citations, write up the results, experiment README, I can't follow these findings."
---

# Research Methodology

Research differs from feature work in one way that changes everything: the
output is a **claim**, and a claim is only as good as the trail behind it. The
data was understood, the method was chosen for stated reasons, the experiment
was defined before its result, the number traces to the code and data that
produced it, and the sources say what they're cited for.

This skill does not impose a structure. The user picks the framework and how
much rigour the work needs. What it holds fixed are the four rules below,
because each one, skipped, has produced a claim that had to be withdrawn.

## ⛔ The Iron Law

**No claim leaves the project — into a thesis, a report, a decision — without
its trail: the data behind it understood, the method behind it decided on the
record, the number traced to what produced it, the sources resolved.**

A striking result is the one that most needs the trail. "We'll add it in the
next revision" is how an unchecked claim survives into the final text.

## Workflow

### Step 1: Agree the Framework and the Rigor

Check the project's working agreement for a Methodology section. If there is
none, offer options with a recommendation — don't impose one:

- **CRISP-DM** (the default recommendation): business understanding → data
  understanding → data preparation → modeling → evaluation → deployment, iterated.
  Its data-understanding phase before modeling is the step research most often skips.
- **TDSP** (Microsoft's Team Data Science Process): similar loop, adds roles and
  standard documents; fits a team with a client.
- **The user's own**, written down in a few lines.

And the **rigour level**: thesis or publication grade (every claim registered,
sources resolved to their identity), or internal and exploratory (claims marked
provisional, lighter citation). The user sets it; record it.

Write the choice into the working agreement's Methodology section (create the
agreement via `working-agreement` if the project has none), along with where
experiments, method decisions and claims live — see
[templates/traceability.md](templates/traceability.md).

**This step is not a gate on delivering.** Plan under the recommended framework
and state it — *"Planned under CRISP-DM at `<rigour>`; say if you'd rather use
another"* — then carry the plan in the same response.

### Step 2: Understand the Data Before Any Claim

**Invoke `exploratory-data-analysis`** before any result is interpreted, and
plan it as the first item of the track, not an afterthought. Running a benchmark
early to smoke-test the pipeline is fine; reading meaning into its numbers before
this step is not. For research it must cover:

- **Which source is authoritative** — the curated table, not the raw one it was
  built from. Read how it is produced (`code-archaeology` for the pipeline).
- **How reliable each field is** — validated measurement, or informational
  (an estimate, a free-text note, a field only some forms collected).
- **The distribution of every variable a claim will be split by.** A gap between
  two groups means little if one group has 30 members.
- **What the reference data covers and doesn't.** A survey that lists some
  households in some places makes every detection elsewhere look like a false
  positive: precision against it is a lower bound for the surveyed area, not a
  property of the method.

### Step 3: Decide Methods on the Record

Every choice that shapes a result — algorithm, matching rule, threshold, metric,
validation design — gets a **method decision record**
([templates/method-decision-record.md](templates/method-decision-record.md)):
the candidates, the evidence for each, the criteria, the decision, and the
alternatives worth trying later. "DBSCAN is standard" is a reason to list it, not
to choose it.

Include **instrument validity**: was the tool, model or product built and
evaluated for the variable you're about to report on? A building detector says
nothing reliable about roof material unless someone measured that. If it wasn't,
a result about that variable describes the instrument, not the world.

### Step 4: Define Each Experiment Before Its Result

Before running: hypotheses, primary metric, operating point, decision rule, and
which method decisions it rests on. Log and compare runs per
`ml-experiment-tracking`; choose tests, intervals and multiple-comparison
handling per `statistical-analysis`. A change after results exist is an
**amendment**: label it as one, with the reason.

### Step 5: Trace Every Claim

Each number that may be quoted goes in a claims register
([templates/claims-register.md](templates/claims-register.md)): the claim in
words, its scope (area, population, product, period), the experiment, the
commit and data version that produced it, and its status — provisional,
supported or withdrawn.

Write findings at the strength the evidence has:
- **Measured** — "recall was 0.41 (n = …, 95% CI …) for straw-and-mud roofs
  against 0.78 for chapa, in the surveyed area": state it.
- **Explained or generalized** — "the product under-detects traditional roofs":
  only after Step 2's distributions, Step 3's instrument check and the
  confounders are done. Until then it is a provisional observation, worded as one.

**Write each artifact for a reader who wasn't in the session.** An experiment
README, a results section or a method record is read later by the project owner,
with nothing else open, and must make the work clear without the notebook or the
code:
- **Open with what was found, in plain words**, and what it changes. Provenance
  (commit, data version) follows the summary; it doesn't lead.
- **Say what was run**, in a few lines: what it modelled or predicted, on which
  data, the method and its settings (algorithm, hyperparameters, thresholds), and
  why that method, with a link to its method decision record. Metrics without the
  run behind them can't be read. If the material doesn't say, ask; don't leave it out.
- **Keep each question, its result and what it means for the project together**,
  in the same row or paragraph, not a table followed by a separate list of
  implications.
- **Link shared vocabulary; spell out the rest.** Glossary terms, the methodology
  and other project-wide definitions have one home: link to it rather than
  restating it. Shorthand with no home (a notebook symbol, a step code, a decision
  named by date) is written out, or asked about.
- **Revising a dense document adds what the work is missing.** Replacing a
  repeated definition with a link is fine; cutting what was done or what it means
  is not. Pre-registered text stays verbatim.
- Don't add qualifiers the output doesn't carry, such as a CI level or a test name.

Under deadline, write the supported part now and mark the rest provisional. The
minimal check a striking subgroup claim needs (group counts, per-group metric
with intervals, one confounder cross-tab) is usually an hour, not a revision.

### Step 6: Verify Sources

Every source that carries a claim passes the identity rule in
[references/source-verification.md](references/source-verification.md): it
resolves to a DOI, arXiv ID, ISBN with chapter, standard, or versioned page, and
the quoted text is in a captured copy, not a search summary. Run this as an
audit over any deep-research report before its citations are reused. Scale it
to the rigour set in Step 1, and apply the same test to tools: a library or
product the method depends on must be maintained and widely used, checked per
`dependency-management`.

## Rationalizations to Reject

| Excuse | Reality |
|--------|---------|
| "The result is striking; the EDA can come later" | Striking subgroup results are the likeliest to be small-n noise or skewed labels. The check is small; the retraction isn't. |
| "We'll add the data description in the next revision" | The claim gets written now and survives into the final text. Write it at the strength the data supports today. |
| "DBSCAN / U-Net / X is the standard method" | Standard is a reason to list it as a candidate. Record what else was considered and why it lost. |
| "The product is state of the art" | For what task? A detector evaluated on building presence hasn't been evaluated on roof material. |
| "Low precision means the method is poor" | Against an incomplete reference, unmatched detections include real objects nobody surveyed. Bound it to the surveyed area. |
| "The deep-research report already has citations" | Its citations are claims about sources. Resolve each one before reusing it. |
| "We need the 1977 original for every citation" | Not for established results: a trusted later work that states them is enough. Chase the original when the claim is contested or load-bearing. |

## Red Flags — Stop and Check

- A results section exists and no EDA of the labels does.
- A method appears in code with no record of why it was chosen.
- A claim is stratified by a variable whose group sizes nobody has looked at.
- An experiment's decision rule was written after its result.
- A number in the draft can't be traced to a commit and data version.
- A citation points at a blog, a summary page, or a search snippet.

## Cross-Skill References

- **`exploratory-data-analysis` — invoke it in Step 2, before the first result
  is interpreted.** This skill still decides which claims wait on it; EDA does
  the profiling.
- `statistical-analysis` — tests, intervals, power and multiple comparisons for
  each experiment.
- `ml-experiment-tracking` — logging, comparing and reproducing runs.
- `working-agreement` — holds the Methodology section and the rest of how the
  project runs (where status lives, session routines).
- `plan-execution` — works through the research plan checkpoint by checkpoint.
- `code-archaeology` — traces how a curated dataset is produced from raw inputs.
- `notebook-to-production` and `ml-pipeline-design` — when exploratory code
  becomes a pipeline others rely on.
- Out of scope: serving a model in production → `ml-model-deployment`.
