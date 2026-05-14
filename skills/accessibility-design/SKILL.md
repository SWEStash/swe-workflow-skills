---
name: accessibility-design
description: "Design and implement accessible web/mobile apps to WCAG 2.1/2.2 — semantic HTML, ARIA patterns, keyboard navigation, focus management, color contrast, screen readers, accessible forms. Triggers: accessibility, a11y, WCAG, screen reader, keyboard navigation, ARIA, focus management, color contrast, alt text, semantic HTML, tab order, focus trap, skip link, announce. Build it in, don't bolt it on."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Accessibility Design

Build accessibility into applications from the start. Accessibility is not a feature — it's a quality attribute, like performance or security. Retrofitting it is 10x harder than building it in.

## Core Principle

**Use semantic HTML first, ARIA second, custom JavaScript last.** A native `<button>` gives you keyboard support, focus management, and screen reader announcement for free. A `<div onClick>` gives you none of that and requires manual reimplementation of every behavior the browser provides natively.

## Workflow

### Step 1: Understand the Requirements

Determine the target compliance level:

- **WCAG 2.1 Level A**: Minimum baseline (avoid lawsuits, but still inaccessible)
- **WCAG 2.1 Level AA**: Industry standard (recommended minimum for all projects)
- **WCAG 2.2 Level AA**: Current standard, adds mobile and cognitive accessibility
- **WCAG Level AAA**: Aspirational — few sites achieve this fully

For most projects, **target WCAG 2.1 AA** as the minimum. Level AAA for specific features where feasible.

### Step 2: Apply Semantic HTML

Before reaching for ARIA, use the right HTML element:

| Instead of... | Use... | You get for free... |
|--------------|--------|---------------------|
| `<div onClick>` | `<button>` | Focus, Enter/Space activation, role announcement |
| `<div>` for navigation | `<nav>` | Landmark for screen reader navigation |
| `<span>` for heading | `<h1>`-`<h6>` | Document outline, heading navigation |
| `<div>` for list | `<ul>/<ol>` | List count announcement, list navigation |
| `<div>` for input | `<input>` + `<label>` | Label association, auto-focus, form submission |
| `<div>` for table | `<table>` | Row/column navigation, header association |
| Custom dropdown | `<select>` or `<details>` | Keyboard navigation, screen reader support |

See [references/accessibility-patterns.md](references/accessibility-patterns.md) for comprehensive patterns.

### Step 3: Design Keyboard Navigation

Every interactive element must be operable by keyboard alone:

**Tab order:** Interactive elements should follow a logical reading order. Don't use `tabindex` values > 0 (they override the natural order). Use `tabindex="0"` to add non-interactive elements to the tab order when needed, and `tabindex="-1"` to make elements focusable programmatically but not in the tab sequence.

**Focus visibility:** Focused elements must have a visible indicator. Never `outline: none` without providing an alternative. Use `:focus-visible` (shows focus ring only for keyboard users, not mouse clicks).

**Keyboard shortcuts for common patterns:**

| Pattern | Keys |
|---------|------|
| Buttons | Enter or Space to activate |
| Links | Enter to follow |
| Menus | Arrow keys to navigate, Enter to select, Escape to close |
| Tabs | Arrow keys between tabs, Tab to move focus into panel |
| Modals | Tab cycles within modal (focus trap), Escape to close |
| Autocomplete | Arrow keys to navigate suggestions, Enter to select |

### Step 4: Design Focus Management

Focus management is critical for dynamic content. When the page changes without a full reload, focus must move to the right place:

| Scenario | Focus should go to... |
|----------|----------------------|
| Modal opens | First focusable element inside the modal |
| Modal closes | The element that triggered the modal |
| Item deleted from list | Next item in list, or previous if last was deleted |
| Error after form submit | First field with an error |
| Page/route change | Main content area or page heading |
| Toast notification | Do NOT move focus (announce with aria-live instead) |

### Step 5: Handle Dynamic Content

When content changes without page reload, screen readers need to be notified:

**aria-live regions:**
- `aria-live="polite"` — Announce when the screen reader is idle (status messages, search results count)
- `aria-live="assertive"` — Interrupt immediately (errors, critical alerts)

**Common announcements:**
- Form errors: "3 errors found. First error: Email is required."
- Search results: "24 results found for 'react'."
- Toast: "Settings saved successfully."
- Loading: "Loading your dashboard..." → "Dashboard loaded."

### Step 6: Ensure Visual Accessibility

**Color contrast:**
- Normal text: 4.5:1 ratio minimum (AA)
- Large text (18px+ or 14px+ bold): 3:1 ratio minimum (AA)
- UI components and graphical objects: 3:1 ratio minimum
- Don't convey information by color alone — use icons, patterns, or text labels alongside color

**Typography and spacing:**
- Body text: minimum 16px (1rem)
- Line height: at least 1.5 for body text
- Paragraph spacing: at least 2x font size
- Users must be able to zoom to 200% without horizontal scrolling

### Step 7: Validate

Automated testing catches ~30% of accessibility issues. Manual testing catches the rest.

**Automated:**
- Run axe-core or Lighthouse accessibility audit
- Add eslint-plugin-jsx-a11y to catch common React issues at build time
- Include @axe-core/react in development mode for runtime warnings

**Manual:**
- [ ] Navigate the entire flow using only keyboard (no mouse)
- [ ] Test with a screen reader (VoiceOver on Mac, NVDA on Windows)
- [ ] Verify all images have meaningful alt text (or `alt=""` for decorative)
- [ ] Verify color contrast with a contrast checker tool
- [ ] Test at 200% zoom — no horizontal scroll, no overlapping text
- [ ] Verify all form fields have associated labels
- [ ] Verify error messages are announced to screen readers

## Principles Applied

- **KISS**: Use native HTML first. Every custom ARIA widget is code you have to maintain and test.
- **Progressive enhancement**: Build the accessible version first, then enhance for visual design. Not the other way around.
- **DRY**: Accessible patterns in shared components (Button, Input, Modal) mean every consumer gets accessibility for free.
- **Defense in depth**: Automated linting + automated testing + manual testing. No single method catches everything.
