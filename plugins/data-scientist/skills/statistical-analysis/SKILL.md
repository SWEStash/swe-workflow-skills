---
name: statistical-analysis
description: "Design and analyze experiments and statistical tests — test selection with stated assumptions, sample size and power, effect sizes and confidence intervals over bare p-values, and pitfall discipline (multiple comparisons, p-hacking, peeking/optional stopping). Owns experiment statistics generally; live A/B evaluation of AI/LLM apps (quality metrics, judges, feedback) → ai-evaluation."
when_to_use: "Triggers: hypothesis test, t-test, chi-square, p-value, statistical significance, confidence interval, sample size, power analysis, design an experiment, A/B test, multiple comparisons, is this difference real."
model: opus
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Statistical Analysis

Get the statistics of a question right — the test, its assumptions, the
uncertainty, and the traps — so a decision rests on evidence rather than on a
lone p-value. The deliverable is a decision-ready answer: effect size,
uncertainty, assumptions, caveats.

## Workflow

### 1. Frame the question as a hypothesis

State the null and alternative in plain words before touching data ("the new
flow's conversion equals the old flow's"). Identify the unit of analysis
(user? session? order?) — mismatching it with the randomization unit silently
breaks independence.

### 2. Design before data (when the experiment hasn't run yet)

- Choose the primary metric and **pre-register it** — one primary, the rest
  explicitly secondary/exploratory.
- Compute **sample size from power**: minimum detectable effect worth acting
  on, α (typically 0.05), power (typically 0.8). Run until n is reached —
  don't stop early on a good-looking result.
- Randomize at the unit you'll analyze; check the split is balanced on key
  covariates.

### 3. Choose the test and state its assumptions

Match the test to the data (two proportions → two-proportion z-test / χ²;
means → t-test or its nonparametric fallback; counts → Poisson/χ²; paired data
→ paired tests). **Always state the assumptions and check the ones you can**:
independence of observations (the usual casualty — repeated measures per user,
network effects, shared fixtures), adequate counts for normal approximations
(rule of thumb: ≥10 successes and failures per arm), variance assumptions for
t-tests. If an assumption fails, switch tests rather than pretending.

### 4. Report effect size and interval, not a verdict

Work the actual numbers. Report the effect (absolute and relative difference)
with a **confidence interval**, and the p-value as supporting detail — never a
bare "significant/not significant". The CI is what the decision needs: a CI of
[+0.1%, +1.7%] and a CI of [+0.8%, +1.0%] are both "significant" and mean very
different things.

### 5. Run the pitfall gate

Before reporting anything, check:

- **Peeking / optional stopping**: was n fixed in advance? Repeatedly testing
  as data arrives inflates false positives badly. If peeking happened, say so
  and treat the result as suggestive (or use sequential methods designed for it).
- **Multiple comparisons**: k tests at α=0.05 ≈ k/20 false positives expected.
  Correct (Holm/Bonferroni for strict control, Benjamini-Hochberg FDR when many
  metrics), and label post-hoc findings as exploratory — they are hypotheses
  for the *next* experiment, not wins from this one.
- **Subgroup fishing**: subgroup effects found after the fact need the same
  exploratory label and a confirmatory follow-up.
- **Survivorship / selection**: does the analyzed sample still represent the
  population the decision is about?

### 6. Translate to the decision

Distinguish statistical from practical significance: a real +0.05% lift may
not pay for the complexity; a non-significant result with a wide CI is "we
don't know yet", not "no effect". Give the ship/don't-ship framing with the
caveats attached, and say what additional data would resolve remaining
uncertainty.

## Principles

- **KISS**: a well-checked z-test beats a fancy model with unexamined
  assumptions.
- **Pre-register or label**: every metric is either declared up front or
  reported as exploratory — no third category.
- **Uncertainty is the product**: any answer without an interval is opinion
  with extra steps.

## Cross-skill boundaries

- Live A/B testing of an AI/LLM app — defining answer quality, LLM-as-judge,
  human feedback loops, eval gates → **ai-evaluation** (this skill still owns
  the underlying experiment statistics if asked).
- Generating the hypotheses to test → **exploratory-data-analysis**.
- Tracking and comparing model-training runs → **ml-experiment-tracking**.
- Defining what business metric to move → **metrics-and-okrs**.
