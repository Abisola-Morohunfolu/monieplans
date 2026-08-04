# monieplans — Frontend Application Specification

> **Package:** `frontend`
> **Repository:** monieplans
> **Generated:** 2026-08-04

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Routing & Pages](#4-routing--pages)
5. [State Management & Data Layer](#5-state-management--data-layer)
6. [Component Architecture](#6-component-architecture)
7. [Layout System](#7-layout-system)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Testing](#9-testing)
10. [Build & Configuration](#10-build--configuration)
11. [Directory Structure](#11-directory-structure)

---

## 1. Overview

The monieplans frontend is a React single-page application (SPA) for personal finance management. It enables users to:

- **View dashboard** with spending KPIs and recent transactions
- **Manage budgets** — create, activate, lock budget periods with weekly allocations
- **Track expenses** — log spending, upload receipts with AI parsing
- **Manage fixed expenses** — recurring bills and subscriptions
- **Set savings goals** — target amounts with reservation tracking
- **Import bank statements** — CSV upload with category auto-matching
- **View analytics** — spending insights and AI-powered recommendations

The frontend communicates with a NestJS backend via REST API (Axios) with better-auth session cookies for authentication.

---

## 2. Technology Stack

### Core Framework

| Technology | Version | Purpose |
|---|---|---|
| React | ^19.2.8 | UI framework |
| TypeScript | ~6.0.2 | Type-safe JavaScript |
| Vite | ^8.2.0 | Build tool and dev server |

### Routing & State

| Technology | Version | Purpose |
|---|---|---|
| TanStack React Router | ^1.170.18 | File-based routing with auto-generated route tree |
| TanStack React Query | ^5.101.4 | Server state management, caching, mutations |
| Axios | ^1.19.0 | HTTP client for backend API calls |

### Styling & Icons

| Technology | Version | Purpose |
|---|---|---|
| Tailwind CSS | ^4.3.3 | Utility-first CSS with custom theme tokens |
| Lucide React | ^1.28.0 | Icon library |

### Authentication

| Technology | Version | Purpose |
|---|---|---|
| better-auth | ^1.6.25 | Email/password auth with session cookies |

### Linting

| Technology | Version | Purpose |
|---|---|---|
| Oxlint | ^1.75.0 | Rust-based JavaScript/TypeScript linter |

---

## 3. Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Browser                          │
├──────────────────────────────────────────────────────┤
│  React SPA (Vite)                                    │
│  ┌─────────────────┐  ┌───────────────────────────┐  │
│  │  TanStack Router │  │  React Query              │  │
│  │  (File-based)    │  │  (Server State)           │  │
│  └─────────────────┘  └───────────┬───────────────┘  │
│                                    │                  │
│  ┌─────────────────┐  ┌───────────┴───────────────┐  │
│  │  Tailwind CSS v4 │  │  Axios (withCredentials) │  │
│  │  (Glass UI)      │  │  + better-auth client     │  │
│  └─────────────────┘  └───────────┬───────────────┘  │
│                                    │                  │
├────────────────────────────────────┼──────────────────┤
│                            NestJS Backend             │
│                            (localhost:3000)           │
└──────────────────────────────────────────────────────┘
```

### Provider Stack (Entry Point)

`src/main.tsx` wraps the app in a minimal provider hierarchy:

1. **StrictMode** — React dev-mode checks
2. **QueryClientProvider** — React Query cache and client (no custom defaults)
3. **RouterProvider** — TanStack Router with auto-generated route tree

There is no global `AuthProvider` or `ThemeProvider` — session state is read directly from the better-auth client, and dark mode follows the OS `prefers-color-scheme` media query.

### Route Tree Auto-Generation

TanStack Router's Vite plugin scans `src/routes/` and generates `src/routeTree.gen.ts` at build time. The route tree must be regenerated after adding, removing, or renaming route files.

### Key Architectural Patterns

1. **File-based routing** — Routes defined by file structure under `src/routes/`, using TanStack Router conventions (`__root.tsx`, `_authenticated.tsx` as layout route, `$budgetId.tsx` as dynamic segment, `index.tsx` as directory index)
2. **Server state via React Query** — API data fetched, cached, and mutated through `useQuery`/`useMutation` with inline `queryKey` arrays (no abstraction layer)
3. **Glass morphism aesthetic** — Frosted glass panels via custom Tailwind utilities (`.glass`, `.glass-card`)
4. **Dark mode via CSS** — `@media (prefers-color-scheme: dark)` with `dark:` variants, no JS toggle

---

## 4. Routing & Pages

### Route Architecture

Routes use TanStack Router's file-based convention in `src/routes/`. The route tree is auto-generated into `src/routeTree.gen.ts`.

### Public Routes (No Auth Required)

| Route | File | Component | Purpose |
|---|---|---|---|
| `/` | `index.tsx` | `Index` | Landing page with "Get Started" and "Login" buttons (both currently unwired) |
| `/login` | `login.tsx` | `LoginPage` | Email/password login form using `signIn.email()` |

### Authenticated Routes (`/_authenticated`)

The `_authenticated.tsx` layout route wraps all authenticated pages with `AppLayout`. Auth guard (`beforeLoad`) is defined but **currently commented out** — any user can access these routes.

| Route | File | Purpose | Live API? |
|---|---|---|---|
| `/dashboard` | `_authenticated/dashboard.tsx` | 3 KPI cards + spending chart placeholder + recent transactions | No (hardcoded) |
| `/budgets` | `_authenticated/budgets/index.tsx` | List all budgets with status/cycle/cap info | Yes (`GET /budgets`) |
| `/budgets/$budgetId` | `_authenticated/budgets/$budgetId.tsx` | Budget detail with activate/lock actions | Yes (`GET`, `POST /budgets/:id/activate`, `POST /budgets/:id/lock`) |
| `/expenses` | `_authenticated/expenses/index.tsx` | Expenses list with search and "Log Expense" CTA | No (empty state) |
| `/fixed-expenses` | `_authenticated/fixed-expenses/index.tsx` | Fixed expenses list with "Add Fixed Expense" CTA | No (empty state) |
| `/goals` | `_authenticated/goals/index.tsx` | Goals list with "Create Goal" CTA | No (empty state) |
| `/profile` | `_authenticated/profile/index.tsx` | Settings tabs (Account, Notifications, Appearance, Security) | No (hardcoded) |
| `/statements` | `_authenticated/statements/index.tsx` | Export PDF/CSV cards + past statements list | No (empty state) |

### Route Tree Status

The auto-generated `routeTree.gen.ts` currently only includes `dashboard` under `_authenticated`. The TanStack Router Vite plugin needs to be re-run to pick up routes added since the last generation (`budgets/`, `expenses/`, `fixed-expenses/`, `goals/`, `profile/`, `statements/`).

### Page States

Each page component follows a pattern of:
- **Loading:** Spinner or skeleton inside a `.glass-card`
- **Empty:** Icon + message + suggestion text (e.g., "No budgets yet. Create your first budget to start tracking.")
- **Error:** Inline error message or banner
- **Data:** Full content rendering

The only page implementing all four states is `budgets/$budgetId.tsx`. Most pages only render the empty state.

---

## 5. State Management & Data Layer

### Architecture

All server state is managed via TanStack React Query. Domain-specific hooks live in `src/hooks/`, keeping route components thin.

```
src/hooks/
├── useBudgets.ts          # GET /budgets, POST /budgets, PATCH /budgets/:id
├── useBudget.ts           # GET /budgets/:id, POST /budgets/:id/activate, lock
├── useExpenses.ts         # GET /expenses, POST /expenses, DELETE /expenses/:id
├── useGoals.ts            # GET /goals, POST /goals, PATCH /goals/:id
├── useFixedExpenses.ts    # GET /fixed-expenses, POST /fixed-expenses
├── useStatements.ts       # POST /statements/upload, GET /statements
├── useAnalytics.ts        # GET /analytics/insights
├── useAuth.ts             # Wraps better-auth useSession + login/logout helpers
```

Route components import only the hooks they need. Example (`routes/_authenticated/budgets/$budgetId.tsx`):

```tsx
// Before (inline React Query — to be refactored away)
const { data, isLoading } = useQuery({
  queryKey: ['budgets', budgetId],
  queryFn: () => api.get(`/budgets/${budgetId}`),
})
const activate = useMutation({
  mutationFn: () => api.post(`/budgets/${budgetId}/activate`),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets', budgetId] }),
})

// After (hook abstraction)
import { useBudget } from '@/hooks/useBudget'
const { budget, isLoading, activate, isActivating } = useBudget(budgetId)
```

### Query Key Factory

All query keys are defined in `src/lib/queryKeys.ts` using a flat factory object to guarantee consistency across mutations invalidating the same key.

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  budgets: {
    all: ['budgets'] as const,
    detail: (id: string) => ['budgets', id] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    detail: (id: string) => ['expenses', id] as const,
  },
  goals: {
    all: ['goals'] as const,
    detail: (id: string) => ['goals', id] as const,
  },
  fixedExpenses: {
    all: ['fixed-expenses'] as const,
  },
  statements: {
    all: ['statements'] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    insights: ['analytics', 'insights'] as const,
  },
  user: {
    profile: ['user', 'profile'] as const,
  },
} as const
```

Usage:

```tsx
// In a hook
useQuery({ queryKey: queryKeys.budgets.all, queryFn: fetchBudgets })

// In a mutation (invalidation)
queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
```

### Hook Patterns

#### Read hook (`useQuery`)

```typescript
// src/hooks/useBudgets.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Budget } from '@/types'

async function fetchBudgets(): Promise<Budget[]> {
  const { data } = await api.get('/budgets')
  return data
}

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets.all,
    queryFn: fetchBudgets,
    staleTime: 5 * 60 * 1000,    // 5 min — budgets change infrequently
  })
}
```

**Convention:** Every read hook returns the raw `useQuery` result (`data`, `isLoading`, `isError`, `error`). Never destructure before returning — let the consumer pick what it needs.

#### Detail hook (`useQuery` with param)

```typescript
// src/hooks/useBudget.ts
export function useBudget(budgetId: string) {
  return useQuery({
    queryKey: queryKeys.budgets.detail(budgetId),
    queryFn: async () => {
      const { data } = await api.get(`/budgets/${budgetId}`)
      return data as Budget
    },
    enabled: !!budgetId,          // guards against undefined/empty param
  })
}
```

#### Mutation hook (invalidate)

```typescript
// Inside src/hooks/useBudget.ts
export function useActivateBudget(budgetId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post(`/budgets/${budgetId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.detail(budgetId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}
```

#### Mutation hook (optimistic update)

For fast-feedback actions (toggle, delete, inline edit), update the cache optimistically and roll back on error:

```typescript
export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (expenseId: string) => api.delete(`/expenses/${expenseId}`),

    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })
      const previous = queryClient.getQueryData<Expense[]>(queryKeys.expenses.all)

      queryClient.setQueryData<Expense[]>(queryKeys.expenses.all, (old) =>
        old?.filter((e) => e.id !== expenseId),
      )

      return { previous }  // snapshot for rollback
    },

    onError: (_err, _expenseId, context) => {
      queryClient.setQueryData(queryKeys.expenses.all, context?.previous)
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}
```

### QueryClient Configuration

The `QueryClient` is configured with global defaults in `src/main.tsx` or a dedicated `src/lib/queryClient.ts`:

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,          // 1 min — data considered fresh
      gcTime: 5 * 60 * 1000,         // 5 min — keep inactive cache
      retry: 1,                      // one retry on error
      refetchOnWindowFocus: false,   // don't refetch on tab focus
    },
    mutations: {
      retry: 0,                      // no auto-retry for writes
    },
  },
})
```

### Axios Client (`lib/api.ts`)

```typescript
api = axios.create({
  baseURL: VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,       // session cookies
})
```

- `withCredentials: true` ensures better-auth session cookies are sent cross-origin
- 401 interceptor calls `signOut()` and redirects to `/login?redirect=<currentPath>`
- No request interceptors for auth headers (handled by cookies)

### Auth Hook (`hooks/useAuth.ts`)

```typescript
// src/hooks/useAuth.ts
import { useSession, signIn, signUp, signOut } from '@/lib/auth'

export function useAuth() {
  const session = useSession()

  return {
    session: session.data,
    user: session.data?.user,
    isLoading: session.isPending,
    isAuthenticated: !!session.data?.user,
    signIn,
    signUp,
    signOut: async () => {
      await signOut()
      // router navigation handled by caller or a 401 interceptor
    },
  }
}
```

### Data Flow (Target)

```
Route Component
  └─ useBudget(budgetId)
       ├─ useQuery(queryKeys.budgets.detail(id))       → GET /budgets/:id
       ├─ useActivateBudget(budgetId)                   → POST :id/activate
       │    └─ onSuccess → invalidate all + detail
       └─ useLockBudget(budgetId)                       → POST :id/lock
            └─ onSuccess → invalidate all + detail
```

Route components never call `useQuery`, `useMutation`, or `api` directly.

---

## 6. Component Architecture

### Layout Components

| Component | File | Purpose |
|---|---|---|
| `AppLayout` | `components/layout/AppLayout.tsx` | Full authenticated shell: sidebar nav + scrollable content |

### Presentational Components (Inline)

All page components define their own presentational markup inline. There is no shared component library — `components/ui/` is empty. Common patterns observed across pages:

- **Glass cards:** `<div className="glass-card">` wrapping content sections
- **Empty states:** Lucide icon + heading + description inside glass-card
- **Header bars:** Flex row with page title + CTA button
- **KPI cards:** Number + label + icon inside glass-card
- **Status badges:** Colored badge for budget status (`active` = green, `locked` = orange, `draft` = gray)

### Missing `btn-primary` Utility

Nine pages reference `btn-primary` as a CSS class for buttons, but this utility is **not defined** in `index.css`. Buttons using it will render unstyled.

---

## 7. Layout System

### AppLayout (`components/layout/AppLayout.tsx`)

The sole application layout, used for all authenticated pages via the `_authenticated` layout route.

```
┌──────────────┬──────────────────────────────────────────┐
│   Sidebar    │                                          │
│   (w-64)     │   Main Content                           │
│              │   (flex-1, overflow-y-auto, p-8)         │
│  ┌────────┐  │                                          │
│  │ Logo   │  │   ┌──────────────────────────────────┐   │
│  ├────────┤  │   │  <Outlet />  (page content)      │   │
│  │ Nav    │  │   │                                  │   │
│  │ Links  │  │   │  max-w-7xl, mx-auto              │   │
│  │        │  │   └──────────────────────────────────┘   │
│  │        │  │                                          │
│  ├────────┤  │                                          │
│  │ Logout │  │                                          │
│  └────────┘  │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Sidebar:**
- 7 navigation links: Dashboard, Budgets, Expenses, Fixed Expenses, Goals, Statements, Settings
- Active state: purple background with white text + glow shadow, determined by `pathname.startsWith(item.to)`
- Glass morphism styling (`.glass` utility)
- Logout button at the bottom, calls `signOut()` then hard redirects

**Main content:**
- Scrollable, padded (`p-8`)
- Subtle purple gradient overlay in background
- Max width constrained to `max-w-7xl`, centered

### Public Routes

Routes outside `_authenticated` (landing page, login) render without `AppLayout`. The `__root.tsx` wrapper provides only full-page background styling.

---

## 8. Authentication & Authorization

### Flow

1. User submits email/password on `/login`
2. `signIn.email()` calls better-auth → backend sets session cookie
3. On success: `navigate({ to: '/dashboard' })`
4. Subsequent API requests carry session cookie via `withCredentials: true`
5. Logout: `signOut()` clears session → hard redirect to `/login`

### Current State

| Feature | Status |
|---|---|
| Login form | Working (`signIn.email()`) |
| Session cookie | Working (`withCredentials: true` on Axios) |
| Auth guard (`beforeLoad`) | **Commented out** — all authenticated routes are publicly accessible |
| Session consumption | Not implemented — `useSession` exported but unused |
| Logout | Working, but uses `window.location.href` instead of router |
| Error handling | Basic — inline error message only |

### Gap: Auth Guard

The `_authenticated.tsx` `beforeLoad` contains a commented-out session check. The target pattern uses `hooks/useAuth.ts` to provide `isAuthenticated` and the auth guard calls `authClient.getSession()` directly in `beforeLoad`:

```typescript
// src/routes/_authenticated.tsx (target)
beforeLoad: async ({ location }) => {
  const { data: session } = await authClient.getSession()
  if (!session) {
    throw redirect({ to: '/login', search: { redirect: location.href } })
  }
},
```

This needs to be enabled to protect authenticated routes. The `search.redirect` parameter allows returning to the intended page after login.

---

## 9. Testing

**No frontend test framework is configured.** There are no test files, no Vitest/Jest config for the frontend, and no React Testing Library dependencies.

When adding tests, use **Vitest + React Testing Library** to match the Vite ecosystem (consistent with backend using Jest for its own tests).

---

## 10. Build & Configuration

### Build System (Vite)

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | Preview production build |
| `npm run lint` | Oxlint |

**Vite plugins (`vite.config.ts`):**
- `@vitejs/plugin-react` — React fast refresh via OXC
- `@tailwindcss/vite` — Tailwind CSS v4 integration
- `@tanstack/router-plugin/vite` — Auto-generates route tree from `src/routes/`

### Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:3000`) |

All `VITE_`-prefixed variables are exposed to the browser.

### TypeScript Configuration

| Config | Purpose |
|---|---|
| `tsconfig.json` | Root project references |
| `tsconfig.app.json` | App source (ES2023, bundler mode, React JSX) |
| `tsconfig.node.json` | Vite config (ES2023, bundler mode) |

### Deployment

The frontend is served as static files from the same Render.com web service as the backend (production). In development, the Vite dev server runs separately (typically port 5173) proxying API calls to `localhost:3000`.

---

## 11. Directory Structure

```
frontend/
├── .oxlintrc.json            # Oxlint configuration
├── .tanstack/                # TanStack Router temp files
├── index.html                # SPA entry point
├── package.json              # Dependencies and scripts
├── package-lock.json         # npm lockfile
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppLayout.tsx       # Authenticated app shell
│   │   └── ui/                      # Shared UI components
│   ├── hooks/                       # Domain-specific React Query hooks
│   │   ├── useAuth.ts              # useSession wrapper, signIn/signOut helpers
│   │   ├── useBudgets.ts           # GET /budgets, POST /budgets
│   │   ├── useBudget.ts            # GET /budgets/:id, activate, lock
│   │   ├── useExpenses.ts          # GET/POST/DELETE /expenses
│   │   ├── useGoals.ts             # GET/POST/PATCH /goals
│   │   ├── useFixedExpenses.ts     # GET/POST /fixed-expenses
│   │   ├── useStatements.ts        # POST /statements/upload, GET /statements
│   │   └── useAnalytics.ts         # GET /analytics/insights
│   ├── lib/
│   │   ├── api.ts                  # Axios instance
│   │   ├── auth.ts                 # better-auth client
│   │   ├── queryClient.ts          # QueryClient with global defaults
│   │   └── queryKeys.ts            # Query key factory
│   ├── routes/
│   │   ├── __root.tsx            # Root layout wrapper
│   │   ├── index.tsx             # Landing page (/)
│   │   ├── login.tsx             # Login page (/login)
│   │   ├── _authenticated.tsx    # Auth guard layout route
│   │   └── _authenticated/
│   │       ├── dashboard.tsx      # Dashboard (/dashboard)
│   │       ├── budgets/
│   │       │   ├── index.tsx      # Budgets list (/budgets)
│   │       │   └── $budgetId.tsx  # Budget detail (/budgets/:id)
│   │       ├── expenses/
│   │       │   └── index.tsx      # Expenses (/expenses)
│   │       ├── fixed-expenses/
│   │       │   └── index.tsx      # Fixed expenses (/fixed-expenses)
│   │       ├── goals/
│   │       │   └── index.tsx      # Goals (/goals)
│   │       ├── profile/
│   │       │   └── index.tsx      # Profile settings (/profile)
│   │       └── statements/
│   │           └── index.tsx      # Statements (/statements)
│   ├── types/                      # Shared TypeScript interfaces
│   │   └── index.ts
│   ├── index.css                # Global styles, Tailwind theme, glass utilities
│   ├── main.tsx                 # Application entry point
│   └── routeTree.gen.ts         # Auto-generated route tree
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```
