---
name: subagent-orchestration
description: "Decompose big or parallelizable work across subagents — when to fan out vs stay solo, scoping self-contained sub-tasks, prompting agents that don't share your context, isolating parallel edits (git worktrees), skeptically verifying and synthesizing results you didn't produce. Triggers: use subagents, parallelize this, fan out, orchestrate agents, multi-agent, spawn agents, worktree, delegate to agents, split this across agents, agent team. Sequencing checkpoints of an approved plan → plan-execution (orchestration parallelizes within its batches)."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Subagent Orchestration

Structure work across multiple agents so the result is *more* trustworthy than
one agent's pass — not just faster. The two failure modes this skill counters:
fanning out work that needed shared context (agents produce incompatible
pieces), and trusting subagent reports as if they were evidence (they're
claims). Exact tool names and mechanics vary by harness and move fast — apply
these principles through whatever agent-spawning surface is available.
Boundary: `plan-execution` sequences an approved plan's checkpoints;
orchestration is *how a batch* gets executed when it parallelizes.

## Workflow

### Step 1: Decide Fan-Out vs Solo — Honestly

Fan out when the work is **divisible into independent pieces** (per-file
migration, multi-angle research, review dimensions), when you need
**independent perspectives** (adversarial verification, judge panels), or when
the reading wouldn't fit one context (broad audits). Stay solo when the task
needs **one coherent design voice** (an API's shape, a refactor's structure),
when pieces are tightly coupled, or when the task is small — orchestration has
overhead, and a fleet of agents building a feature without shared design
produces expensive incoherence. Sub-agents also can't ask you clarifying
questions mid-flight: ambiguity you'd resolve interactively must be resolved
*before* the fan-out.

### Step 2: Decompose into Self-Contained Tasks

Each sub-task needs: a **crisp goal** with a definition of done, **explicit
inputs** (files, constraints, conventions), **no shared mutable state** with
its siblings, and an **output contract** (exactly what to return, in what
form). If two tasks keep needing to talk to each other, they're one task —
re-cut the boundaries. Interfaces first: when pieces must fit together, fix
the contract between them *yourself, up front*, and hand each agent the
contract rather than hoping parallel guesses converge.

### Step 3: Prompt for a Cold Start

The subagent knows nothing you don't say — none of your conversation, your
constraints, or your taste. State the context it needs (or say exactly which
files to read first), the conventions to follow, the boundaries ("do NOT touch
X"), and the output contract. Ask for **raw findings and artifacts** (data,
diffs, file paths, failure output) rather than summaries — you need material
you can verify, not reassurance. A vague prompt costs a full agent-run to
discover; read your prompt as a stranger before sending it.

### Step 4: Isolate Parallel Writers

Agents editing the same working tree concurrently corrupt each other. Reads
parallelize freely; **writes need isolation** — one writer per area, or git
worktrees (each agent on its own branch/copy, merged deliberately afterward).
Budget for the merge: parallel edits that touch shared files turn saved
wall-clock into conflict resolution. If the merge looks expensive, re-cut
Step 2 along file boundaries instead.

### Step 5: Verify Like You Didn't Write It — Because You Didn't

A subagent's "done, tests pass" is a report, not evidence
(`verification-before-completion` applies with extra force). Run the proving
command on their artifact yourself; spot-read the diff (`code-reviewing` for
substantial changes). For *findings* (bugs, research claims), use structure:
**adversarial verification** (a second agent prompted to *refute* each
finding), **diverse lenses** (verifiers checking different failure modes beat
N identical passes), and majority voting where individual judgments are noisy.
Expect and discard duplicates and false positives from parallel finders —
that's normal yield, not failure.

### Step 6: Synthesize — the Step That Makes It One Answer

Merging results is real work you own: dedup overlapping findings, reconcile
contradictions (two agents asserting opposite things means *you* investigate,
not average), integrate parallel diffs and re-run the full suite on the
combined result, and write the coherent summary. The whole was your task; the
agents only did the parts. Close with a completeness check: did every
sub-task actually complete, and what fell between the cracks of the
decomposition?

## Principles Applied

- **Decomposition quality bounds output quality**: bad task boundaries can't
  be fixed by more agents.
- **Reports aren't evidence**: verify artifacts, adversarially where stakes
  warrant — trust is for people, not processes.
- **Parallelize reads freely, writes deliberately**: isolation is cheap before
  the fan-out and expensive after.

## Cross-Skill References

- `plan-execution` — the checkpoint discipline; orchestration executes its batches
- `feature-planning` — producing the task breakdown worth parallelizing
- `verification-before-completion` — the evidence gate applied to every agent's claim
- `code-reviewing` — reviewing substantial subagent diffs before integration
- `git-workflow` — branch/merge hygiene for worktree-isolated work
