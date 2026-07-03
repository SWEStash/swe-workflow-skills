# Interaction Patterns

## Contents
- Loading patterns
- Error handling patterns
- Form patterns
- Navigation patterns
- Feedback patterns
- Mobile-specific patterns

## Loading Patterns

### Skeleton screens (recommended default)
Show the layout shape with placeholder content while data loads. Feels faster than a spinner because the user sees the page structure immediately.

Use for: Page loads, list views, cards, profiles — any content with a predictable layout.
Avoid for: Actions with unpredictable duration (file uploads, complex processing).

### Spinner / Progress indicator
Use a spinner for short waits (< 3 seconds) when the layout isn't predictable. Use a progress bar for longer operations where progress can be measured (file upload, data import).

Rules:
- Don't show a spinner for operations under 200ms — it creates visual noise
- After 1 second, add a text label ("Loading your dashboard...")
- After 10 seconds, add a "taking longer than usual" message with an option to cancel or retry
- Never show a spinner without an eventual timeout or escape

### Optimistic updates
Show the result of an action immediately, before the server confirms it. Roll back if the server rejects it.

Use for: Likes, toggles, form edits, adding items to lists — any fast, low-risk action.
Avoid for: Payments, deletions, actions with side effects that can't be reversed.

### Stale-while-revalidate
Show cached data immediately, fetch fresh data in the background, then update seamlessly. The user never sees a loading state for data they've seen before.

Use for: Dashboards, lists, profiles — any screen the user visits repeatedly.

## Error Handling Patterns

### Inline field errors (forms)
Show the error next to the field that caused it, in red with an icon. Don't clear the user's input.

```
Email: [john@example]
       ⚠ Please enter a valid email address
```

### Error banner (page-level)
Show a dismissible banner at the top of the page for non-field-specific errors (network failure, server error, permission denied).

### Error page (full-page)
Use for unrecoverable errors: 404, 500, maintenance mode. Include: what happened (without technical jargon), what the user can do (go back, try again, contact support).

### Retry pattern
For transient errors (network timeout, server 503), offer automatic retry with exponential backoff, plus a manual "Try Again" button. Show what happened: "Couldn't load your data. Retrying..." then "Still having trouble. [Try Again]"

### Graceful degradation
When a non-critical component fails, don't break the whole page. Show a localized error: "Recommendations unavailable" instead of a full error page, while the rest of the page works normally.

## Form Patterns

### Validation timing

| Strategy | When to validate | Best for |
|----------|-----------------|----------|
| On blur | When user leaves a field | Most forms — validates without being intrusive |
| On submit | When user submits | Simple forms with few fields |
| Real-time | As user types (debounced) | Username availability, password strength |
| On change | After first submission attempt | Re-validation after an error was shown |

Recommended combo: Validate on submit first, then switch to on-blur/on-change for fields that had errors (so the user sees errors clear as they fix them).

### Multi-step forms

- Show a progress indicator (step 1 of 4, or a progress bar)
- Save data on each step (don't lose progress on navigation)
- Allow backward navigation without losing data
- Show a summary/review step before final submission
- Each step should have a clear purpose and title

### Inline editing

For settings and profile pages, let users edit in place rather than navigating to an edit form. Click to edit → modify → auto-save or explicit save button.

### Destructive action confirmation

```
[Delete Project]
↓
"Are you sure? This will permanently delete 'My Project' 
 and all 47 associated tasks. This cannot be undone."
[Cancel] [Delete Project]  ← destructive button is red, NOT the default
```

For extra safety: require typing the resource name to confirm ("Type 'My Project' to confirm deletion").

## Navigation Patterns

### Top-level navigation
- **Web**: Horizontal top bar (< 7 items) or sidebar (7+ items)
- **Mobile**: Bottom tab bar (3-5 items) or hamburger menu (5+ items)

### Breadcrumbs
Use for hierarchical content (folder structures, category → subcategory → item). Don't use for flat navigation or linear flows.

### Deep linking
Every meaningful state should have a URL. If a user shares a link, the recipient should see the same content. This means: filter state in query params, modal state in hash or route, pagination in query params.

### Back navigation
Always provide a way to go back. On web: browser back should work predictably. On mobile: swipe back / hardware back should respect navigation stack. Don't break the back button by replacing history entries.

## Feedback Patterns

### Toast notifications
Use for non-critical, transient feedback: "Settings saved", "Email sent", "Item added to cart".
- Auto-dismiss after 4-6 seconds
- Include an undo action when applicable ("Item deleted. [Undo]")
- Stack when multiple appear; don't overwhelm

### Success states
After a significant action (account created, payment completed, form submitted):
- Show a clear success message with next steps
- Don't just redirect silently — acknowledge the accomplishment
- Provide a clear path forward ("View your order →")

## Mobile-Specific Patterns

### Touch targets
Minimum 44×44px (Apple) or 48×48dp (Material Design). Fingers are imprecise — small targets cause frustration and errors.

### Pull to refresh
Standard for list/feed views on mobile. Show a visual indicator and haptic feedback.

### Swipe actions
Use for common actions on list items (archive, delete, mark as read). Always provide an alternative non-swipe path to the same action (accessibility).

### Bottom sheets
Use instead of modals on mobile. They're thumb-reachable and feel native. Support drag-to-dismiss.

### Keyboard handling
- Auto-focus the first input when a form appears
- Use appropriate input types (`type="email"`, `inputMode="numeric"`) for the right keyboard
- Scroll the focused input into view above the keyboard
- Submit on "Done" / "Go" key when appropriate
