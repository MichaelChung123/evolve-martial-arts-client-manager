# Header Banner — Design

**Date:** 2026-08-10
**Status:** Approved
**Reference:** `pontem-ui/src/components/layout/main/navBar/NavBar.vue`

## Context

`apps/web/src/app/page.tsx` renders an inline `<header>` that mixes three unrelated
concerns: the school brand, the logout control, and the Students page title. Any
second authenticated page would have to duplicate the brand and logout markup.

This design extracts a persistent header banner shown on every authenticated
route, structured after the pontem-ui `NavBar.vue` component the author already
knows from Vue.

### Traits carried over from `NavBar.vue`

- The bar is **thin composition** over small single-purpose children, not a
  monolith. `NavBar.vue` itself is layout plus a spacer; each child owns one job.
- Children live in a **directory belonging to the bar**.
- Tests are **colocated** with the component they cover (`*.spec.ts` there,
  `*.test.tsx` here).
- **Accessibility is explicit**: a banner landmark, and every control carries an
  accessible name.

### Traits deliberately not carried over

- **Per-child directories.** `navBar/layout/AccountButton/AccountButton.vue`
  earns its folder by having a sibling component and a `__snapshots__/` dir. A
  folder holding one 40-line file is ceremony. Promotion later is a `git mv`.
- **Snapshot tests.** Every pontem spec ends in `toMatchSnapshot()`. Against
  Tailwind class strings these churn on every styling tweak while asserting
  nothing about behavior. `.claude/rules/testing.md` asks for observable
  behavior instead.
- **`role="menu"` semantics.** Vuetify's `v-menu` gives pontem full menu
  keyboard behavior for free. Hand-rolling APG menu semantics — roving
  tabindex, arrow-key navigation — is disproportionate for one label and one
  action. See "Account menu" below.
- **Theme-swapped logo.** `NavLogo.vue` swaps asset by theme; this app has no
  dark theme.

## Scope

**In scope:** a persistent banner on authenticated routes containing a brand
wordmark linking home, and an account menu disclosing the signed-in user's
email and a logout action. Frontend test tooling, which does not yet exist.

**Out of scope:** navigation links between sections (there is one authenticated
page); page titles, which stay with their page; theming; notifications;
breadcrumbs; the logo image asset.

## Architecture

```
app/
├─ layout.tsx                    root — fonts + QueryProvider (unchanged)
├─ login/page.tsx                unchanged
├─ signup/page.tsx               unchanged
└─ (app)/
   ├─ layout.tsx                 NEW  async server — requireCurrentUser + AppHeader
   ├─ error.tsx                  NEW  error boundary for the authenticated shell
   └─ page.tsx                   MOVED from app/page.tsx, inline header removed

src/components/layout/header/
├─ app-header.tsx                thin composition (server)
├─ header-brand.tsx              wordmark → "/" (server)
├─ account-menu.tsx              "use client"
├─ account-menu.test.tsx
└─ app-header.test.tsx

src/lib/auth-server.ts           NEW  server-only user fetch
src/lib/auth-server.test.ts      NEW

src/components/auth/logout-button.tsx    DELETED
```

`(app)` is a route group: it organizes files without becoming a URL segment, so
the students page stays at `/`. Every route inside it is guaranteed
authenticated by `middleware.ts`, so the layout needs no null-user branch.

## Data flow

```
request → middleware.ts                    session cookie present?
            ↓
        (app)/layout.tsx                   async server component
            ↓  requireCurrentUser()
            ↓    cookies() from next/headers
            ↓    GET /api/auth/me   Cookie: session_token=…
            ↓
        <AppHeader userEmail={user.email} />
            ├─ <HeaderBrand />             server, static
            └─ <AccountMenu userEmail />   ← client boundary starts here
                   useState(open) + useMutation(logout)
```

### Why `lib/auth-server.ts` is a new file

`next/headers` is server-only. `lib/auth.ts` is imported by client components,
so adding that import there breaks the build. The split is forced by the
server/client boundary, not by preference.

Every existing fetch in this app is client-side. `lib/api.ts` sets
`credentials: "include"`, a browser-only option that does nothing in a Server
Component — Node's fetch has no cookie jar. The session cookie must be read and
forwarded as an explicit `Cookie` header. `apiRequest` already spreads
`...options?.headers`, so it needs no modification.

### Caching

None, deliberately. Calling `cookies()` opts the route into dynamic rendering,
and Next 15+ defaults `fetch` to uncached. Identity is re-fetched per request,
which is correct and cheap.

## Components

### `requireCurrentUser()` — `src/lib/auth-server.ts`

```ts
export async function requireCurrentUser(): Promise<User>
```

Reads the session cookie via `cookies()`, calls `/api/auth/me` with an explicit
`Cookie` header, returns the `User`. On `ApiError` with `status === 401`, calls
`redirect("/login")`.

Extracted from the layout rather than written inline **for testability**: React
Testing Library cannot render async Server Components, so logic left inside the
layout would be unreachable by unit tests. As a plain async function it is
testable with mocked `next/headers` and `next/navigation`.

### `HeaderBrand` — server, no props

A `next/link` to `/` containing the text "Evolve Martial Arts".

No `aria-label`. `NavLogo.vue` needs `aria-label="Home Page"` because it wraps
an image with no text content; a text link already has an accessible name, and
an aria-label would only override it.

**Follow-up:** the wordmark will be replaced by an image asset the author
supplies later. That swap is contained to this file — no consumer reads
anything but the rendered link.

### `AppHeader` — server, `{ userEmail: string }`

A `<header>` laid out `flex items-center justify-between`, which is the
equivalent of pontem's `<v-spacer />`. Renders `HeaderBrand` then `AccountMenu`.

No explicit `role="banner"`. `<header>` carries that role implicitly when not
nested inside `<main>`, `<article>`, or `<section>`; this one sits in the layout
above `<main>`. Pontem sets it explicitly because `v-app-bar` renders a bare
`<div>`.

### `AccountMenu` — `"use client"`, `{ userEmail: string }`

State: `useState(false)` for open/closed, plus a TanStack Query mutation
wrapping `logout`.

**Disclosure pattern, not a menu:**

```
<button aria-expanded={isOpen} aria-controls="account-menu"
        aria-label="Account menu">                 inline SVG glyph
<div id="account-menu" hidden={!isOpen}>
   <p>{userEmail}</p>                    non-interactive
   <button onClick={logout}>Log out</button>
```

The trigger's visible content is an **inline SVG** hamburger glyph, so it needs
`aria-label="Account menu"` to have an accessible name. No icon library is
installed in `apps/web`, and adding one for a single glyph is not justified;
`AccountButton.vue` uses `fa-bars` only because Font Awesome is already a
pontem dependency.

Behavior: click toggles; Escape closes and returns focus to the trigger; an
outside click closes; the logout button is disabled while the mutation is
pending. Escape and outside-click use a `useEffect` with document listeners —
genuine synchronization with an external system, which is the case
`.claude/rules/react-nextjs.md` sanctions, not an effect substituting for an
event handler.

On success: `queryClient.clear()` then `router.push("/login")`, preserving the
behavior in the deleted `logout-button.tsx`.

The logout mutation is inlined here rather than extracted into a `useLogout`
hook. Pontem's `useLogout` composable earns extraction by having multiple
consumers; here there is exactly one. Extract when a second appears.

## Error handling

| Failure | Behavior |
|---|---|
| No session cookie | `middleware.ts` redirects to `/login` (existing) |
| Stale/invalid cookie → 401 | `requireCurrentUser` redirects to `/login` |
| API unreachable → 5xx | Bubbles to `app/(app)/error.tsx` with a retry control |
| Logout mutation fails | Inline error in the panel; panel stays open; button re-enabled |

`app/(app)/error.tsx` must be a Client Component (`"use client"`) — Next.js
error boundaries rely on React error boundaries, which are client-only. It
receives `{ error, reset }` and renders a retry control wired to `reset`.

The 401 case addresses a latent bug: `middleware.ts` checks only that the
session cookie *exists*, never that it is valid. A stale cookie passes the
middleware, and without handling would surface as an error page rather than a
login redirect. It is currently invisible because nothing server-side has ever
called the API.

The logout row is an improvement — `logout-button.tsx` discards mutation
failures silently, making a failed logout indistinguishable from a successful
one.

## Testing

`apps/web` has no test runner today: no vitest, no jest, no test script, no test
files. The root `turbo run test` task exists but no-ops for web. Setting this up
is the first task, and it unblocks all future frontend testing.

**Tooling:** `vitest`, `@vitejs/plugin-react`, `jsdom`,
`@testing-library/react`, `@testing-library/user-event`,
`@testing-library/jest-dom`. Adds `vitest.config.mts` (mirroring the `@/*` →
`./src/*` alias from `tsconfig.json`), `vitest.setup.ts`, and a
`"test": "vitest run"` script. The config uses the `.mts` extension so Vite
loads it as ESM; `.ts` triggers a CJS loader warning.

Per the Teaching Contract as applied on this branch: the assistant scaffolds
fixtures, mocks, and empty test blocks, each carrying a `TODO(you):` question;
the author writes the assertions, confirms they fail, then writes the
implementation. The assistant reviews rather than rewrites.

**`account-menu.test.tsx`**
- panel hidden on first render
- clicking the trigger reveals the email
- `aria-expanded` reflects open state
- Escape closes the panel and returns focus to the trigger
- Log out calls `logout`, then navigates to `/login`
- a failed logout shows an error and leaves the panel open
- the logout button is disabled while pending
- a click outside the menu closes the panel

**`auth-server.test.ts`**
- forwards the session cookie as a `Cookie` header
- returns the user on 200
- redirects to `/login` on 401
- rethrows errors that are not 401

**`app-header.test.tsx`**
- renders a banner landmark containing the brand link and the account trigger

**Not unit tested:** `(app)/layout.tsx`. It is an async Server Component that
RTL cannot render, and it is glue — the logic worth testing was deliberately
extracted into `requireCurrentUser`.

## Consequences

- The students page moves from `app/page.tsx` to `app/(app)/page.tsx`. The URL
  is unchanged.
- `components/auth/logout-button.tsx` is deleted; `AccountMenu` owns logout.
- The app gains a frontend test runner, and `turbo run test` becomes meaningful
  for web.
- The first server-side API call establishes the cookie-forwarding pattern that
  future Server Component data access will follow.
- A latent stale-session bug gains correct handling.

## Concepts exercised

Route groups and nested layouts · the server/client boundary and why it forces
module splits · cookie forwarding in Server Component fetches · dynamic
rendering triggered by `cookies()` · effects as external-system
synchronization · disclosure vs. menu ARIA patterns · designing for testability
by extracting logic out of untestable shells.
