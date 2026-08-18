# Collapsible Nav Sidebar — Design

**Date:** 2026-08-17
**Status:** Approved
**Supersedes:** the "Rail mode" exclusion in
`docs/superpowers/specs/2026-08-16-nav-drawer-design.md`
**Reference:** `pontem-ui/src/components/layout/main/navDrawer/NavDrawer.vue`

## Context

The nav-drawer design listed rail mode under "Traits deliberately not carried
over," on this reasoning:

> **Rail mode and hover flyout menus.** Vuetify supplies rail behavior via a
> prop; here it is bespoke code — icons, tooltips, and a persisted collapse
> preference — bought for one item.

That reasoning is reversed here deliberately, not refuted. The item count has
not changed. What has changed is the judgment about when to build the shell, and
it is the same judgment the previous design already made about the sidebar
itself: *build the shell that makes the next screen cheap, rather than waiting
for the next screen to force it.* Collapse is part of that shell.

Two costs the earlier design named are being paid rather than avoided:

- **Icons.** The earlier spec deferred them but pre-designed the seam: "the seam
  is a string key plus a component-side map, which keeps `nav-items.ts` free of
  JSX." That seam is cashed in here, without adding a dependency.
- **A persisted preference.** Paid with a cookie, which turns out to be the part
  of this feature with the most to teach.

One cost is still not paid: **hover flyout menus** (`NavDrawer.vue:774-814`).
Pontem needs them because a collapsed rail hides ~50 item labels behind icons.
One icon needs a tooltip, not a menu system.

## Decisions

| Question | Choice | Rejected |
| --- | --- | --- |
| What the rail shows | inline SVG icons, key → component map | initial letters; hiding the sidebar outright |
| Persistence | cookie, read by the Server Component layout | `localStorage`; no persistence |
| Toggle placement | chevron on the sidebar's right edge | header button; a row inside the sidebar |

`localStorage` was rejected on a specific defect: it can only be read after
mount, so the server renders a 16rem sidebar, the client corrects it to 4rem,
and every page load shows a visible snap. The cookie is present on the request,
so the first paint is already right.

## Scope

**In scope:** an `icon` field on `NavItem` and a glyph map; a collapsed
presentation of `NavList`; an edge toggle; collapse state in `AppSidebar`; a
cookie written on toggle and read in `(app)/layout.tsx`.

**Out of scope:** hover flyout menus; grouping; search; favorites; any change to
the mobile drawer's behavior; any backend change; new routes.

The mobile drawer gains icons, because it renders the same `NavList`. It gains
nothing else — it has no collapsed state and never will, since a modal drawer
that collapses to a rail is a contradiction.

## The constraint that drives the design

The previous design turned on *App Router layouts do not re-render on
client-side navigation*. This one turns on a different property of the same
boundary: **the cookie is readable only on the server, and the state is
changeable only on the client.**

The read must happen in `(app)/layout.tsx`, because that is where a
`next/headers` `cookies()` call can see the request. The write must happen in a
click handler, because that is where the user is. So the value crosses the
boundary exactly once, downward, as a prop:

```
(app)/layout.tsx  [server]   cookies().get(...)  ──►  defaultCollapsed
                                                          │
app-sidebar.tsx   [client]   useState(defaultCollapsed) ◄─┘
                             onToggle → document.cookie
```

This is the ordinary "server reads, client owns" shape, and naming it is the
point: the prop is not the state, it is the *seed* for the state. After mount,
the cookie and React state are two independent copies of the same fact, and they
are allowed to be, because nothing re-reads the cookie until the next full page
load.

`requireCurrentUser()` (`lib/auth-server.ts:16`) already awaits `cookies()`, so
the route is dynamic already. The second read adds no rendering cost.

### Why React state here, when the drawer refused it

The nav-drawer design argued at length against `useState` for the mobile drawer,
and that argument is worth re-reading precisely because **it does not apply
here**:

> the browser closes the dialog on Escape without informing React, so `isOpen`
> goes stale immediately.

The condition that forced a ref was an *external mutator* — the browser changing
the truth behind React's back. Nothing external collapses the sidebar. The only
thing that can change it is our own button. There is no second writer, so there
is no mirror and nothing to drift, and `useState` is simply correct.

The general rule the two cases share: **hold state in React when React is the
only writer; read the DOM when the platform is a writer too.** Same rule, two
outcomes.

### Why the grid track becomes `auto`

`(app)/layout.tsx:8` pins the sidebar column at `16rem`. If the width lives
there, the layout must re-render to change it — and the layout is a Server
Component holding a `cookies()` call. Pushing the width down into the aside and
letting the track size to its contents keeps the layout server-rendered and
untouched by the toggle:

```
md:grid-cols-[16rem_minmax(0,1fr)]  →  md:grid-cols-[auto_minmax(0,1fr)]
```

`minmax(0,1fr)` stays for the reason already commented there: a bare `1fr`
refuses to shrink below its content's min-content width.

## Architecture

```
src/app/(app)/
└─ layout.tsx                MODIFIED  reads the cookie; grid track → auto

src/components/layout/nav/
├─ nav-items.ts              MODIFIED  NavItem gains `icon: NavIconKey`
├─ nav-icons.tsx             NEW       key → inline SVG map
├─ nav-preferences.ts        NEW       cookie name + formatter, one definition
├─ nav-preferences.test.ts   NEW
├─ nav-list.tsx              MODIFIED  renders icons; `collapsed` presentation
├─ nav-list.test.tsx         MODIFIED
├─ sidebar-toggle.tsx        NEW       the edge chevron (presentational)
├─ app-sidebar.tsx           MODIFIED  server → client; owns collapse state
└─ app-sidebar.test.tsx      NEW
```

`app-sidebar.tsx` crosses from Server Component to Client Component. That is a
real cost and it is small: it renders `NavList`, which was already client, and
it adds roughly forty lines to the bundle. The layout, the header, and the page
content stay server-rendered.

`sidebar-toggle.tsx` carries **no** `"use client"` directive. It is only ever
imported by a Client Component, so it is already inside the client graph. The
directive marks a boundary, not every file on the far side of one.

### Data model

```ts
export type NavIconKey = "users";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: NavIconKey;
};
```

`NavIconKey` is declared in `nav-items.ts`, not `nav-icons.tsx`, so the data
module keeps depending on nothing. `nav-icons.tsx` imports the type and declares
its map as `Record<NavIconKey, ...>`, which makes a missing glyph a compile
error rather than a blank rail.

### Component responsibilities

| Component | Owns | Boundary |
| --- | --- | --- |
| `nav-items.ts` | the menu's content | none |
| `nav-icons.tsx` | glyphs, keyed | client graph |
| `nav-preferences.ts` | the cookie's name and format | shared |
| `NavList` | items, active matching, both presentations | **client** |
| `SidebarToggle` | the button's markup and ARIA | client graph |
| `AppSidebar` | collapse state, the cookie write, the landmark | **client** |
| `(app)/layout.tsx` | reading the cookie, the grid | server |

## Behavior

### Widths

Expanded `16rem` (`md:w-64`), collapsed `4rem` (`md:w-16`), with
`transition-[width] duration-200` and `motion-reduce:transition-none`. Below
`md` the aside stays `hidden`, so the rail and its toggle are absent on mobile
without any extra breakpoint work.

### The label does not disappear

Collapsing is a **visual** affordance. The label stays in the DOM under
`sr-only`, so the link's accessible name is `"Students"` at every width. A
screen-reader user gets no benefit from a narrower column and must not be
punished by one.

The icon is `aria-hidden="true"` in both presentations — it duplicates the
label, and an unhidden decorative glyph would pollute the name.

A `title` attribute is added **only when collapsed**, giving pointer users the
native tooltip that pontem builds with `v-tooltip` (`NavDrawer.vue:836-843`).
`title` is safe alongside the `sr-only` label: the accessible-name algorithm
prefers text content over `title`, so the name is unchanged either way.

### The toggle's ARIA

```
aria-expanded  = !collapsed
aria-controls  = the nav's id
aria-label     = "Collapse navigation" | "Expand navigation"
```

This is the conventional pattern and it is not beyond argument — see Follow-ups.

### The cookie

```
nav-collapsed=1; path=/; max-age=31536000; samesite=lax
```

Not `httpOnly`: the client must write it, and it holds a UI preference with no
personal data, so `.claude/rules/security-privacy.md` has nothing to say against
it. `path=/` so the preference survives navigation to any future screen.

A Server Action calling `cookies().set()` was the alternative. It was rejected
because it puts a server round-trip in the path of a purely visual toggle.

## Testing

Everything in this feature is testable in jsdom. There is no repeat of the
`<dialog>` problem — no new platform API is being relied on.

- **`nav-preferences.test.ts`** — a pure formatter. Cheap, and it pins the
  attributes (`path`, `max-age`) that a browser check would otherwise be needed
  to catch.
- **`nav-list.test.tsx`** — the five existing tests must stay green unchanged;
  that is itself the assertion that icons stayed decorative. Added: the icon is
  `aria-hidden`; the accessible name survives collapse; `title` appears only when
  collapsed.
- **`app-sidebar.test.tsx`** — `defaultCollapsed` seeds the initial state; the
  toggle flips `aria-expanded`; the nav link stays reachable by name when
  collapsed; toggling writes the cookie.
- **`mobile-nav.test.tsx`** — unchanged, and must stay green. It is the check
  that the mobile drawer was not disturbed.

`SidebarToggle` gets **no** test file of its own. It has no behavior beyond the
props it is handed, and `app-sidebar.test.tsx` exercises it through the
component that owns it. `.claude/rules/testing.md` asks for observable
behavior, not a test per file.

Deliberately not asserted: the width classes. Which Tailwind class produces
4rem is a styling detail; `aria-expanded` is the semantic truth and is what the
tests read.

### Manual verification

1. The toggle collapses the sidebar to a rail and the content column reclaims
   the space.
2. Reload with the sidebar collapsed — it stays collapsed, with **no width flash
   on first paint**. This is the whole reason the cookie was chosen over
   `localStorage`; if it flashes, the design failed.
3. The chevron rotates, and the transition is suppressed under
   `prefers-reduced-motion`.
4. Tab reaches the toggle, the focus ring is visible, and Enter and Space both
   fire it.
5. Below `md` the rail and toggle are absent, and the mobile drawer still opens,
   traps focus, and closes on Escape.
6. Icons render in the mobile drawer as well as the sidebar.

## Implementation split

Per the Teaching Contract in `CLAUDE.md`.

| Mechanical (Claude) | Concept-critical (`// TODO(you):`) |
| --- | --- |
| `nav-icons.tsx` SVG paths and the map | the `cookies()` read and prop threading in the layout |
| `NavItem.icon` field and data | `useState(defaultCollapsed)` — seed vs. sync |
| Tailwind classes for both widths | the toggle handler, and which value the cookie write uses |
| `SidebarToggle` markup | `"use client"` placement on `app-sidebar.tsx` |
| `nav-preferences.ts` skeleton | collapsed rendering in `NavList` (`sr-only` vs. removal) |
| empty test blocks, fixtures | every test assertion |

The right column maps to the Learning Objectives this exercises: **Server and
Client Components**, **server versus client boundaries**, **state snapshots and
hooks**, **App Router architecture**, and **accessibility**.

## Consequences

- `AppSidebar` moves to the client. The nav column is now entirely client JS.
- The nav's width becomes a per-browser preference with a one-year memory. A
  shared workstation carries one staff member's choice to the next.
- `NavItem` now requires an `icon` for every entry, so adding a screen means
  drawing a glyph. Enforced by the compiler, which is the intent.
- Rail mode exists ahead of the item count that would justify it, exactly as the
  sidebar did. The bet is the same bet.

## Follow-ups

- **`aria-expanded` on a rail.** A collapsed rail is still visible and still
  navigable, so calling it "not expanded" is a stretch of the attribute's
  meaning. The convention is widespread and the alternative — a static label
  plus no state attribute — tells the user less. Revisit if a real screen-reader
  pass says otherwise.
- **Hover flyout menus**, if the item count ever approaches pontem's.
- **Icon library**, if the hand-drawn glyph count outgrows a single file.
- **Per-user rather than per-browser persistence**, if a staff-preferences
  endpoint ever exists. Pontem stores this server-side
  (`useNavDrawer.ts:53-64`); this app has nowhere to put it.
