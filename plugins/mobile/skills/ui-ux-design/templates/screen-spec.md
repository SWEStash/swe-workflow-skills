# Screen Specification Template

```markdown
# Screen: [Screen Name]

**Feature**: [Parent feature or flow]
**Route**: `/path/to/screen`
**Last updated**: [YYYY-MM-DD]

## Purpose

[One sentence: what the user accomplishes on this screen.]

## User Flow Context

**Arrives from**: [Previous screen or entry point]
**Primary action leads to**: [Next screen]
**Secondary exits**: [Other possible destinations]

## Content Hierarchy

1. [Most important element — e.g., Page title + primary data]
2. [Second most important — e.g., Key actions]
3. [Supporting information — e.g., Details, metadata]
4. [Tertiary — e.g., Related content, navigation]

## Layout

```
┌──────────────────────────────────────────┐
│ [Header / Navigation]                     │
├──────────────────────────────────────────┤
│                                          │
│  [Primary Content Area]                  │
│  - [Main data display]                   │
│  - [Primary action button]              │
│                                          │
│  [Secondary Content]                     │
│  - [Supporting details]                  │
│  - [Related items]                       │
│                                          │
├──────────────────────────────────────────┤
│ [Footer / Secondary actions]             │
└──────────────────────────────────────────┘
```

## States

### Loading
[What the user sees while data loads — skeleton, spinner, or cached content]

### Empty
[What the user sees when there's no data — illustration, message, CTA]
- Message: "[Friendly message explaining why it's empty]"
- CTA: "[Action to create first item]"

### Loaded (primary)
[The normal state with data present]

### Error
[What the user sees when data fetch fails]
- Message: "[User-friendly error message]"
- Action: "[Retry button, contact support link]"

### Partial / Loading More
[If data loads incrementally — what shows while more is loading]

## Interactive Elements

### [Element Name, e.g., "Create Button"]
- **Action**: [What happens on click/tap]
- **Feedback**: [Loading state, success message, error handling]
- **Validation**: [If applicable — what's validated and when]

### [Element Name, e.g., "Search Input"]
- **Behavior**: [Debounced search, filters, autocomplete]
- **Empty results**: [Message when no results match]

## Responsive Behavior

| Element | Mobile (< 640px) | Tablet (640-1024px) | Desktop (> 1024px) |
|---------|------------------|--------------------|--------------------|
| Layout | [e.g., Single column] | [e.g., Two columns] | [e.g., Sidebar + main] |
| Navigation | [e.g., Bottom tabs] | [e.g., Collapsed sidebar] | [e.g., Full sidebar] |
| Data display | [e.g., Cards] | [e.g., Cards] | [e.g., Table] |
| Actions | [e.g., FAB button] | [e.g., Inline buttons] | [e.g., Toolbar] |

## Accessibility Notes

- [Keyboard navigation requirements]
- [Screen reader announcements for dynamic content]
- [Focus management after actions]

## Open Questions

- [ ] [Unresolved design decision]
```
