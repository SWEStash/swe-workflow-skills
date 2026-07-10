---
name: ai-evaluation
description: "Define how to evaluate ML models and GenAI/LLM apps — golden datasets, offline metrics, RAG evaluation (faithfulness, relevance, context precision/recall) with ragas/deepeval/promptfoo, LLM-as-judge design and calibration, eval regression gates in CI, online A/B and human feedback. Logging/comparing runs → ml-experiment-tracking; building the app → llm-app-engineering; general experiment statistics → statistical-analysis."
when_to_use: "Triggers: evaluate the model, eval my chatbot, RAG evals, ragas, LLM as judge, golden dataset, eval suite, is the new prompt better, hallucination rate, benchmark our AI app."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# AI Evaluation

Define **what to measure and how** for ML models and GenAI apps. Without an
evaluation harness, every prompt tweak, retrieval change, or model swap ships on
vibes — and quality silently regresses. The boundary with its neighbors:
`ml-experiment-tracking` *records and compares* runs; this skill *defines the
metrics, datasets, and judges* those runs report. `llm-app-engineering` designs
the app; this skill proves whether a change to it helped.

## Workflow

### Step 1: Pin Down What "Good" Means

Before choosing tools, write down 3–5 quality criteria in the product's terms
(answers grounded in our docs, no fabricated order numbers, resolves the ticket).
Vague goals ("high quality answers") make every later step unmeasurable. Decide
the primary metric — the one that decides ship/no-ship — before seeing results,
to avoid cherry-picking.

### Step 2: Build a Golden Dataset

Evaluate against a fixed, versioned dataset — not ad-hoc spot checks:

- **Source**: real user questions (logs, support tickets) first; synthesize from
  the corpus only to fill gaps, and have a human review synthetic cases.
- **Size**: 30–50 cases is enough to start; grow with every production failure
  (each becomes a regression case — same principle as a bug's regression test).
- **Coverage**: include the unhappy paths — questions the corpus can't answer
  (the correct behavior is refusal), ambiguous phrasing, adversarial inputs.
- **Version it** alongside the code; a metric is only comparable across runs on
  the same dataset version.

With zero labeled data, this is still not optional — bootstrap: label a few dozen
cases by hand (an afternoon), use reference-free metrics (groundedness against
the source, rubric-based judging) while the labeled set grows.

### Step 3: Choose Metrics by System Type

- **Classical ML models**: standard offline metrics vs held-out data (accuracy,
  F1, RMSE, AUC), sliced by segment — aggregate numbers hide subgroup failures.
- **RAG systems** — score the stages separately, or you can't tell whether a bad
  answer is a retrieval or a generation failure:
  - *Retrieval*: context precision / context recall (did the right chunks come back?)
  - *Generation*: faithfulness/groundedness (is every claim supported by the
    retrieved context?) and answer relevance (does it address the question?)
- **Agents**: end-to-end task success rate plus trajectory checks (right tool,
  no loops, steps within budget).
- **Reference-free** (no ground truth): groundedness against the source,
  rubric-based judge scores, and pairwise A-vs-B comparison between variants.

Pick **one** eval tool and wire it in — ragas (RAG metrics), deepeval
(pytest-style, broad metric set), or promptfoo (config-driven prompt/model
comparison). Selection detail: [references/eval-tooling.md](references/eval-tooling.md).

### Step 4: Design the Judge Deliberately

LLM-as-judge is the workhorse for GenAI evals, and an uncalibrated judge is a
random-number generator with authority. Treat the judge as a component you
design and validate:

- **Rubric, not vibes**: decompose "good" into the Step-1 criteria, each scored
  separately with a binary or 3-point scale — never a bare 1–10 overall score.
- **Known biases, known counters**: position bias (swap A/B order and re-judge),
  self-preference (judge with a different model family than the one being
  judged), verbosity bias (instruct the judge to ignore length; cap output length).
- **Reduce noise**: majority-of-k voting for important comparisons.
- **Calibrate**: score 20–30 cases with both the judge and a human; if agreement
  is poor, fix the rubric before trusting any judge-derived number.

### Step 5: Gate Changes in CI

An eval suite that runs once before launch rots immediately. Run it on every
change to prompts, retrieval, or model version — like a test suite:

- Gate on **regression vs the last accepted baseline** (metric dropped), not an
  absolute threshold — absolute judge scores drift; movement is the signal.
- Keep the CI subset small and fast (the golden set, k=1); run the full suite
  nightly or pre-release with voting.
- Log eval runs in the experiment tracker (`ml-experiment-tracking`) so results
  are comparable over time.

### Step 6: Close the Loop Online

Offline evals predict; production confirms. Once users exist: lightweight
feedback (thumbs up/down + optional reason), A/B test significant changes on the
primary metric, and mine failures — every confirmed production failure becomes a
new golden-set case (Step 2).

## Principles Applied

- **YAGNI**: 30 golden cases + one tool + one judge rubric beats a
  six-metric dashboard nobody trusts. Add metrics when a decision needs them.
- **KISS**: prefer binary per-criterion judgments over fine-grained scales —
  humans and judges both agree more on yes/no.
- **Measure movement, not absolutes**: judge scores are comparable only within
  the same dataset + rubric + judge version; gate on deltas.

## Cross-Skill References

- `llm-app-engineering` — designing the system this skill measures
- `ml-experiment-tracking` — recording and comparing the eval runs over time
- `ml-model-deployment` — online monitoring and drift detection in production
- `cicd-pipeline` — wiring the eval gate into CI
- `metrics-and-okrs` — tying eval metrics to product-level success metrics
