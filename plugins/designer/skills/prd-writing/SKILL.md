---
name: prd-writing
description: "Write lightweight agile PRDs and technical RFCs that align stakeholders before implementation. Triggers: PRD, product requirements, RFC, request for comments, technical design doc, design document, tech spec, write requirements, what are we building, spec this out. Produces the WHAT and WHY — feature-planning handles HOW."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# PRD & RFC Writing

Write lightweight requirements and design documents that align stakeholders without drowning in waterfall-style documentation. In agile, these documents are living artifacts — concise enough to write quickly, clear enough to prevent misalignment.

## Two Document Types

### Agile PRD (Product Requirements Document)
**Audience**: Product, design, engineering, stakeholders
**Purpose**: Define WHAT to build and WHY, from the user's perspective
**When**: Before starting a significant feature or epic (more than a sprint of work)

### Technical RFC (Request for Comments)
**Audience**: Engineering team, tech leads, architects
**Purpose**: Propose HOW to build something technically, gather feedback before committing
**When**: Before implementing non-trivial technical work (new service, data migration, architecture change)

Many features need both: a PRD from the product side and an RFC from the engineering side. Some only need one.

## Workflow: Agile PRD

### Step 1: Start with the Problem

Every PRD begins with a crystal-clear problem statement:

- What user pain or business need does this address?
- Who specifically has this problem? (Define the persona)
- How big is this problem? (Frequency, severity, number of users affected)
- What do users do today to work around it?

If you can't articulate the problem, you're not ready to write requirements.

### Step 2: Define Goals and Non-Goals

**Goals**: What this project will achieve (tied to metrics when possible)
**Non-goals**: What this project explicitly will NOT do (prevents scope creep)

Non-goals are just as important as goals. They're the guardrails that keep the project focused.

### Step 3: Write User Stories

Express requirements as user stories:

```
As a [user persona],
I want to [action/capability],
so that [benefit/outcome].
```

Group stories by priority using MoSCoW:
- **Must have**: Project fails without these
- **Should have**: Important but not launch-blocking
- **Could have**: Nice to have if time allows
- **Won't have (this time)**: Explicitly deferred

### Step 4: Define Acceptance Criteria and Constraints

For each must-have story, define acceptance criteria (use feature-planning's Given/When/Then format).

Document constraints: performance requirements, accessibility requirements, platform support, backwards compatibility, regulatory compliance.

### Step 5: Include Design Context

If mockups, wireframes, or user flows exist, link them. If not, describe the intended user experience in enough detail that a designer can start.

### Step 6: Produce the PRD

Use the template at [templates/prd.md](templates/prd.md). Keep it under 3 pages. Link to detailed resources rather than embedding everything.

## Workflow: Technical RFC

### Step 1: State the Problem and Context

Same discipline as the PRD — start with why, not what. Include:
- What triggered this RFC (feature requirement, scaling issue, tech debt)
- Current state of the system
- Constraints (timeline, backward compatibility, team expertise)

### Step 2: Propose the Solution

Describe the technical approach clearly. Include:
- High-level architecture or design
- Key components and their interactions
- Data model changes (link to `data-modeling` if needed)
- API changes (link to `api-design` if needed)

### Step 3: Present Alternatives

List 2-3 alternatives considered with tradeoffs. This proves you've thought beyond the first idea.

### Step 4: Identify Open Questions

List questions that need answering during or after the review process. This invites targeted feedback.

### Step 5: Produce the RFC

Use the template at [templates/rfc.md](templates/rfc.md). Circulate for review with a clear deadline.

## Principles Applied

- **Agile over waterfall**: These documents are living drafts, not contracts. Update as understanding evolves.
- **KISS**: If it takes more than an afternoon to write, the scope is too large — split it.
- **Working software over comprehensive documentation**: Write just enough to align. The code is the real spec.
