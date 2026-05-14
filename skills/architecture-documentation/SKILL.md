---
name: architecture-documentation
description: "Design and maintain architecture documentation with multi-level diagrams (C4) and docs-as-code. Triggers: architecture diagram, document the architecture, C4 diagram, system context, container diagram, component diagram, architecture docs, docs-as-code, PlantUML, Structurizr, D2, Mermaid architecture, infrastructure diagram, runtime flow. Use architecture-design for ADRs."
model: opus
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Architecture Documentation

Help the user create and maintain architecture documentation that is version-controlled, multi-layered, and useful. Good architecture docs answer "what exists and how does it connect?" — not by drawing everything, but by drawing the right things at the right abstraction level.

## Workflow

### Step 1: Assess Documentation Scope

Understand what exists and what's needed before creating anything:

- **Current state**: Are there existing diagrams, READMEs with architecture sections, or whiteboard photos? Scan the repo for `docs/`, `architecture/`, `.puml`, `.d2`, or Mermaid blocks in markdown.
- **Audience**: Who will read this? New hires need conceptual overviews. Ops teams need runtime topology. Architects need structural boundaries.
- **System complexity**: How many services, data stores, and external dependencies? This determines which abstraction levels are worth creating.

A simple monolith may only need one conceptual diagram. A distributed system with 5+ services likely needs canonical and runtime levels too.

### Step 2: Choose Abstraction Levels

Architecture documentation works at three distinct levels. Not every system needs all three — apply YAGNI.

| Level | Purpose | Answers | Stability |
|-------|---------|---------|-----------|
| **Canonical** | What exists structurally | "What are the building blocks?" | Stable — changes with architecture |
| **Runtime** | How it behaves operationally | "How does data flow? Where does code run?" | Medium — changes with deployment |
| **Conceptual** | How to explain it | "What's the mental model?" | Ephemeral — changes with audience |

**Guidelines for selection:**
- **Always start with Conceptual** — even a quick sketch helps align understanding
- **Add Canonical** when the system has multiple services, teams, or bounded contexts
- **Add Runtime** when deployment topology, data flows, or infrastructure matter for operations

See [references/abstraction-levels.md](references/abstraction-levels.md) for detailed guidance on each level, traceability rules, and the promotion model.

### Step 3: Select Tooling and Establish Conventions

Choose tools that fit the team's stack. The framework is tool-agnostic — what matters is consistent usage, not specific tools.

**Recommended defaults by level:**

| Level | Recommended Tools | Alternatives |
|-------|------------------|--------------|
| Canonical | C4-PlantUML, Structurizr DSL | Mermaid C4 extension, Ilograph |
| Runtime | D2, Mermaid | PlantUML sequence/deployment, Diagrams-as-code (Python) |
| Conceptual | Mermaid, Excalidraw | Whiteboard photos, ASCII diagrams |

**Conventions to establish:**
- **Shared vocabulary**: Create a glossary of system names. Every diagram must use these names exactly — no aliasing or renaming per diagram.
- **File naming**: Use a consistent pattern like `{level}-{scope}.{ext}` (e.g., `canonical-system-context.puml`, `runtime-checkout-flow.d2`)
- **Repository structure**: Set up `docs/architecture/` using the template at [templates/architecture-doc.md](templates/architecture-doc.md)
- **Docs-as-code**: All diagrams must be text-based, version-controlled, and reviewable in PRs

See [references/diagram-tooling.md](references/diagram-tooling.md) for tool comparison and syntax examples.

### Step 4: Create Diagrams

Work top-down — start at the highest level and add detail only where needed:

1. **System Context** (canonical): The system as a black box, showing users and external dependencies. This is the single most valuable diagram.
2. **Container diagram** (canonical): Zoom into the system — services, data stores, message brokers, frontends.
3. **Runtime views** (as needed): Data flow diagrams, sequence diagrams for key interactions, deployment/infrastructure topology.
4. **Component diagrams** (rarely): Internal structure of a single service. Only create when a service is complex enough to warrant it.

**Per diagram:**
- Define scope — one diagram, one concern
- Identify elements and relationships
- Add brief annotations explaining non-obvious connections
- Ensure traceability: every element in a detailed diagram should trace to a parent in a higher-level diagram

**Linking to decisions:** When an ADR changes architecture, reference the affected diagrams in the ADR and update them. For ADR creation, use the `architecture-design` skill.

### Step 5: Validate

Run through the validation checklist before considering documentation complete:

- [ ] All services/systems in the codebase appear in canonical diagrams
- [ ] Runtime diagrams reference only elements defined in canonical diagrams (infrastructure-only components like load balancers are exceptions)
- [ ] Naming is consistent across all diagrams and matches the glossary
- [ ] ADRs that changed architecture reference affected diagrams
- [ ] Diagrams are version-controlled and render correctly
- [ ] Conceptual diagrams are clearly labeled as non-canonical
- [ ] A new team member can orient themselves using only these docs

### Step 6: Establish Maintenance Governance

Documentation that isn't maintained becomes misleading. Define when and how diagrams get updated:

**Update triggers:**
- New service or data store added
- Service boundary changed or service split/merged
- New external dependency integrated
- ADR accepted that affects architecture (use `architecture-design` skill)

**Promotion model:** Diagrams mature over time:
```
Conceptual sketch (idea / RFC)
   ↓  proves valuable, referenced repeatedly
Runtime diagram (structured, tooled)
   ↓  represents stable structural change
Canonical diagram (source of truth)
```

**Review cadence:**
- Canonical diagrams: review quarterly or after major architecture changes
- Runtime diagrams: review when deployment topology changes
- Conceptual diagrams: no formal review — treat as disposable

## Principles Applied

- **KISS**: Start with one system context diagram. Add layers only when they serve a clear audience.
- **YAGNI**: A monolith doesn't need four C4 levels. Document what exists, not what might exist.
- **Separation of Concerns**: Each abstraction level serves a different purpose. Don't mix structural truth with runtime behavior in the same diagram.
- **DRY**: Canonical diagrams are the single source of truth for system structure. Other diagrams reference — never redefine — those elements.

## Cross-Skill References

- **architecture-design**: For making and documenting architectural decisions (ADRs). Use when a documentation effort reveals undocumented or contested decisions.
- **project-documentation**: For README, CONTRIBUTING, API docs, and other non-architecture documentation.
- **infrastructure-as-code**: For aligning runtime/deployment diagrams with actual IaC definitions.
- **containerization**: For Kubernetes-specific topology diagrams that align with actual manifests.
