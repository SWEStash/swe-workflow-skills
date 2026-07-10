---
name: project-proposal
description: "Write lightweight project proposals for budget approval and go/no-go decisions — problem, business case, scope, rough estimates, risks, success criteria. Triggers: project proposal, project brief, business case, budget estimate, should we build this, go/no-go, risk assessment, cost-benefit, ROI, justify this project, stakeholder approval."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Project Proposal

Write concise project proposals that help stakeholders decide whether to invest engineering resources. In agile, proposals are lightweight — enough to make an informed decision, not a 50-page waterfall spec.

## When to Write a Proposal

Not every task needs a proposal. Use this skill when:

- **Budget approval** is needed (anything over a few days of work)
- **Multiple stakeholders** need to agree before starting
- **Opportunity cost** is significant (this means NOT doing something else)
- **Risk is non-trivial** (new technology, external dependencies, data migration)
- **The idea needs defending** — someone will ask "why should we do this?"

For small features that are already in the approved roadmap, skip this and go straight to `feature-planning`.

## Workflow

### Step 1: Define the Problem

Before proposing a solution, clearly articulate the problem:

- **Who has this problem?** (Users, internal team, business)
- **What is the impact of NOT solving it?** (Revenue loss, churn, engineering time wasted, compliance risk)
- **How do we know this is a real problem?** (Data, user feedback, support tickets, competitive analysis)
- **Is this urgent or important?** Urgent means it gets worse over time. Important means it has high value when solved. Both means it's a priority.

If the user can't articulate the problem, help them clarify before proceeding. A solution without a clear problem is a feature request, not a project proposal.

### Step 2: Propose the Solution

Describe what you intend to build, at a high level:

- **Approach**: What will be built and how (1-2 paragraphs, not a detailed design)
- **Scope**: What's included and what's explicitly excluded
- **Alternatives considered**: Why this approach over 2-3 alternatives (including "do nothing")
- **Dependencies**: What does this project need that doesn't exist yet?

### Step 3: Estimate Cost and Timeline

Provide order-of-magnitude estimates (not precise):

- **Team size**: How many engineers, designers, product people?
- **Duration**: In weeks or sprints (ranges are fine: "4-6 weeks")
- **Infrastructure cost**: New services, third-party tools, cloud resources
- **Ongoing cost**: Maintenance, monitoring, support after launch

Use the `effort-estimation` skill for detailed estimation methodology. At the proposal stage, rough ranges are appropriate.

### Step 4: Assess Risks

For each significant risk, document:

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [What could go wrong] | High/Med/Low | High/Med/Low | [What we'll do about it] |

Common risk categories:
- **Technical**: Unproven technology, complex integration, performance concerns
- **Scope**: Requirements likely to change, stakeholder alignment gaps
- **Dependencies**: External teams, third-party APIs, vendor timelines
- **People**: Key-person dependency, skill gaps, team availability
- **Timeline**: Hard deadlines, competing priorities, seasonal constraints

### Step 5: Define Success Criteria

How will you know this project succeeded? Define measurable criteria:

- **Outcome metrics**: What business or user metric improves? (Conversion rate, response time, support tickets reduced)
- **Output metrics**: What gets delivered? (Feature shipped, migration completed, performance target hit)
- **Timeline**: When should we evaluate success? (30 days after launch, end of quarter)

Link to `metrics-and-okrs` skill for deeper metric design.

### Step 6: Produce the Proposal

Output using the template at [templates/proposal.md](templates/proposal.md). Keep it to 1-2 pages. If it needs more, the scope is probably too large — consider splitting.

## Principles Applied

- **KISS**: Proposals should be 1-2 pages. If you can't explain the value concisely, the project scope is too broad.
- **YAGNI**: Propose the minimum viable project. Nice-to-haves go in a "future considerations" section, not in the scope.
- **Data over opinions**: Support the business case with numbers — user count, revenue impact, time savings, error rates.
