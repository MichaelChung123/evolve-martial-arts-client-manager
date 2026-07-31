---
paths:
  - "apps/web/**/*.{ts,tsx}"
---

# React and Next.js

## Modern React Standards

Always prefer modern React patterns.

Use:

- Functional components
- Hooks
- TypeScript
- Composition
- Server Components where appropriate
- Client Components only when interactivity or browser APIs require them
- Suspense-aware architecture where it improves the user experience
- URL search parameters for shareable filtering, sorting, and pagination state

Avoid:

- Class components
- Legacy lifecycle methods
- Deprecated APIs
- Effects used as a substitute for event handlers or derived values
- Copying props into state without a clear reason
- Large components that mix fetching, business logic, and presentation
- Historical Redux patterns unless discussing legacy systems

Do not add `"use client"` preemptively. Keep the client boundary as narrow as practical.

## Vue-to-React Mapping

When introducing a React concept, explain the closest Vue equivalent where useful.

- `ref()` ↔ `useState()`
- `reactive()` ↔ state objects, reducers, or external stores
- `computed()` ↔ values derived during render; sometimes `useMemo()`
- `watch()` ↔ `useEffect()` only for external synchronization
- composables ↔ custom hooks
- Pinia ↔ Zustand or another external store
- slots ↔ `children`, component props, or render props
- provide/inject ↔ Context
- Vue Router query state ↔ Next.js search parameters and navigation APIs
- Vue templates ↔ JSX

Always call out where the comparison breaks down. In particular:

- React state updates schedule a render; they do not mutate reactive values in place.
- React components execute again during rendering.
- `useEffect()` is not a direct replacement for every Vue watcher.
- A derived value normally belongs in render logic rather than state.
- Hook call order is part of React's programming model.

## React Mental Models

Continuously reinforce:

- React is render-driven.
- Components are re-executed during rendering.
- State is a snapshot for a particular render.
- State changes schedule future renders.
- Effects synchronize React with external systems.
- Derived state should usually not be stored.
- Event-specific logic belongs in event handlers.
- Server and client components have different responsibilities.
- Data location should be chosen deliberately.

When reviewing code, identify:

- Unnecessary effects
- Derived state stored in state
- Stale closures
- Accidental mutation
- Unstable dependencies
- Unnecessary memoization
- Excessive prop drilling
- Oversized client boundaries
- Rendering inefficiencies
- Missing loading, empty, and error states

## State and Data-Fetching Guidance

Choose the smallest appropriate state mechanism.

### Local UI State

Prefer `useState`, or `useReducer` when transitions or related updates become complex. Examples: dialog visibility, temporary form UI, selected tabs, unsaved local interactions.

### URL State

Prefer URL search parameters for search terms, filters, sorting, pagination, and selected views that should survive refresh or be shareable.

### Server State

Prefer server-side data access in Server Components when it fits the page.

Use TanStack Query for interactive client-side server state when the feature benefits from background refetching, client-side caching, mutations with invalidation, optimistic updates, polling, or complex client transitions.

Do not automatically use TanStack Query for every request.

Avoid fetching data inside `useEffect()` unless there is a clear browser-only synchronization reason.

### Shared Client State

Use Zustand only for genuinely shared client state that is not server state or URL state. Explain why a store is needed before adding one.

### Context

Use Context for stable cross-cutting dependencies or configuration, not as a default global-state solution.

## Next.js Standards

Prefer:

- App Router
- Server Components by default
- Route groups when they improve organization
- Route Handlers for Next.js-owned HTTP endpoints
- Server Actions when appropriate for server-side mutations initiated by the Next.js UI
- Explicit caching and revalidation decisions
- `loading.tsx`, `error.tsx`, and not-found handling where appropriate
- Metadata APIs
- Accessible navigation and forms

Explain:

- Why code belongs on the server or client
- Bundle-size and hydration implications
- Whether data is cached
- When data becomes stale
- How mutations cause the UI to update
- Why a Server Action, Route Handler, or FastAPI endpoint is being used

Because this project includes a dedicated Python backend, prefer FastAPI for core domain APIs and business logic. Use Next.js Route Handlers or Server Actions only when they clearly improve the web application's boundary or orchestration. Do not create two competing backends.

## Forms and Validation

Use React Hook Form for complex interactive forms, Zod for frontend validation and type inference, accessible labels and validation messages, and server-side validation as the final authority.

Keep frontend and backend validation conceptually aligned, but do not create brittle duplication solely to force one schema system across both languages.

For forms involving students or guardians:

- Handle optional fields intentionally.
- Distinguish missing values from empty strings.
- Support minors without assuming all students require guardian data.
- Prevent accidental loss of unsaved changes when appropriate.
- Include success, error, submitting, and disabled states.

## Accessibility and UX

Treat staff efficiency and accessibility as requirements.

Use semantic HTML, keyboard-accessible interactions, visible focus states, proper labels and descriptions, accessible dialogs and menus, clear error/empty/loading/success states, confirmation for destructive or difficult-to-reverse actions, and responsive layouts suitable for desktop and tablet use.

Do not rely on color alone to communicate membership, attendance, or status information.

Prefer straightforward administrative interfaces over decorative complexity.

## Frontend conventions

- Tailwind CSS for styling.
- Do not use Create React App.
- Do not recommend `useMemo`, `useCallback`, or `React.memo` without a measured or clearly justified reason. Explain what work currently occurs, what bottleneck is expected or observed, why the optimization helps, its complexity and maintenance cost, and how to verify the benefit.
