# Frontend Architecture Templates

---

## Recommended `src/` Folder Structure

Feature-based layout with a shared component library. Copy this structure and delete the directories you don't need yet.

```
src/
├── app/                          # App-level wiring (not business logic)
│   ├── providers.tsx             # All context providers composed in one place
│   ├── router.tsx                # Route definitions
│   └── layout.tsx                # Root layout (nav, sidebar, footer)
│
├── features/                     # One directory per business feature
│   ├── auth/
│   │   ├── components/           # Components used only in this feature
│   │   │   └── LoginForm/
│   │   │       ├── LoginForm.tsx
│   │   │       ├── LoginForm.test.tsx
│   │   │       └── LoginForm.types.ts
│   │   ├── hooks/                # Feature-specific hooks
│   │   │   └── useLogin.ts
│   │   ├── api.ts                # API calls for this feature (React Query queries/mutations)
│   │   ├── types.ts              # Types scoped to this feature
│   │   └── index.ts              # Public API — only export what other modules need
│   ├── projects/
│   └── settings/
│
├── components/                   # Shared, reusable UI components (no business logic)
│   ├── ui/                       # Atomic primitives: Button, Input, Modal, Badge
│   └── layout/                   # Layout components: Stack, Grid, Container, Sidebar
│
├── hooks/                        # Shared hooks: useDebounce, useMediaQuery, useLocalStorage
├── lib/                          # Shared infrastructure
│   ├── api-client.ts             # Configured axios/fetch instance
│   ├── tokens.ts                 # Design tokens (see below)
│   └── utils.ts                  # Pure utility functions
└── types/                        # Shared TypeScript types and interfaces
```

> **Rules:** Features import from `components/` and `lib/`. Features never import from other features. Circular imports mean a responsibility boundary is wrong — move the shared code to `lib/` or `components/`.

---

## Component File Template

Co-locate everything for a component in one folder. Avoids hunting across the filesystem for related files.

```
components/ui/Button/
├── Button.tsx         # Component implementation
├── Button.test.tsx    # Tests
├── Button.types.ts    # Props interface
└── index.ts           # Re-export (allows: import { Button } from '@/components/ui/Button')
```

**Button.types.ts**
```typescript
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}
```

**Button.tsx**
```tsx
import type { ButtonProps } from './Button.types';

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <span className="spinner" aria-hidden /> : null}
      {children}
    </button>
  );
}
```

---

## Design Tokens — `lib/tokens.ts`

Define all visual constants here. Never hardcode colors, spacing, or typography values in components.

```typescript
export const tokens = {
  color: {
    primary: {
      50:  '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      700: '#1d4ed8',
      900: '#1e3a8a',
    },
    neutral: {
      50:  '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      500: '#6b7280',
      800: '#1f2937',
      900: '#111827',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error:   '#ef4444',
      info:    '#3b82f6',
    },
  },
  spacing: {
    xs:  '0.25rem',   //  4px
    sm:  '0.5rem',    //  8px
    md:  '1rem',      // 16px
    lg:  '1.5rem',    // 24px
    xl:  '2rem',      // 32px
    '2xl': '3rem',    // 48px
  },
  radius: {
    sm:   '0.25rem',
    md:   '0.5rem',
    lg:   '1rem',
    full: '9999px',
  },
  fontSize: {
    xs:   '0.75rem',
    sm:   '0.875rem',
    base: '1rem',
    lg:   '1.125rem',
    xl:   '1.25rem',
    '2xl': '1.5rem',
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
  },
} as const;

// Type helpers for token-safe props
export type ColorToken = typeof tokens.color;
export type SpacingToken = keyof typeof tokens.spacing;
```

---

## Custom Hook Template — `hooks/useResource.ts`

Standard pattern for data-fetching hooks (wraps React Query; adapt for SWR or raw fetch).

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchResource, updateResource } from '@/features/resource/api';
import type { Resource } from '@/features/resource/types';

// Query key factory — keeps cache keys consistent across the app
export const resourceKeys = {
  all:    () => ['resources'] as const,
  list:   (filters: Record<string, unknown>) => [...resourceKeys.all(), 'list', filters] as const,
  detail: (id: string) => [...resourceKeys.all(), 'detail', id] as const,
};

// Fetch hook — returns { data, isLoading, error }
export function useResource(id: string) {
  return useQuery({
    queryKey: resourceKeys.detail(id),
    queryFn:  () => fetchResource(id),
    enabled:  Boolean(id),
    staleTime: 5 * 60 * 1000,   // 5 minutes
  });
}

// Mutation hook — returns { mutate, isPending, error }
export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Resource> }) =>
      updateResource(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate affected queries so UI stays fresh
      queryClient.invalidateQueries({ queryKey: resourceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: resourceKeys.all() });
    },
  });
}
```
