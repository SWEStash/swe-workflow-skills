---
name: frontend-architecture
description: "Design frontend architecture — React component hierarchy, state management, design tokens, data fetching, routing, error boundaries, code organization. Triggers: component architecture, state management, design system, design tokens, component library, React structure, folder structure, Zustand vs Redux, React Query, code splitting, error boundary, compound component."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Frontend Architecture

Design the technical structure of frontend applications — component hierarchy, state management, data fetching, and code organization. Good frontend architecture makes features easy to build, bugs easy to find, and the codebase easy to onboard into.

## Core Principle

**Colocation over separation.** Keep related things together. A component's styles, tests, types, and stories should live next to the component, not in separate `/styles`, `/tests`, `/types` directories. Separation by file type creates coupling across the filesystem; separation by feature creates independence.

## Workflow

### Step 1: Design the Component Hierarchy

Start from the UI design (or the screen spec from `ui-ux-design`) and decompose into components:

1. **Identify the visual boundaries** — Draw boxes around distinct UI regions
2. **Apply the single-responsibility principle** — Each component does one thing
3. **Identify reusability** — Which components appear in multiple places?
4. **Define the tree** — Parent → child relationships

Component classification:
- **Page components**: Route-level, fetch data, compose layout
- **Feature components**: Implement a business feature (UserProfile, OrderSummary)
- **UI components**: Reusable, no business logic (Button, Card, Modal, Input)
- **Layout components**: Structure only (Sidebar, Grid, Stack, Container)

See [references/component-patterns.md](references/component-patterns.md) for design patterns.

### Step 2: Plan State Management

State management is the most impactful architectural decision in a React app. Apply the state placement ladder — use the simplest option that works:

```
1. Local state (useState)           → Simplest. Use for UI state within a component.
2. Lifted state (parent useState)   → Share between siblings via parent.
3. Composition (children prop)      → Avoid prop drilling with component composition.
4. Context                          → Share across distant components (theme, auth, locale).
5. URL state (query params)         → Shareable, bookmarkable state (filters, pagination).
6. Server state (React Query / SWR) → Data from API with caching + refetching.
7. Global store (Zustand / Redux)   → Client state shared across many unrelated components.
```

**Decision rules:**
- If it's only used in one component → `useState`
- If shared between parent/child → lift state up
- If shared across distant components but rarely changes → Context
- If it comes from the server → React Query / SWR / TanStack Query (NOT global store)
- If it's complex client state updated from many places → Zustand or Redux Toolkit
- If it should survive a page refresh → URL params or localStorage

See [references/component-patterns.md](references/component-patterns.md) for detailed guidance.

### Step 3: Define Design Tokens

Design tokens are the foundation of visual consistency. Define tokens before building components:

```typescript
// tokens.ts
export const tokens = {
  color: {
    primary: { 50: '#eff6ff', 500: '#3b82f6', 700: '#1d4ed8' },
    neutral: { 50: '#f9fafb', 200: '#e5e7eb', 800: '#1f2937' },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  radius: { sm: '0.25rem', md: '0.5rem', lg: '1rem', full: '9999px' },
  fontSize: { sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem' },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
  },
};
```

Use tokens everywhere — never hardcode `#3b82f6` or `16px` in a component.

### Step 4: Design the Data Fetching Strategy

Choose patterns based on the data's nature:

| Data Pattern | Approach | When |
|-------------|----------|------|
| Server data (read) | TanStack Query / SWR | Lists, details, dashboards |
| Server data (mutate) | TanStack Query mutations | Create, update, delete |
| Real-time data | WebSocket + state sync | Chat, notifications, live dashboards |
| Form data | React Hook Form / Formik | Any form |
| Static data | Build-time fetch (SSG) | Blog posts, docs, marketing pages |

Key rules:
- **Separate server state from client state.** Server state lives in the query cache, not in Redux.
- **Fetch at the route level** when possible. Components receive data as props, not fetch their own.
- **Handle loading, error, and empty** at every fetch boundary. Use error boundaries for unexpected errors.

### Step 5: Organize the Codebase

Recommended structure — feature-based with shared library:

```
src/
├── app/                    # App-level: providers, routing, global config
│   ├── providers.tsx       # All context providers composed
│   ├── router.tsx          # Route definitions
│   └── layout.tsx          # Root layout
├── features/               # Feature modules (the meat of the app)
│   ├── auth/
│   │   ├── components/     # Feature-specific components
│   │   ├── hooks/          # Feature-specific hooks
│   │   ├── api.ts          # API calls for this feature
│   │   ├── types.ts        # Types for this feature
│   │   └── index.ts        # Public API (barrel file)
│   ├── projects/
│   └── settings/
├── components/             # Shared UI components (Button, Modal, etc.)
│   ├── ui/                 # Atomic UI primitives
│   └── layout/             # Layout components (Sidebar, Stack)
├── hooks/                  # Shared hooks (useDebounce, useMediaQuery)
├── lib/                    # Shared utilities, API client, tokens
│   ├── api-client.ts
│   ├── tokens.ts
│   └── utils.ts
└── types/                  # Shared types
```

Rules:
- Features import from `components/` and `lib/`, never from other features
- Features export a clean public API through their `index.ts`
- Circular imports between features means a responsibility boundary is wrong

Use [templates/folder-structure.md](templates/folder-structure.md) as a starting point — includes the full `src/` layout, a co-located component template, design tokens, and a custom hook pattern.

### Step 6: Validate the Architecture

- [ ] Can a new engineer understand where to add a new feature?
- [ ] Can you delete a feature directory without breaking unrelated features?
- [ ] Is server state separate from client state?
- [ ] Are components reusable without bringing business logic along?
- [ ] Is there one clear way to do common tasks (fetching, forms, navigation)?
- [ ] Are design tokens used consistently (no hardcoded values)?

## Principles Applied

- **KISS**: Use `useState` until you need something more. Don't reach for Redux on day one.
- **DRY**: Shared UI components in `components/`, shared hooks in `hooks/`. Feature-specific code in features.
- **Functional Independence**: Features don't know about each other. Shared dependencies go in `lib/` or `components/`.
- **YAGNI**: Don't abstract until you have 2+ consumers. A single-use component doesn't need to be in the shared library.
- **Separation of Concerns**: Components render UI. Hooks manage state and side effects. API modules handle HTTP. Types define shapes. Keep them apart.
