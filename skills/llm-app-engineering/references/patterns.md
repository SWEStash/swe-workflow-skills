# LLM App Patterns — RAG, Agents, Memory, Failure Modes

Framework and model specifics move fast; verify against current docs. The
decision logic below is stable.

## Chunking by corpus shape

| Corpus | Chunking | Notes |
|---|---|---|
| Docs / wiki (structured) | By heading hierarchy, ~300–800 tokens, small overlap | Prepend the heading path ("Billing > Refunds") to each chunk — it disambiguates retrieval and improves citations |
| Support tickets / Q&A | One unit = problem + resolution | Don't split the pair; the resolution is useless without the problem |
| Code | By symbol (function/class), not lines | Include the file path and signature in the chunk text |
| Long prose / transcripts | Semantic or sliding window with overlap | Consider a summarize-then-retrieve layer for very long sources |
| Tables / spreadsheets | Row-group or per-table with header repeated | Naive text chunking destroys tables; test retrieval on numeric questions |

Parent-document pattern: retrieve on small chunks (precision), hand the model
the enclosing section (context). Works well for docs corpora.

## Retrieval stack, in order of leverage

1. **Hybrid search** (BM25 + vector, reciprocal-rank fusion) — the single
   biggest fix for "it can't find exact terms" (error codes, SKUs, names).
2. **Metadata filtering** — scope by product/version/date *before* similarity;
   most wrong-document retrievals are out-of-scope, not low-similarity.
3. **Reranking** (cross-encoder or LLM reranker) — retrieve 20–50, keep 5–10.
   Cheap, large precision gain.
4. **Query transformation** — rewrite conversational queries into standalone
   ones (resolve "it", merge dialogue turns); expand acronyms from a glossary.
5. Embedding model swap / fine-tune — last, and only with eval evidence.

## Agent design patterns

- **Workflow first**: prompt-chaining, routing, parallelization,
  orchestrator-workers, evaluator-optimizer — fixed control flow with LLM
  steps. An autonomous loop is the *last* resort, when the path genuinely
  can't be scripted.
- **Tool budget**: past ~10–15 tools, selection accuracy degrades; group tools
  behind a router/namespace, or split the task into phases with scoped
  toolsets.
- **Sub-agents**: use for context isolation (a research sub-agent burns 50k
  tokens, returns a 500-token summary), not for anthropomorphic org charts.
  Pass structured briefs down and structured results up — never raw history.
- **Stop conditions**: max iterations, token budget, and "no progress in N
  steps" detection. Log every trajectory; failed trajectories are eval cases.

## Memory patterns

| Need | Pattern |
|---|---|
| Within one long task | Plan/scratchpad file the agent updates and re-reads (survives compaction) |
| Across a conversation | Rolling summary of older turns + verbatim recent turns |
| Across sessions (facts) | Memory store written explicitly ("user prefers X"), retrieved like RAG |
| Team/app knowledge | The RAG corpus itself — don't duplicate it in per-user memory |

Write memory deliberately (explicit save decisions with a reason), read it
skeptically (memories go stale; verify before acting on them).

## Failure modes checklist

- **Prompt injection**: retrieved content and tool outputs are untrusted input
  — instruct the model that context is data, not instructions; sanitize/flag
  suspicious content; never let retrieved text authorize a side effect.
- **Hallucinated citations**: require quoting or IDs that are validated
  post-hoc against the actual sources.
- **Silent context overflow**: measure prompt sizes in production; truncation
  usually eats the system prompt or the earliest instructions first.
- **Cost/latency creep**: cache stable prompt prefixes, cap retrieval depth,
  and track tokens per request as a first-class metric.
- **Version drift**: pin model versions; a provider-side model update is a
  deploy you didn't approve — the eval suite (ai-evaluation) is how you notice.
