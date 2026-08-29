---
name: feature-planning
description: "Break features into well-scoped tasks with acceptance criteria, risk assessment, and dependency mapping. Triggers: plan this, break this down, scope this feature, create tasks for, sprint planning, how should I implement this feature, user stories, acceptance criteria, dependency mapping, feature breakdown. Creates the plan — executing an already-approved plan checkpoint by checkpoint → plan-execution."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Feature Planning

Guide the user through transforming a feature idea or requirement into a structured, actionable implementation plan. The goal is a plan that a developer (or Claude Code) can pick up and execute with minimal ambiguity.

## Workflow

### Step 1: Understand the Feature

Ask clarifying questions to close knowledge gaps. Focus on:

- **What problem does this solve?** (user pain, business value)
- **Who is the user?** (persona, role, access level)
- **What exists today?** (current behavior, workarounds)
- **What are the constraints?** (timeline, tech stack, backwards compatibility)
- **What's out of scope?** (explicitly define boundaries)
- **How will we know it works?** (what verification and test coverage this needs)

**This step is not a gate on delivering.** Whether you draft now or ask first is
a condition, not a preference. Apply this test:

> Can you write at least one Given/When/Then acceptance criterion **without
> inventing the feature's core behavior?**

- **Yes → draft now.** The remaining unknowns are assumptions, not blockers:
  state them and carry the full plan **in the same response**. A draft the user
  corrects beats a question they must answer. ("Email and in-app notifications
  when someone comments on their posts" passes — the behavior is given.)
- **No → ask first**, and say what you'd need to start drafting. A named stack
  plus a feature label is not enough on its own: "add dark mode to our Vue app"
  and "add authentication" both fail the test, because the core behavior
  (persistence? system-preference default? which auth methods, which protected
  resources, which roles?) would have to be invented rather than planned.

**Exit condition for the draft branch** — one line, then keep going in the same
response: *"Planning under these assumptions: `<…>` — correct any and I'll
revise."*

Never answer a planning request with questions alone when the draft branch
applies. Unanswered questions belong in Step 5's open-questions list, not in
place of the plan.

### Step 2: Define Acceptance Criteria

For each user-facing behavior, write acceptance criteria using the Given/When/Then format:

```
Given [precondition]
When [action]
Then [expected outcome]
```

Aim for 3-7 acceptance criteria per feature. Each criterion should be independently testable.

### Step 3: Break Down into Tasks

Decompose the feature into implementation tasks. Each task should:

- Be completable in one focused session (roughly 1-4 hours of work) — state each task's estimate on the task itself, so granularity is visible rather than asserted
- Have a single clear deliverable (a file, a test, a migration, etc.)
- Follow dependency order (what must exist before this task can start)
- Be independently verifiable

Use this structure for each task — see [templates/task.md](templates/task.md).

### Step 4: Map Dependencies

Identify and visualize dependencies between tasks:

- **Hard dependencies**: Task B literally cannot start until Task A is done
- **Soft dependencies**: Task B benefits from Task A but could start in parallel
- **External dependencies**: Waiting on APIs, design assets, or decisions

Present dependencies as an ordered list or ASCII diagram showing the critical path.

### Step 5: Identify Risks and Open Questions

Flag anything that could derail the plan:

- **Technical risks**: Unproven technology, complex integration, performance concerns
- **Scope risks**: Feature creep indicators, ambiguous requirements
- **Dependency risks**: External team blockers, API availability

For each risk, suggest a mitigation strategy or a spike task to reduce uncertainty.

### Step 6: Produce the Plan

Output the complete plan using the template at [templates/plan.md](templates/plan.md) — in the reply itself, not as a promise to produce one. Offer to save it as a markdown file in the project (e.g., `docs/plans/feature-name.md`); saving is a convenience, not the deliverable.

## Principles Applied

- **YAGNI**: Only plan what's needed now. Flag nice-to-haves separately.
- **KISS**: Prefer the simplest approach that meets acceptance criteria.
- **Functional Independence**: Each task should touch a single concern when possible.
- **Testability**: Every task should specify how to verify it's done.

## When to Go Deeper

If the feature involves architectural decisions (new services, database changes, API design), suggest using the `architecture-design` skill before finalizing the plan.

If the feature requires data model changes, suggest using the `data-modeling` skill for that portion.

If the idea itself is still fuzzy — the user is exploring what to build rather than how — run `brainstorming` first; this skill converges, that one diverges.

Once the plan is approved and execution begins, the `plan-execution` skill takes over: checkpointed batches, verification evidence per checkpoint, and drift-triggered re-planning (which loops back here).
