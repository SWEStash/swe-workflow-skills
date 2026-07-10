---
name: llm-app-engineering
description: "Design and build LLM-powered applications — prompt and context engineering, RAG architecture (chunking, hybrid retrieval, reranking, grounded prompts), agent design (tool surfaces, planning, sub-agents), and memory. Triggers: build a chatbot, LLM app, AI assistant, prompt engineering, system prompt, RAG design, chunking, embeddings, vector database, semantic search, AI agent, tool calling, agent memory, context window, hallucinations. Measuring quality → ai-evaluation; model serving/inference infra → ml-model-deployment."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# LLM App Engineering

Design LLM applications as **systems, not prompts**: what goes into the context
window, what the model is allowed to do, and what happens when it's wrong. The
model is the one component you don't control — engineer everything around it.
This skill designs and builds; proving a change helped is `ai-evaluation`'s job,
and no design below is "done" until it has an eval harness.

## Workflow

### Step 1: Choose the Simplest Sufficient Architecture

Escalate only when the previous rung measurably fails:

1. **Single prompt** — the task fits in one call with instructions + input.
2. **+ RAG** — the answer needs knowledge that doesn't fit in the prompt or
   changes independently of deploys.
3. **+ Tools** — the model must act (query, search, write) — not just answer.
4. **Agent loop** — the path to the goal is genuinely unpredictable in advance.
   Most "agents" that fail are workflows that should have been a fixed pipeline
   with one or two LLM steps.

### Step 2: Engineer the Prompt as an Interface

- Structure: role and constraints → domain context → task → output format.
  Put stable content first (prompt caching) and the volatile input last.
- State what to do on failure: "if the context doesn't contain the answer, say
  so" — the unhappy path is where LLM apps lose user trust.
- Version prompts in git like code; a prompt change is a deploy and goes
  through the same eval gate (`ai-evaluation`).

### Step 3: RAG — Design Retrieval Before Generation

Most bad RAG answers are retrieval failures wearing a generation costume.

- **Chunking**: split on document structure (headings, sections, one
  ticket+resolution per chunk), not fixed character counts; attach metadata
  (source, date, product area) for filtering and citations.
- **Retrieval**: hybrid (BM25 + vector) as the default — pure vector search
  misses exact identifiers, SKUs, and error codes; filter by metadata, then
  **rerank** the candidate set (retrieve ~20–50, keep the top 5–10).
- **Context budget** (decide, don't default): how many chunks fit, in what
  order (most relevant near the question), the relevance floor below which a
  chunk is dropped, and the behavior when nothing clears it — say "I don't
  know" rather than pad the context with noise.
- **Grounding prompt**: answer only from the provided context, cite which
  source supports each claim, refuse when unsupported.

### Step 4: Agents — Design the Tool Surface and the Loop

- **Tools**: few and sharply distinct beat many and overlapping — every tool
  description competes for the model's attention on every step. Name by
  intent (`search_orders`, not `api_call`); make each tool's failure return a
  message the model can act on, not a stack trace.
- **Decomposition**: long tasks fail as one monolithic loop with 25 tools;
  split into phases or sub-agents, each with a scoped toolset, and pass
  structured summaries between them — not raw transcripts.
- **Guardrails**: cap iterations, budget tokens per task, and validate
  side-effecting tool calls (or require confirmation) — an agent retrying a
  failed write in a loop is the classic production incident.

### Step 5: Memory — Externalize State

The context window is a scarce cache, not a database. For long-horizon work:
keep a plan/scratchpad file the agent re-reads and updates; summarize or
compact stale history instead of letting it scroll off; store durable facts
(user preferences, decisions) outside the window and retrieve them like RAG.

### Step 6: Wire In Evaluation Before Shipping

Hand the design to `ai-evaluation`: a golden dataset (including unanswerable
and adversarial cases), RAG-stage metrics (retrieval vs generation scored
separately), agent task-success rate, and a CI regression gate. "The answers
feel better" is not evidence; a design without an eval harness is a prototype.

Deeper pattern detail (chunking table, reranking, memory patterns, failure
modes): [references/patterns.md](references/patterns.md).

## Principles Applied

- **KISS**: every architecture rung you skip is a class of failure you never
  have to debug. Workflows beat agents when the path is predictable.
- **YAGNI**: no vector DB before checking whether the corpus fits in the
  prompt; no agent framework before a plain loop with 3 tools fails.
- **SRP for tools**: one tool, one capability — overlapping tools force the
  model to guess, and it will guess differently each run.

## Cross-Skill References

- `ai-evaluation` — golden datasets, RAG metrics, judges, eval gates (the
  measurement half of every step above)
- `ml-model-deployment` — serving, monitoring, and drift once the app ships
- `api-design` — the contract around the LLM feature (streaming, errors, timeouts)
- `security-audit` — prompt injection, data exfiltration via tools, output handling
- `architecture-design` — ADRs for costly-to-reverse choices (vector store, framework)
