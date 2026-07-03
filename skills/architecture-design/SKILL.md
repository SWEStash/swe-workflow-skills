---
name: architecture-design
description: "Guide architectural and structural decisions using Architecture Decision Records (ADRs) — new services, pattern choices, database selection, component boundaries, state management, costly-to-reverse decisions. Triggers: how should I architect, which pattern, design decision, should I use X or Y, system design, ADR, component design, architectural trade-off. Owns internal-structure decisions — build vs buy/adopt a vendor or OSS capability → build-vs-buy."
model: opus
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Architecture Design

Help the user make well-reasoned architectural decisions and document them in Architecture Decision Records (ADRs). Good architecture is about managing trade-offs explicitly, not finding perfect solutions.

## Workflow

### Step 1: Frame the Decision

Identify the exact decision to be made. A good architectural question is specific and scoped:

- **Too broad**: "How should I design the backend?"
- **Right scope**: "Should user authentication be a separate microservice or a module within the monolith?"

If the user's question is too broad, help narrow it by asking:
- What triggered this decision? (new feature, scaling issue, tech debt)
- What are the constraints? (team size, timeline, existing stack)
- What's the blast radius? (which parts of the system are affected)

### Step 2: Explore the Context

Understand the current state before proposing changes:

- **Current architecture**: What exists today? Read the codebase if available.
- **Quality attributes that matter**: Performance? Scalability? Developer experience? Maintainability? Deployment simplicity?
- **Team context**: Team size, expertise, on-call burden
- **Growth trajectory**: Expected scale in 6-12 months (not 5 years — YAGNI)

### Step 3: Generate Options

Present 2-4 viable options. For each option:

1. **Name it clearly** (e.g., "Separate Auth Service" vs "Auth Module in Monolith")
2. **Describe the approach** in 2-3 sentences
3. **Analyze trade-offs** against the quality attributes identified in Step 2
4. **Estimate complexity** (implementation effort, operational overhead)
5. **Identify reversibility** — how hard is it to change this decision later?

Avoid presenting a straw-man option just to make the preferred one look better.

### Step 4: Apply Design Principles

Evaluate each option through these lenses:

- **KISS**: Which option is simplest to implement and operate?
- **YAGNI**: Which avoids building for hypothetical future needs?
- **Functional Independence**: Which gives the cleanest boundaries and lowest coupling?
- **Separation of Concerns**: Which isolates responsibilities clearly?
- **DRY**: Which avoids duplication of logic or data?
- **SOLID**: Does the design respect Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion? See [references/solid-principles.md](references/solid-principles.md).
- **Clean Architecture**: Does the dependency direction point inward? Are business rules protected from infrastructure details? See [references/clean-architecture.md](references/clean-architecture.md).
- **Component boundaries**: Are components cohesive (CCP, CRP) and acyclic (ADP)? Do dependencies flow toward stability (SDP)? See [references/component-principles.md](references/component-principles.md).

Document which principles favor which option. Conflict between principles is expected — that's why it's a decision, not a formula.

See [references/principles.md](references/principles.md) for deeper guidance on applying KISS, YAGNI, coupling, and separation of concerns to architecture decisions.

### Step 5: Make a Recommendation

State the recommended option clearly, with reasoning. Structure it as:

1. **Recommendation**: Option X
2. **Primary reason**: The most compelling argument (one sentence)
3. **Key trade-off accepted**: What you're giving up and why it's acceptable
4. **Conditions that would change this decision**: Future triggers to revisit

### Step 6: Document the ADR

Produce an ADR using the template at [templates/adr.md](templates/adr.md). Save it in the project's decision log (e.g., `docs/decisions/NNN-decision-title.md`).

ADRs are immutable records. If a decision is superseded, create a new ADR that references the old one — don't edit the original.

For visual architecture documentation (system diagrams, runtime flows, infrastructure topology), see the `architecture-documentation` skill.

When the decision is whether a capability should be built at all versus bought or adopted (vendor/SaaS/OSS, TCO, lock-in, exit costs), use `build-vs-buy` — it produces the same ADR-style record, but for sourcing rather than structure.

## When to Split Decisions

If the analysis reveals multiple independent decisions bundled together, split them into separate ADRs. For example, "How should we handle caching?" might split into:
- ADR-001: Cache invalidation strategy
- ADR-002: Cache storage technology
- ADR-003: Cache warming approach
