---
name: ui-ux-design
description: "Design user experiences from an engineer's perspective — user flows, wireframes, interaction patterns, responsive strategy, navigation, loading/error/empty states. Triggers: design the UI, user flow, wireframe, how should this screen look, loading state, error state, empty state, responsive design, navigation, page layout, form design, mockup."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit
---

# UI/UX Design

Design user interfaces from a senior engineer's perspective. This isn't about pixel-perfect mockups — it's about defining user flows, interaction patterns, and UI states clearly enough that implementation is unambiguous. Engineers do this when there's no dedicated designer, or when translating vague designs into complete specifications.

## Core Principle

**Design the states, not just the happy path.** Every screen has at least 5 states: loading, empty, partial data, full data, and error. Designing only the "full data" state is the #1 cause of poor user experience.

## Workflow

### Step 1: Map the User Flow

Before designing any screen, map the complete user journey:

1. **Entry point**: How does the user arrive? (Direct link, navigation, notification, redirect)
2. **Happy path**: The ideal sequence of screens and actions
3. **Branch points**: Where can the user make different choices?
4. **Edge paths**: What happens on errors, cancellation, timeout, or edge cases?
5. **Exit points**: Where does the user end up after completing (or abandoning) the flow?

Document as an ASCII flow diagram or structured list:

```
[Landing] → [Sign Up Form] → [Email Verification] → [Onboarding] → [Dashboard]
                   ↓                    ↓
            [Login Instead]     [Resend Email]
                   ↓                    ↓
              [Login Form]      [Verification Timeout] → [Support]
```

### Step 2: Design Each Screen's States

For every screen in the flow, define all states:

| State | What the user sees | When it occurs |
|-------|-------------------|----------------|
| **Loading** | Skeleton or spinner | Data is being fetched |
| **Empty** | Illustration + CTA | No data exists yet |
| **Partial** | Content + loading indicator | Some data loaded, more coming |
| **Loaded** | Full content | Data fetch complete |
| **Error** | Error message + retry action | Fetch failed |
| **Offline** | Cached content + offline banner | No network (if applicable) |

The empty state is a design opportunity, not just a blank page. "You have no projects yet. Create your first one →" is better than an empty table.

### Step 3: Specify Layouts and Hierarchy

For each screen, define the content hierarchy. Use the structure at [templates/screen-spec.md](templates/screen-spec.md):

- **Primary action**: The one thing the user should do on this screen
- **Content hierarchy**: What's most important → least important (top → bottom, left → right)
- **Secondary actions**: Available but not prominent
- **Navigation**: How to move forward, backward, and sideways

Don't design pixel-perfect layouts — design **information architecture**. What goes where, why, and in what priority order.

### Step 4: Define Interaction Patterns

For each interactive element, specify:

**Forms:**
- Validation timing: On blur, on submit, or real-time?
- Error display: Inline per field, summary at top, or both?
- Multi-step forms: Progress indicator, save on each step, back navigation?
- Submission feedback: Button loading state → success message or redirect

**Lists and Tables:**
- Pagination, infinite scroll, or load more?
- Sorting and filtering: Which columns, client-side or server-side?
- Bulk actions: Selection model, confirmation for destructive actions
- Empty/filtered-empty states

**Modals and Overlays:**
- When to use modal vs inline vs new page
- Close behavior (X, click outside, Escape key)
- Focus trapping and restoration

**Feedback and Notifications:**
- Success: Toast, inline message, or redirect?
- Error: Inline, toast, or modal for critical errors?
- Progress: Determinate bar, indeterminate spinner, skeleton?

See [references/interaction-patterns.md](references/interaction-patterns.md) for common patterns.

### Step 5: Plan Responsive Behavior

Define how the layout adapts across breakpoints:

| Breakpoint | Target | Layout Adaptation |
|-----------|--------|-------------------|
| < 640px | Mobile | Single column, bottom nav, full-width inputs |
| 640-1024px | Tablet | Two columns, collapsible sidebar |
| > 1024px | Desktop | Multi-column, persistent sidebar, hover states |

For each major layout section, specify what changes:
- **Navigation**: Hamburger menu on mobile vs sidebar on desktop
- **Data tables**: Card view on mobile vs table on desktop
- **Images**: Aspect ratio changes, cropping strategy
- **Forms**: Stacked on mobile vs side-by-side on desktop

### Step 6: Produce the Specification

Output using the template at [templates/screen-spec.md](templates/screen-spec.md). Save as `docs/ui/feature-name.md`. Link from the PRD if one exists.

## Principles Applied

- **KISS**: Design the simplest interface that serves the user's goal. Every additional element competes for attention.
- **Progressive disclosure**: Show the most important information first. Reveal complexity only when the user needs it.
- **Consistency**: Reuse patterns across the app. If lists everywhere use pagination, don't switch to infinite scroll for one page.
- **Forgiveness**: Every destructive action should have undo or confirmation. Users make mistakes.
