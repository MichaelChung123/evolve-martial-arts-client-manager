# Collapsible Nav Sidebar Implementation Plan

> **Execution mode — deliberate deviation from the writing-plans template.**
> The template hands this to `superpowers:subagent-driven-development`.
> `CLAUDE.md` disables that skill by default and states that `CLAUDE.md` wins on
> conflict. This plan is therefore written for **in-session execution under the
> Teaching Contract**, not for an agentic worker.
>
> Steps marked **`TODO(you)`** are deliberately unfilled. They are not plan
> failures — they are the concept-critical decisions `CLAUDE.md` reserves for
> the author, each carrying one guiding question. Every mechanical step is
> complete and copy-ready. Say **"show me the answer"** to have any specific
> `TODO(you)` filled in with reasoning.

**Goal:** Let the desktop sidebar collapse to a 4rem icon rail, and remember the
choice across page loads without a flash on first paint.

**Architecture:** `AppSidebar` becomes a Client Component holding the collapse
state and writing a cookie on toggle. `(app)/layout.tsx` stays a Server
Component and reads that cookie to seed the initial state, so the server's first
paint is already correct. The grid's sidebar track becomes `auto` so the aside
owns its own width.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Vitest + jsdom +
Testing Library. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-17-nav-sidebar-collapse-design.md`

**Branch:** this depends on `nav-items.ts`, `nav-list.tsx`, and
`app-sidebar.tsx`, which exist only on `feature/nav-drawer` — currently 9
commits ahead of `main` and unmerged. See Task 0.

## Global Constraints

- **pnpm only.** Never npm or yarn. **No new dependencies** — the icons are
  hand-written SVG, not a library.
- **`"use client"` moves to exactly one new file:** `app-sidebar.tsx`.
  `(app)/layout.tsx`, `app-header.tsx`, and page content stay server-rendered.
  `sidebar-toggle.tsx` and `nav-icons.tsx` get **no** directive — they are
  imported only by client code and are already inside the client graph.
- **The link's accessible name is `"Students"` at every width.** The label is
  hidden with `sr-only` when collapsed, never removed.
- **Icons are `aria-hidden="true"`** in both presentations.
- **Widths:** `md:w-64` expanded, `md:w-16` collapsed. The `md` breakpoint stays
  the single switch point; below it the aside is `hidden` and no toggle exists.
- **Never mix conflicting Tailwind utilities** in a base + variant pair (no
  `px-3` in the base and `px-0` in a variant). Class order in the attribute does
  not decide the winner; stylesheet order does. Put the axis in the variants.
- **Follow the house style** in `nav-list.tsx` and `status-filter.tsx`: hoisted
  `className` consts above the component, data array → `.map` → `Link`.
- **Test convention:** `vi.mock` hoisted, then top-level `await import`. Plain
  `render`, not `renderWithProviders` — nothing here uses TanStack Query.
- **Never claim a command passed without running it** (`CLAUDE.md`).

## Commands

```bash
# Fast loop — run from apps/web
pnpm vitest run src/components/layout/nav/app-sidebar.test.tsx

# Full gate — run from the repo root before each commit
pnpm turbo lint typecheck test --filter=web
```

## File Structure

| File | Responsibility | Boundary |
| --- | --- | --- |
| `nav/nav-items.ts` | the menu's content, incl. icon keys | none |
| `nav/nav-icons.tsx` | key → glyph, exhaustively | client graph |
| `nav/nav-preferences.ts` | the cookie's name and format | shared |
| `nav/nav-list.tsx` | items, active match, both presentations | **client** |
| `nav/sidebar-toggle.tsx` | the edge chevron's markup and ARIA | client graph |
| `nav/app-sidebar.tsx` | collapse state, cookie write, landmark | **client** |
| `(app)/layout.tsx` | read the cookie, size the grid | server |

---

## Task 0: Branch

`feature/nav-drawer` is unmerged and this work builds directly on its files.
`CONTRIBUTING.md` wants short-lived branches cut from `main`, which means the
clean path is to land that PR first.

- [ ] **Step 1: Decide, then cut the branch**

Preferred — the nav-drawer PR is merged:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/nav-sidebar-collapse
```

Acceptable — it is not merged yet and you would rather keep moving. Stack on it,
and expect to rebase once it lands:

```bash
git switch feature/nav-drawer
git switch -c feature/nav-sidebar-collapse
```

- [ ] **Step 2: Commit the design doc**

```bash
git add docs/superpowers/specs/2026-08-17-nav-sidebar-collapse-design.md \
        docs/superpowers/plans/2026-08-17-nav-sidebar-collapse.md
git commit -m "docs: add collapsible nav sidebar design and plan"
```

---

## Task 1: Icons

A rail with no icons is a blank strip, so the glyphs come first. This task ships
on its own: icons appear beside the labels in both the sidebar and the mobile
drawer, and nothing collapses yet.

**Files:**
- Modify: `apps/web/src/components/layout/nav/nav-items.ts`
- Create: `apps/web/src/components/layout/nav/nav-icons.tsx`
- Modify: `apps/web/src/components/layout/nav/nav-list.tsx`
- Test: `apps/web/src/components/layout/nav/nav-list.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `type NavIconKey = "users"`; `NavItem` gains `icon: NavIconKey`;
  `navIcons: Record<NavIconKey, () => React.JSX.Element>`. Task 2 renders the
  same glyph in the collapsed presentation.

**Behavior under test** (read before writing assertions):
- The five existing `nav-list` tests must pass **unchanged**. That is the real
  assertion here: if the glyph leaked into the accessible name,
  `getByRole("link", { name: "Students" })` would stop matching.
- The rendered `svg` carries `aria-hidden="true"`.

- [ ] **Step 1: Add the icon key to the data**

`apps/web/src/components/layout/nav/nav-items.ts`

```ts
// Declared here rather than in nav-icons.tsx so this module keeps depending on
// nothing. nav-icons.tsx imports the type and keys its map by it, which turns a
// missing glyph into a compile error instead of a blank rail.
export type NavIconKey = "users";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: NavIconKey;
};

// Flat by intent. Promotion to grouped sections is a contained change to this
// file plus nav-list.tsx, and is not justified by a single item.
export const navItems: NavItem[] = [
  { key: "students", label: "Students", href: "/", icon: "users" },
];
```

- [ ] **Step 2: Create the glyph map**

Mechanical. Stroke style matches the existing hamburger in `mobile-nav.tsx:41-51`.

`apps/web/src/components/layout/nav/nav-icons.tsx`

```tsx
import type { NavIconKey } from "@/components/layout/nav/nav-items";

// Outline glyphs on a 24x24 grid, drawn to match the stroke style already used
// for the mobile toggle. Path data follows the Feather icon set (MIT). A
// dependency is not worth one glyph; if the count outgrows this file, only this
// file changes.
//
// aria-hidden is unconditional: every glyph sits beside a text label that is
// present in the DOM at every width, so the icon is always decorative.
const iconClassName = "h-5 w-5 shrink-0";

function UsersIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={iconClassName}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// Record<NavIconKey, ...> rather than a bare object: adding a key to NavIconKey
// without adding a glyph here fails typecheck.
export const navIcons: Record<NavIconKey, () => React.JSX.Element> = {
  users: UsersIcon,
};
```

- [ ] **Step 3: Render the icon in `NavList`**

`apps/web/src/components/layout/nav/nav-list.tsx` — replace the whole file.
Note `itemClassName` loses its `px-3` to `expandedItemClassName`; Task 2 adds
the collapsed variant on the same axis.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navIcons } from "@/components/layout/nav/nav-icons";
import { navItems } from "@/components/layout/nav/nav-items";

const listClassName = "flex flex-col gap-1";

// Horizontal padding lives in the variants, not here: a base px-3 and a variant
// px-0 are the same CSS property and the attribute's class order would not
// decide the winner.
const itemClassName =
  "flex items-center gap-3 rounded-md py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

const expandedItemClassName = "px-3";

const currentItemClassName = "bg-zinc-950 text-white";

const otherItemClassName = "text-zinc-600 hover:bg-zinc-100";

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className={listClassName}>
      {navItems.map((item) => {
        // Exact equality: revisit this when nested routes exist and a partial
        // match (.startsWith) is wanted. It would light up every route today,
        // because the only href is "/".
        const isCurrentPath = item.href === pathname;

        // TODO(you): pull this item's glyph out of navIcons and render it as
        // the first child of the Link, before the label.
        //
        // Q: `navIcons[item.icon]` gives you a component. What has to be true
        //    of the variable you assign it to before you can write it as a JSX
        //    tag, and what does JSX emit if you get that wrong?

        return (
          <li key={item.key}>
            <Link
              href={item.href}
              className={`${itemClassName} ${expandedItemClassName} ${isCurrentPath ? currentItemClassName : otherItemClassName}`}
              aria-current={isCurrentPath ? "page" : undefined}
              onClick={() => onNavigate?.()}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Add the empty test block**

Append inside the existing `describe("NavList", ...)` in
`apps/web/src/components/layout/nav/nav-list.test.tsx`:

```tsx
  it("renders a decorative icon that stays out of the link's name", () => {
    const { container } = render(<NavList />);
    // TODO(you): assert the svg is hidden from assistive technology, and that
    // the link's accessible name is still exactly "Students".
    //
    // Q: If you dropped aria-hidden, which of these two assertions would fail,
    //    and what would the accessible name become?
  });
```

- [ ] **Step 5: Run the tests — expect one failure**

```bash
cd apps/web && pnpm vitest run src/components/layout/nav/nav-list.test.tsx
```

Expected: the five existing tests **pass** (icons did not disturb the names);
the new test fails, or passes vacuously if you have not written the assertions
yet. Write the assertions, watch them fail against a `NavList` with no icon,
then complete Step 3's `TODO(you)`.

- [ ] **Step 6: Full gate, then commit**

```bash
pnpm turbo lint typecheck test --filter=web
```

```bash
git add apps/web/src/components/layout/nav/
git commit -m "feat: give nav items decorative icons"
```

---

## Task 2: The collapsed presentation

`NavList` learns to render narrow. Still no state anywhere — the caller decides,
and until Task 3 no caller passes `true`. Testable by rendering it directly.

**Files:**
- Modify: `apps/web/src/components/layout/nav/nav-list.tsx`
- Test: `apps/web/src/components/layout/nav/nav-list.test.tsx`

**Interfaces:**
- Consumes: `navItems`, `navIcons` from Task 1.
- Produces: `NavList({ onNavigate, collapsed }: { onNavigate?: () => void;
  collapsed?: boolean })`. `collapsed` defaults to `false`, so `mobile-nav.tsx`
  needs no change. Task 3 passes it from `AppSidebar`.

**Behavior under test** (read before writing assertions):
- Collapsed, the link's accessible name is still `"Students"`. This is the
  point of the whole task.
- Collapsed, the link carries `title="Students"`.
- Expanded, the link carries no `title` at all — absent, not empty.
- The five existing tests still pass, because `collapsed` defaults to `false`.

- [ ] **Step 1: Add the collapsed variants**

`apps/web/src/components/layout/nav/nav-list.tsx` — add beneath
`expandedItemClassName`:

```tsx
// No px on this axis: the rail centres its icon instead of padding it.
const collapsedItemClassName = "justify-center";

// Collapsing hides the label from sight, not from the accessibility tree. The
// link's accessible name must stay "Students" at every width — a narrower
// column is no use to a screen-reader user and must not cost them the label.
const collapsedLabelClassName = "sr-only";
```

- [ ] **Step 2: Take the prop and branch the presentation**

Change the signature and the `Link`:

```tsx
export function NavList({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
```

```tsx
            <Link
              href={item.href}
              // TODO(you): this still renders the expanded padding at every
              //   width. Pick between expandedItemClassName and
              //   collapsedItemClassName alongside the current/other pair.
              className={`${itemClassName} ${expandedItemClassName} ${isCurrentPath ? currentItemClassName : otherItemClassName}`}
              aria-current={isCurrentPath ? "page" : undefined}
              // TODO(you): give pointer users the native tooltip the label no
              //   longer provides — but only when collapsed.
              //
              // Q: title can contribute to an element's accessible name. Why
              //    does adding it here not change the name from "Students",
              //    and what would happen if you had removed the label instead
              //    of hiding it with sr-only?
              onClick={() => onNavigate?.()}
            >
              {/* icon from Task 1 stays here, unchanged */}
              {/* TODO(you): the label must stay rendered in both presentations —
                  wrap it so collapsedLabelClassName can be applied only when
                  collapsed. It is bare text today, so reach for a <span>. */}
              {item.label}
            </Link>
```

Every placeholder above keeps the file parsing, so the tests fail on an
assertion rather than a syntax error. That is the point — red should mean
"behaviour is wrong", never "the file did not compile".

- [ ] **Step 3: Add the empty test blocks**

```tsx
  it("keeps the link's accessible name when collapsed", () => {
    render(<NavList collapsed />);
    // TODO(you): assert the link is still findable by the name "Students".
  });

  it("adds a tooltip when collapsed", () => {
    render(<NavList collapsed />);
    // TODO(you): assert the title attribute.
  });

  it("adds no tooltip when expanded", () => {
    render(<NavList />);
    // TODO(you): assert the title attribute is absent.
    //
    // Q: not.toHaveAttribute("title") vs toHaveAttribute("title", "") — which
    //    does an undefined prop produce in React, and which are you asserting?
  });
```

- [ ] **Step 4: Run them and watch them fail**

```bash
cd apps/web && pnpm vitest run src/components/layout/nav/nav-list.test.tsx
```

Expected: **one of the three fails.** The skeleton takes the `collapsed` prop
but does not branch on it yet, so "keeps the accessible name" and "adds no
tooltip when expanded" both pass trivially, and only "adds a tooltip when
collapsed" is red.

That is the honest state, and it is worth seeing rather than assuming three
failures. The two passing tests are guard rails — they pin behaviour that must
survive Step 2's changes — not drivers. Only the red one drives code.

The five original tests must also stay green throughout, because `collapsed`
defaults to `false`. Then complete Step 2 until all eight pass.

- [ ] **Step 5: Full gate, then commit**

```bash
pnpm turbo lint typecheck test --filter=web
```

```bash
git add apps/web/src/components/layout/nav/
git commit -m "feat: add a collapsed presentation to the nav list"
```

---

## Task 3: The toggle and the state

`AppSidebar` crosses to the client and starts owning collapse. Collapse works
end to end after this task — it just forgets on reload, which Task 4 fixes.

**Files:**
- Create: `apps/web/src/components/layout/nav/sidebar-toggle.tsx`
- Modify: `apps/web/src/components/layout/nav/app-sidebar.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx`
- Test: `apps/web/src/components/layout/nav/app-sidebar.test.tsx`

**Interfaces:**
- Consumes: `NavList({ collapsed })` from Task 2.
- Produces: `SidebarToggle({ collapsed, onToggle, controls }: { collapsed:
  boolean; onToggle: () => void; controls: string })`;
  `AppSidebar({ defaultCollapsed }: { defaultCollapsed?: boolean })`. Task 4
  supplies `defaultCollapsed` from the layout.

**Behavior under test** (read before writing assertions):
- Rendered with no props, the toggle's accessible name is
  `"Collapse navigation"` and `aria-expanded` is `"true"`.
- Rendered with `defaultCollapsed`, the name is `"Expand navigation"` and
  `aria-expanded` is `"false"`.
- Clicking the toggle flips both.
- Collapsed, the `"Students"` link is still findable by name — the integration
  check that Task 2's `sr-only` decision survived being wired up.
- Width classes are deliberately **not** asserted. Which Tailwind utility yields
  4rem is a styling detail; `aria-expanded` is the semantic truth.

- [ ] **Step 1: Create the toggle**

Mechanical: markup, classes, and the ARIA triple from the spec.

`apps/web/src/components/layout/nav/sidebar-toggle.tsx`

```tsx
// No "use client" directive. This file is only ever imported by app-sidebar.tsx,
// which has one — the directive marks the boundary, not every file past it.

// Pinned to the aside's right edge and straddling its border, which is why the
// aside needs `relative` and must not clip its overflow.
const buttonClassName =
  "absolute -right-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

const iconClassName =
  "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none";

const collapsedIconClassName = "rotate-180";

export function SidebarToggle({
  collapsed,
  onToggle,
  controls,
}: {
  collapsed: boolean;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <button
      type="button"
      aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
      aria-expanded={!collapsed}
      aria-controls={controls}
      className={buttonClassName}
      onClick={onToggle}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={`${iconClassName} ${collapsed ? collapsedIconClassName : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
```

- [ ] **Step 2: Move `AppSidebar` to the client**

`apps/web/src/components/layout/nav/app-sidebar.tsx` — replace the whole file.

```tsx
// TODO(you): this file needs one directive at the top. Add it.
//
// Q: (app)/layout.tsx renders <AppSidebar />. Does adding that directive here
//    make the layout a Client Component too? Which way does the boundary
//    propagate — up through importers, or down through children?

import { useState } from "react";

import { NavList } from "@/components/layout/nav/nav-list";
import { SidebarToggle } from "@/components/layout/nav/sidebar-toggle";

// `relative` anchors the edge toggle; `hidden md:block` still removes the whole
// column below md, so the rail and its toggle never exist on mobile.
const asideClassName =
  "relative hidden shrink-0 border-r border-zinc-200 bg-white transition-[width] duration-200 motion-reduce:transition-none md:block";

const expandedAsideClassName = "md:w-64";

const collapsedAsideClassName = "md:w-16";

// Horizontal padding in the variants; py-4 is shared.
const navClassName = "py-4";

const expandedNavClassName = "px-4";

const collapsedNavClassName = "px-2";

const NAV_ID = "main-nav";

export function AppSidebar({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) {
  // TODO(you): hold the collapse state.
  //
  // Q: defaultCollapsed arrives from the server on every render of this
  //    component. If you seed useState with it, and it later changed, would the
  //    sidebar follow? Is that a bug here, or the behaviour you want — and what
  //    is the word for a prop used this way?

  // TODO(you): write the toggle handler. It flips the state; Task 4 adds a
  //    second line to it.
  //
  // Q: Inside this handler, `collapsed` is the value from the render that
  //    created it. Write the flip so that Task 4's cookie line cannot disagree
  //    with what you just handed setState.

  // The placeholders below keep the file parsing and rendering, so the tests
  // fail on an assertion rather than a syntax error. Replace each with the real
  // expression as you fill in the state above.
  return (
    <aside className={`${asideClassName} ${expandedAsideClassName}`}>
      <SidebarToggle collapsed={false} onToggle={() => {}} controls={NAV_ID} />
      <nav id={NAV_ID} aria-label="Main" className={`${navClassName} ${expandedNavClassName}`}>
        <NavList collapsed={false} />
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Let the grid track follow the aside**

`apps/web/src/app/(app)/layout.tsx` — one line. Without it the column stays
pinned at 16rem and collapsing just leaves a gap.

```tsx
// The sidebar owns its width now, so the track sizes to it. minmax(0,1fr) stays
// for the original reason: a bare 1fr refuses to shrink below its content's
// min-content width, letting a wide student table push the grid sideways.
const shellClassName = "grid md:grid-cols-[auto_minmax(0,1fr)]";
```

- [ ] **Step 4: Create the test file with empty blocks**

`apps/web/src/components/layout/nav/app-sidebar.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const { AppSidebar } = await import("@/components/layout/nav/app-sidebar");

describe("AppSidebar", () => {
  it("renders expanded when no preference is supplied", () => {
    render(<AppSidebar />);
    // TODO(you): assert the toggle's accessible name and its aria-expanded.
  });

  it("renders collapsed when the caller says so", () => {
    render(<AppSidebar defaultCollapsed />);
    // TODO(you): assert both again, for the other state.
  });

  it("collapses when the toggle is clicked", async () => {
    render(<AppSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));
    // TODO(you): assert the toggle now reports the collapsed state.
    //
    // Q: You clicked a button found by one name and must now find it by
    //    another. What does that tell you about querying by accessible name
    //    when the name is derived from state?
  });

  it("keeps the nav link reachable by name when collapsed", () => {
    render(<AppSidebar defaultCollapsed />);
    // TODO(you): assert the "Students" link is still findable.
  });
});
```

- [ ] **Step 5: Run them and watch them fail**

```bash
cd apps/web && pnpm vitest run src/components/layout/nav/app-sidebar.test.tsx
```

Expected: **two fail, two pass.** The skeleton is hardcoded to the expanded
presentation, so "renders expanded" and "keeps the nav link reachable" pass
without the component doing anything — while "renders collapsed" and "collapses
when clicked" fail, because `defaultCollapsed` is ignored and `onToggle` is a
no-op.

Worth pausing on: two of your tests just passed against a component that cannot
collapse at all. A test that passes for a reason unrelated to what it claims to
check is the most expensive kind to own, because it will keep passing after the
feature breaks. Neither is wasted here — together the four discriminate — but
notice which ones carry the weight.

Fill Step 2 until all four pass.

- [ ] **Step 6: Full gate, then commit**

```bash
pnpm turbo lint typecheck test --filter=web
```

Watch for `mobile-nav.test.tsx` and `app-header.test.tsx` — both must stay
green. They are the check that the mobile drawer was left alone.

```bash
git add apps/web/src/components/layout/nav/ "apps/web/src/app/(app)/layout.tsx"
git commit -m "feat: let the nav sidebar collapse to an icon rail"
```

---

## Task 4: Remember the choice

The cookie. This is the task with the concept in it — a value read on the server
and owned on the client, crossing the boundary once, downward.

**Files:**
- Create: `apps/web/src/components/layout/nav/nav-preferences.ts`
- Test: `apps/web/src/components/layout/nav/nav-preferences.test.ts`
- Modify: `apps/web/src/components/layout/nav/app-sidebar.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx`
- Test: `apps/web/src/components/layout/nav/app-sidebar.test.tsx`

**Interfaces:**
- Consumes: `AppSidebar({ defaultCollapsed })` from Task 3.
- Produces: `NAV_COLLAPSED_COOKIE: string`;
  `navCollapsedCookie(collapsed: boolean): string`. The layout imports the
  constant to read; `app-sidebar.tsx` imports the formatter to write.

**Behavior under test** (read before writing assertions):
- `navCollapsedCookie(true)` sets the value to `"1"`; `false` sets `"0"`.
- The string carries `path=/`, so the preference applies on every route. This is
  the assertion that earns the file — a missing `path` produces a cookie scoped
  to whichever page happened to be open, which is the kind of bug that only
  shows up on the second screen.
- Toggling writes the cookie. Asserted through `document.cookie` in jsdom.

- [ ] **Step 1: Create the cookie module**

Mechanical.

`apps/web/src/components/layout/nav/nav-preferences.ts`

```ts
// One definition, shared by the client that writes this cookie and the server
// component that reads it. Deliberately not httpOnly: the toggle sets it from
// the browser, and it holds a UI preference with no personal data in it.
export const NAV_COLLAPSED_COOKIE = "nav-collapsed";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function navCollapsedCookie(collapsed: boolean): string {
  return [
    `${NAV_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}`,
    "path=/",
    `max-age=${ONE_YEAR_IN_SECONDS}`,
    "samesite=lax",
  ].join("; ");
}
```

- [ ] **Step 2: Create the test file with empty blocks**

`apps/web/src/components/layout/nav/nav-preferences.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { navCollapsedCookie } from "@/components/layout/nav/nav-preferences";

describe("navCollapsedCookie", () => {
  it("records a collapsed sidebar", () => {
    // TODO(you): assert the returned string sets the value to "1".
  });

  it("records an expanded sidebar", () => {
    // TODO(you): assert "0".
    //
    // Q: Why write "0" rather than deleting the cookie? What reads it, and
    //    what would an absent cookie mean to that reader?
  });

  it("scopes the preference to every route", () => {
    // TODO(you): assert path=/ is present.
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

```bash
cd apps/web && pnpm vitest run src/components/layout/nav/nav-preferences.test.ts
```

Expected: three empty tests pass vacuously. Write the assertions first, confirm
they pass against Step 1's implementation, then — to prove they bite — break
`navCollapsedCookie` by dropping `path=/`, re-run, see red, and put it back.

- [ ] **Step 4: Write the cookie on toggle**

`apps/web/src/components/layout/nav/app-sidebar.tsx` — add the import, then one
line to the handler you wrote in Task 3.

```tsx
import { navCollapsedCookie } from "@/components/layout/nav/nav-preferences";
```

```tsx
  // TODO(you): add the cookie write to the toggle handler.
  //
  // Q: The handler closes over `collapsed` from the render that created it. If
  //    you write the cookie from `!collapsed` and call setState with a functional
  //    updater, are those two guaranteed to agree? Which single value should
  //    both use?
```

- [ ] **Step 5: Read the cookie in the layout**

`apps/web/src/app/(app)/layout.tsx`

```tsx
import { cookies } from "next/headers";

import { AppHeader } from "@/components/layout/header/app-header";
import { AppSidebar } from "@/components/layout/nav/app-sidebar";
import { NAV_COLLAPSED_COOKIE } from "@/components/layout/nav/nav-preferences";
import { requireCurrentUser } from "@/lib/auth-server";

// The sidebar owns its width now, so the track sizes to it. minmax(0,1fr) stays
// for the original reason: a bare 1fr refuses to shrink below its content's
// min-content width, letting a wide student table push the grid sideways.
const shellClassName = "grid md:grid-cols-[auto_minmax(0,1fr)]";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();

  // TODO(you): read NAV_COLLAPSED_COOKIE and pass the result to AppSidebar.
  //
  // cookies() is async in Next 16 and this function is already async.
  // requireCurrentUser() (lib/auth-server.ts:16) already awaits it, so this
  // route is dynamic either way and the second read costs nothing.
  //
  // Q: An absent cookie has to mean something. Compare the value against "1"
  //    rather than checking for the cookie's presence — why does that choice
  //    matter for a first-time visitor?

  return (
    <div>
      <AppHeader userEmail={user.email} />
      <div className={shellClassName}>
        <AppSidebar /* TODO(you): pass defaultCollapsed */ />
        <div>{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add the persistence test block**

Append to `describe("AppSidebar", ...)` in `app-sidebar.test.tsx`, and add the
reset above it so the tests do not leak state into one another:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
```

```tsx
beforeEach(() => {
  document.cookie = "nav-collapsed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});
```

```tsx
  it("remembers the collapsed choice in a cookie", async () => {
    render(<AppSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));
    // TODO(you): assert document.cookie now carries the collapsed preference.
    //
    // Q: This test proves the browser was told. It cannot prove the sidebar
    //    comes back collapsed after a reload. Which step of the manual
    //    verification below is the only thing that can, and why can no jsdom
    //    test replace it?
  });
```

- [ ] **Step 7: Run the tests and watch them fail**

```bash
cd apps/web && pnpm vitest run src/components/layout/nav/app-sidebar.test.tsx
```

Expected: the new test FAILS — nothing writes the cookie until Step 4's
`TODO(you)` is filled. The four Task 3 tests stay green throughout.

- [ ] **Step 8: Full gate, then commit**

```bash
pnpm turbo lint typecheck test --filter=web
```

```bash
git add apps/web/src/components/layout/nav/ "apps/web/src/app/(app)/layout.tsx"
git commit -m "feat: remember the nav sidebar collapse preference"
```

---

## Task 5: Verify in a browser and finish

Six behaviors here cannot be asserted in jsdom, and one of them is the entire
justification for choosing a cookie over `localStorage`. This is a required
step, not a nicety.

**Files:**
- Modify: `docs/superpowers/specs/2026-08-17-nav-sidebar-collapse-design.md`

- [ ] **Step 1: Start the dev environment**

Read `startup.md` first if the stack is not already running.

```bash
pnpm turbo dev --filter=web
```

- [ ] **Step 2: Walk the list**

At a viewport wider than `md`:

1. The toggle collapses the sidebar to a 4rem rail, and the content column
   reclaims the space. The chevron rotates.
2. **Reload while collapsed. It stays collapsed, and there is no width flash on
   first paint.** If the sidebar renders wide and snaps narrow, the cookie is
   not reaching the server and the design has failed — that flash is precisely
   what `localStorage` was rejected for.
3. Enable `prefers-reduced-motion` in devtools; the width and chevron
   transitions stop.
4. Tab to the toggle: the focus ring is visible, and both Enter and Space fire
   it.
5. Hover a collapsed nav item: the native tooltip reads "Students".

Then narrow below `md`:

6. No rail, no edge toggle. The hamburger still opens the drawer, Escape still
   closes it, focus still returns to the trigger — and the drawer now shows
   icons beside its labels.

- [ ] **Step 3: Record the result in the design doc**

Under **Manual verification**, mark the walk with today's date and the outcome
of each item, in the style of the previous design doc's
"**Walked 2026-08-17.**" block. Record failures honestly if any turn up; a
failed item means a fix, not a footnote.

- [ ] **Step 4: Strip the scaffolding**

Remove every `TODO(you):` comment and its `Q:` lines from the shipped source.
The guiding questions belong to the plan, not the codebase.

```bash
grep -rn "TODO(you)" apps/web/src
```

Expected: no matches.

- [ ] **Step 5: Final gate**

```bash
pnpm turbo lint typecheck test --filter=web
```

- [ ] **Step 6: Commit and open the PR**

```bash
git add -A
git commit -m "docs: record the collapsible sidebar browser walkthrough"
git push -u origin HEAD
```

`CONTRIBUTING.md` wants **Squash and merge**. If Task 0 stacked this on
`feature/nav-drawer`, rebase onto `main` once that PR lands, before opening
this one.

---

## Concept to take away

The two nav features now sit either side of one rule, and the contrast is the
lesson:

> **Hold state in React when React is the only writer. Read the DOM when the
> platform writes too.**

The mobile drawer refused `useState` because the browser closes a `<dialog>` on
Escape without telling React — an external writer, so React's copy would go
stale. Nothing external collapses the sidebar, so there is no second writer, no
mirror, and `useState` is simply right.

The cookie adds the second half: a value the server can read and the client can
change crosses the boundary **once, downward, as a seed** — not as something to
keep in sync. `defaultCollapsed` is a prop that seeds `useState` and is then
ignored, which is exactly why the first paint is correct and the toggle is
instant.
