# Feature Plan Template

```markdown
# Feature: [Feature Name]

**Date**: [YYYY-MM-DD]
**Author**: [Name]
**Status**: Draft | In Review | Approved

## Summary
[2-3 sentences: what this feature does and why it matters]

## Problem Statement
[What user pain or business need does this address?]

## Scope

### In Scope
- [Bullet list of what's included]

### Out of Scope
- [Bullet list of what's explicitly excluded]

## Acceptance Criteria

1. Given [precondition], When [action], Then [outcome]
2. Given [precondition], When [action], Then [outcome]
3. ...

## Implementation Tasks

[Ordered list of tasks using the task template]

## Dependency Map

```
Task 1 (data model) ──► Task 2 (API) ──► Task 4 (UI)
                                    └──► Task 5 (tests)
Task 3 (config) ─────► Task 4 (UI)
```

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| [Risk description] | High/Med/Low | High/Med/Low | [Strategy] |

## Open Questions
- [ ] [Question that needs answering before implementation]

## Related
- Architecture Decision: [link if applicable]
- Data Model: [link if applicable]
- Design Mockups: [link if applicable]
```
