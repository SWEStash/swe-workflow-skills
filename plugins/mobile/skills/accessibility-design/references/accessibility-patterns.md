# Accessibility Patterns

## Contents
- Common component patterns
- Form accessibility
- Modal and dialog patterns
- Navigation patterns
- Image and media accessibility
- React-specific patterns

## Common Component Patterns

### Button
```html
<!-- GOOD: Native button — keyboard support, role, focus all built in -->
<button type="button" onClick={handleClick}>
  Save Changes
</button>

<!-- GOOD: Button with loading state -->
<button type="button" disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? 'Saving...' : 'Save Changes'}
</button>

<!-- GOOD: Icon button with accessible label -->
<button type="button" aria-label="Delete item">
  <TrashIcon aria-hidden="true" />
</button>

<!-- BAD: Div pretending to be a button — no keyboard, no role, no focus -->
<div className="btn" onClick={handleClick}>Save</div>
```

### Link vs Button
- Use `<a>` for navigation (goes somewhere)
- Use `<button>` for actions (does something)
- Never use `<a href="#">` as a button — use a real `<button>`

### Toggle / Switch
```html
<button
  role="switch"
  aria-checked={isEnabled}
  onClick={() => setIsEnabled(!isEnabled)}
>
  Dark mode
</button>
```

### Tabs
```html
<div role="tablist" aria-label="Account settings">
  <button role="tab" aria-selected={activeTab === 'general'} 
          aria-controls="panel-general" id="tab-general">
    General
  </button>
  <button role="tab" aria-selected={activeTab === 'security'}
          aria-controls="panel-security" id="tab-security">
    Security
  </button>
</div>
<div role="tabpanel" id="panel-general" aria-labelledby="tab-general"
     hidden={activeTab !== 'general'}>
  General settings content...
</div>
```

Keyboard: Arrow keys between tabs, Tab moves focus into the active panel.

### Accordion
```html
<h3>
  <button aria-expanded={isOpen} aria-controls="section-1">
    FAQ Question
  </button>
</h3>
<div id="section-1" role="region" hidden={!isOpen}>
  Answer content...
</div>
```

## Form Accessibility

### Labels
Every input MUST have an associated label. No exceptions.

```html
<!-- GOOD: Explicit label with htmlFor -->
<label htmlFor="email">Email address</label>
<input id="email" type="email" />

<!-- GOOD: Wrapping label (implicit association) -->
<label>
  Email address
  <input type="email" />
</label>

<!-- GOOD: aria-label for visually hidden label -->
<input type="search" aria-label="Search projects" />

<!-- BAD: Placeholder as label — disappears on focus, low contrast -->
<input type="email" placeholder="Email address" />
```

### Error messages
```html
<label htmlFor="email">Email address</label>
<input 
  id="email" 
  type="email"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && (
  <p id="email-error" role="alert">
    Please enter a valid email address
  </p>
)}
```

Key: `aria-invalid` tells screen readers the field has an error. `aria-describedby` links the error message to the field. `role="alert"` announces the error immediately.

### Required fields
```html
<label htmlFor="name">
  Name <span aria-hidden="true">*</span>
</label>
<input id="name" required aria-required="true" />
```

The `*` is visual-only (`aria-hidden`). `aria-required` is the programmatic indicator.

### Form submission feedback
```html
<!-- Status region for form-level messages -->
<div aria-live="polite" role="status">
  {submitSuccess && "Your changes have been saved."}
  {submitError && "Failed to save. Please try again."}
</div>
```

## Modal and Dialog Patterns

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Delete Project</h2>
  <p id="modal-description">
    This will permanently delete "My Project" and all its data.
  </p>
  <button onClick={onCancel}>Cancel</button>
  <button onClick={onConfirm}>Delete</button>
</div>
```

**Required behaviors:**
1. Focus moves to the first focusable element when modal opens
2. Tab cycles within the modal (focus trap — focus cannot leave)
3. Escape key closes the modal
4. Focus returns to the triggering element when modal closes
5. Background content has `aria-hidden="true"` and `inert` while modal is open

### React focus trap implementation
```typescript
function useFocusTrap(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = element.querySelectorAll(focusableSelector);
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [ref]);
}
```

## Navigation Patterns

### Skip link (required for keyboard users)
```html
<!-- First element in the body -->
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
<!-- ... header, nav ... -->
<main id="main-content">
  Page content
</main>
```

The skip link is visually hidden until focused (keyboard user presses Tab).

### Landmarks
```html
<header>    <!-- banner landmark -->
  <nav aria-label="Main navigation">  <!-- navigation landmark -->
    ...
  </nav>
</header>
<main>      <!-- main landmark -->
  <section aria-label="Dashboard">     <!-- region landmark -->
    ...
  </section>
</main>
<aside>     <!-- complementary landmark -->
  ...
</aside>
<footer>    <!-- contentinfo landmark -->
  ...
</footer>
```

Screen reader users navigate by landmarks. Proper landmark structure lets them jump directly to the section they need.

### Breadcrumbs
```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/projects">Projects</a></li>
    <li><a href="/projects/123" aria-current="page">My Project</a></li>
  </ol>
</nav>
```

## Image and Media Accessibility

### Images
```html
<!-- Informative image: describe what it shows -->
<img src="chart.png" alt="Revenue grew 25% from Q1 to Q2 2025" />

<!-- Decorative image: empty alt (don't omit alt entirely) -->
<img src="decoration.png" alt="" />

<!-- Complex image: describe + link to long description -->
<figure>
  <img src="architecture.png" alt="System architecture overview" aria-describedby="arch-desc" />
  <figcaption id="arch-desc">
    The system consists of three services: API gateway, processing service, and database.
    Requests flow from the gateway through the processor to the database.
  </figcaption>
</figure>
```

### Video
- Provide captions (not just auto-generated)
- Provide a transcript for audio content
- Don't autoplay with sound
- Provide pause/stop controls

## React-Specific Patterns

### Route change announcements
Single-page apps don't trigger screen reader page announcements on navigation. Add an announcer:

```typescript
function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Read the page title or a descriptive heading
    const title = document.title || 'Page loaded';
    setAnnouncement(title);
  }, [location]);

  return (
    <div aria-live="assertive" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}
```

### Visually hidden utility (sr-only)
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```
Use for: skip links, form labels that are visually implied by context, additional screen reader context.

### ESLint plugin
Add `eslint-plugin-jsx-a11y` to catch common issues at development time:
```json
{
  "extends": ["plugin:jsx-a11y/recommended"]
}
```
This catches: missing alt text, invalid ARIA attributes, non-interactive elements with click handlers, missing form labels, and more.
