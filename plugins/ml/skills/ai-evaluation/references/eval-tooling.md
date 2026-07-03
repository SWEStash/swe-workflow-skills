# Evaluation Tooling — Selection and Judge-Design Detail

Tool landscapes move fast; verify against each project's current docs before
committing. What follows is the decision logic, which is stable.

## Choosing the eval tool

Pick **one** primary tool. They overlap heavily; running two means maintaining
two golden-set formats and two CI integrations for no added signal.

| Tool | Shape | Choose when |
|---|---|---|
| **ragas** | Python library of RAG-specific metrics (faithfulness, answer relevancy, context precision/recall, noise sensitivity) | The system is RAG and you want the standard names for the RAG triad with minimal ceremony. Integrates with LangChain/LlamaIndex datasets. |
| **deepeval** | pytest-style framework — metrics as assertions, `assert_test(test_case, [metric])` | The team already lives in pytest and wants evals in the same runner and CI report as unit tests. Broad metric set (RAG triad, hallucination, bias, custom G-Eval rubrics). |
| **promptfoo** | Config-driven (YAML) prompt/model comparison matrix + web viewer, CLI-first | The main activity is comparing prompt variants or models side-by-side; also does red-teaming. Good for non-Python stacks (Node CLI). |
| **Roll your own** | A loop + a judge prompt + a JSON of cases | The metrics are product-specific rubrics anyway and a framework would only wrap your judge calls. Fine — the golden set and calibration discipline matter more than the harness. |

Platform suites (LangSmith, Langfuse, Braintrust, W&B Weave) bundle eval +
tracing + datasets; prefer them when the team already uses that platform for
observability — the dataset/annotation UI is the real value.

## RAG metric cheat sheet

| Failure you saw | Stage | Metric to add |
|---|---|---|
| Answer cites facts not in the docs | Generation | Faithfulness / groundedness |
| Answer is on-topic-ish but doesn't answer | Generation | Answer relevance |
| Right doc exists but wasn't retrieved | Retrieval | Context recall |
| Retrieved chunks are mostly padding | Retrieval | Context precision |
| Correct refusal expected, model answered anyway | Both | Unanswerable-set accuracy |

Debug order: retrieval metrics first. Generation metrics computed over bad
context are noise — fix recall before tuning prompts.

## LLM-as-judge bias catalog

| Bias | Symptom | Counter |
|---|---|---|
| Position | Prefers whichever answer is shown first | Randomize/swap order, judge twice, keep only consistent verdicts |
| Self-preference | Rates its own model family's style higher | Judge with a different model family than the generator |
| Verbosity | Longer answer wins regardless of substance | Instruct explicitly; normalize or cap lengths; per-criterion rubric |
| Sycophancy toward the prompt | Scores what the question implies is right | Hide metadata (which variant is "new"); blind the judge |
| Scale drift | 7/10 today ≠ 7/10 next month | Binary/3-point criteria; compare deltas on the same rubric version |

## Judge calibration procedure

1. Sample 20–30 golden cases; have a human score them with the same rubric.
2. Run the judge on the same cases (k=3 voting).
3. Compute simple agreement (percent match per criterion). Below ~80%: the
   rubric is ambiguous — tighten criteria wording, add anchored examples
   (a passing and a failing answer per criterion), re-run.
4. Re-calibrate whenever the rubric, judge model, or task distribution changes.

## Online evaluation notes

- **A/B tests**: randomize per user (not per request) for conversational
  products; pick the primary metric before launch; expect judge-metric ↔
  user-metric divergence and investigate it — it usually means the rubric is
  measuring the wrong thing.
- **Human feedback**: thumbs up/down rates are biased (angry users click more);
  use as a trend signal and a failure-mining source, not an absolute score.
- **Failure mining**: a weekly pass over flagged conversations feeding the
  golden set is the highest-ROI eval activity that exists.
