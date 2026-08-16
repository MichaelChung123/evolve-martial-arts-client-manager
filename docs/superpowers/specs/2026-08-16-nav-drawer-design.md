# Navigation Drawer — Design

**Date:** 2026-08-16
**Status:** Approved
**Reference:** `pontem-ui/src/components/layout/main/navDrawer/NavDrawer.vue`

## Context

`docs/superpowers/specs/2026-08-10-header-banner-design.md` put navigation
between sections out of scope, on the grounds that there was one authenticated
page. There still is. This design builds the shell that makes a second page
cheap to add, rather than waiting for the second page to force the shell.

What ships is a persistent left sidebar on wide viewports and a modal drawer on
narrow ones, driven by a single nav data module. The delivered value is the
shell, the data model, and the accessibility behavior — not the link count.

### Traits carried over from `NavDrawer.vue`

- **A data-driven menu.** `getNavItems()` returns a list and the template
  renders it. Items are data, not hand-written markup.
- **Active-route highlighting** derived from the router, not stored in state.
- **One drawer, two presentations.** Vuetify's `rail` and `mobile-breakpoint`
  props give the drawer a wide form and a narrow form from one definition.
- **A drawer-owned directory** with the menu's parts colocated.

### Traits deliberately not carried over

Each of these is a real feature in pontem with a real anchor there, and no
anchor in this repo today.

- **Grouping (`NavGroup[]`).** Pontem has roughly 50 items across 9 sections.
  Grouping one item is structure with nothing to hold.
- **Search over items** (`NavDrawer.vue:180-192`). Nothing to search.
- **Favorites with persistence** (`NavDrawer.vue:224-248`). Nothing to rank.
- **Rail mode and hover flyout menus.** Vuetify supplies rail behavior via a
  prop; here it is bespoke code — icons, tooltips, and a persisted collapse
  preference — bought for one item.
- **Feature-flag gating** (`flagStates`). This app has no flag system.
- **RBAC gating** (`hasPermission`). This app has no roles. When it gains them,
  `.claude/rules/security-privacy.md` requires the backend to be authoritative;
  a hidden nav item is a usability affordance, never an access control.
- **i18n keys.** This app has no i18n.
- **The `action: {type: 'route' | 'link'}` discriminant.** Pontem needs it
  because Vuetify list items dispatch to either `router.push` or `window.open`.
  Every item here is a `next/link` `href`, so the union collapses to a string
  and navigation stays declarative markup instead of an `execAction` dispatcher.
- **Icons.** Deferred until a library is chosen. `NavItem` gains no `icon` field
  until then; the seam is a string key plus a component-side map, which keeps
  `nav-items.ts` free of JSX.

## Scope

**In scope:** a persistent sidebar at `md` and above; a modal drawer below `md`
opened from a header toggle; a nav data module; active-item indication;
resolving the hamburger-icon collision in the existing account menu.

**Out of scope:** new routes or pages; grouping, search, favorites, rail mode,
flags, permissions, i18n, icons; breadcrumbs; theming; any backend change.

## The constraint that drives the design

**App Router layouts do not re-render on client-side navigation.**
`(app)/layout.tsx` renders once and its output is preserved across navigations
within the route group. A Server Component sidebar therefore cannot reflect the
current route — even given the pathname, it would never update.

This has no Vue Router equivalent. `NavDrawer.vue:53` reads
`router.currentRoute` as a `computed` inside a persistent shell and it simply
works, because the drawer instance stays mounted and reactive. Here, "persistent
shell" and "knows the current route" are in tension, and the client boundary is
where that tension is resolved: active state must come from `usePathname()`.

This collapses the design space. The nav list is client code regardless of any
other choice; the only open question was how much else joins it. The answer
taken here is: as little as possible.

## Architecture

```
src/app/(app)/
└─ layout.tsx                    MODIFIED  grid shell; stays a Server Component

src/components/layout/nav/
├─ nav-items.ts                  NEW  nav data; no framework imports
├─ nav-list.tsx                  NEW  "use client" — usePathname, active state
├─ nav-list.test.tsx             NEW
├─ app-sidebar.tsx               NEW  persistent md+ column (server)
├─ mobile-nav.tsx                NEW  "use client" — toggle + <dialog>
└─ mobile-nav.test.tsx           NEW

src/components/layout/header/
├─ app-header.tsx                MODIFIED  renders <MobileNav />, full-bleed inner
└─ account-menu.tsx              MODIFIED  hamburger → person icon

vitest.setup.ts                  MODIFIED  HTMLDialogElement test double
```

Only `nav-list.tsx` and `mobile-nav.tsx` carry `"use client"`. `app-sidebar.tsx`
is a Server Component that renders a Client Component, which is permitted and
keeps the shipped bundle to the two islands that need it.

### Layout

Header spans the full width. Below it, a grid: one column under `md`,
`[16rem_1fr]` at `md` and up.

```
DESKTOP (>= md)                 MOBILE (< md), drawer open
┌────────────────────────┐      ┌──────────┬───────────┐
│ Evolve MA      [acct]  │      │          │▒▒▒▒▒▒▒▒▒▒▒│
├────────┬───────────────┤      │ Students │▒▒ scrim ▒▒│
│Students│  Students     │      │          │▒▒▒▒▒▒▒▒▒▒▒│
│        │  roster       │      │          │▒▒▒▒▒▒▒▒▒▒▒│
└────────┴───────────────┘      └──────────┴───────────┘
```

`app-header.tsx` currently centers its inner element in a `max-w-6xl` box. With
a flush-left sidebar beneath it, the brand would sit inboard of the sidebar's
left edge. The inner element becomes full-bleed `px-6` so the two align. Page
content keeps its own `max-w-6xl` centering inside the content column.

### Data model

```ts
export type NavItem = {
  key: string;
  label: string;
  href: string;
};

export const navItems: NavItem[] = [
  { key: "students", label: "Students", href: "/" },
];
```

Flat by intent. Promotion to `NavGroup[]` when a third or fourth screen lands is
a contained change to this file plus `nav-list.tsx`.

### Component responsibilities

| Component | Owns | Depends on |
| --- | --- | --- |
| `nav-items.ts` | the menu's content | nothing |
| `NavList` | rendering items, active matching, firing `onNavigate` | `usePathname`, `navItems` |
| `AppSidebar` | the persistent column and its landmark | `NavList` |
| `MobileNav` | the toggle, the dialog, open/close | `NavList` |

`MobileNav` contains both the trigger and the drawer, so open state never leaves
it. Nothing is lifted into the layout and no state crosses a component boundary.

## Behavior

### Active state

`NavList` compares `usePathname()` to `item.href` by **exact equality** and marks
the match with `aria-current="page"` alongside the visual treatment.
`.claude/rules/react-nextjs.md` forbids relying on colour alone; `aria-current`
is the non-visual signal.

Exact matching is deliberate and temporary. The only item is `href: "/"`, and a
`startsWith` match against `"/"` would light up on every route. This carries a
comment saying so. When real screens land, the matcher needs revisiting — noted
under Follow-ups.

### The drawer holds no React state

`MobileNav` uses a `useRef` to the dialog, calls `showModal()` from the
trigger's `onClick` and `close()` from a link's `onClick`. There is no
`useState` and no `useEffect`.

The reasoning, since the obvious design is the opposite: with `isOpen` state
plus an effect calling `showModal()`/`close()`, the browser closes the dialog on
Escape without informing React, so `isOpen` goes stale immediately. Repairing
that requires wiring the native `close` event back into `setIsOpen(false)` —
after which the state buys nothing, because no rendering depends on it. It would
be a mirror of state the DOM already owns authoritatively, and mirrors drift.

This is the sharpest Vue contrast in the feature. `v-model="drawer"` at
`NavDrawer.vue:707` is *correct* there: Vuetify's drawer has no independent DOM
state, so a reactive ref is genuinely the single source of truth. Here the
platform element owns its own state, and reaching for a ref is the documented
escape hatch rather than a workaround.

### What `showModal()` provides, and what it does not

| Behavior | Source |
| --- | --- |
| Focus trapped within the drawer | browser |
| Escape closes | browser |
| Background inert to pointer and assistive technology | browser |
| Focus restored to the trigger on close | browser |
| Scrim | `::backdrop`, styled with Tailwind's `backdrop:` variant |

Each of these is hand-rolled in `account-menu.tsx:37-60` for the account
dropdown. Choosing `<dialog>` here means not writing them a second time.

Still to be written:

1. **Close on navigate.** An `onNavigate` callback passed to `NavList`, fired
   from the link's `onClick`. An event handler, not an effect — and an effect
   would be actively wrong, because tapping the link for the current page does
   not change the pathname, so a pathname-watching effect would never fire and
   the drawer would stay open.
2. **Backdrop click to close.** Not free. The `::backdrop` belongs to the
   dialog's own box, so this is an `onClick` on the dialog comparing
   `event.target` to the dialog element.
3. **Resetting `<dialog>` defaults.** It ships centred with a border and margin;
   a left-edge, full-height drawer overrides those explicitly.

### Landmarks

`AppSidebar` renders `<aside class="hidden md:block">` containing
`<nav aria-label="Main">`. `MobileNav` is `md:hidden` and its dialog contains a
nav with the same label. The two are never simultaneously in the accessibility
tree: `hidden` removes the sidebar below `md`, and `md:hidden` removes the
entire mobile island above it. There is no duplicate-landmark condition.

### Icon collision

`account-menu.tsx:87` currently draws a hamburger (`M4 6h16M4 12h16M4 18h16`) as
the account trigger. The mobile drawer toggle needs that glyph. Two hamburgers in
one header is a usability defect, so the hamburger goes to navigation on the left
and the account menu takes a person glyph on the right — the convention users
already hold. Its `aria-label="Account menu"` is unchanged, which is what
`app-header.test.tsx` asserts against.

## Testing

### The jsdom constraint

Probed directly against the installed version:

```
jsdom 30.0.1
HTMLDialogElement            exists as a class
.open                        reflects the attribute
.show / .showModal / .close  all undefined
```

The approach that wins on accessibility loses on testability. jsdom supplies the
element type and attribute reflection and none of the methods, so the browser
behaviors relied upon are also the behaviors jsdom cannot verify.

### Automated

- **`nav-list.test.tsx`** — the bulk of the coverage, and it touches no dialog.
  A link renders per item with the right `href`; the matching item carries
  `aria-current="page"` and non-matching items do not; `onNavigate` fires on
  click. `usePathname` is mocked, following the precedent at
  `app-header.test.tsx:8-10`.
- **`mobile-nav.test.tsx`** — the trigger opens the drawer; clicking a nav link
  closes it; a backdrop click closes it. Requires the test double below.
- **`app-header.test.tsx`** — the four existing tests must stay green, and one
  is added for the nav toggle's presence.

### The `HTMLDialogElement` test double

Roughly ten lines in `vitest.setup.ts` implementing `show`, `showModal`, and
`close` against the `open` attribute plus the `close` event. Two constraints on
how it is understood: it is **test-only and never shipped**, and it verifies
**our wiring**, not the browser's modal semantics. Since `<dialog>` was chosen
precisely so that focus trapping is not implemented here, there is no code of
ours to unit test in that area.

### Manual verification

Five behaviors are depended upon and cannot be asserted in jsdom. Checked once,
in a real browser, as a required step:

1. Focus is trapped inside the open drawer.
2. Escape closes it.
3. Focus returns to the trigger on close.
4. Content behind the drawer is not reachable by keyboard.
5. Whether the page behind the modal scrolls. **Open question** — modern
   browsers are believed to prevent it, but this is unverified. If it scrolls, a
   scroll lock is added; if not, code is saved.

### Not doing

No Playwright. `.claude/rules/testing.md` reserves end-to-end tests for
high-value journeys; opening a nav menu is not one, and it would mean adopting a
foundational dependency to test a few lines of wiring.

## Implementation split

Per the Teaching Contract in `CLAUDE.md`.

| Mechanical (Claude) | Concept-critical (`// TODO(you):`) |
| --- | --- |
| `nav-items.ts` data | `NavList` active-match and `aria-current` logic |
| `layout.tsx` grid, `app-sidebar.tsx` wrapper | `MobileNav` ref and imperative open/close wiring |
| Tailwind markup, `<dialog>` style reset | backdrop-click and close-on-navigate handlers |
| account icon swap, header layout | `"use client"` placement decisions |
| `vitest.setup.ts` double, empty test blocks | every test assertion |

The right-hand column maps to the Learning Objectives this feature exercises:
Server and Client Components, server/client boundaries, App Router architecture,
rendering behavior, and accessibility.

## Consequences

- The client bundle grows by two small islands. The layout, the sidebar wrapper,
  and the header remain server-rendered.
- `<dialog>` requires a test double in every suite that renders `MobileNav`.
- Adding a screen becomes a one-line change to `nav-items.ts` plus the route —
  which is the point of building the shell before the screens.
- Exact-match active state is correct for one item and will need revisiting.

## Follow-ups

- **`middleware.ts` matcher.** `src/middleware.ts:20` lists routes explicitly
  (`["/", "/login", "/signup"]`). It needs no change here, since no route is
  added — but the next screen added will silently skip the authentication
  redirect unless the matcher is updated with it. Recorded here rather than
  fixed, to keep this change scoped.
- **Active matching** beyond exact equality, once nested routes exist.
- **Icons**, once a library is chosen.
- **Grouping**, once the item count justifies it.
