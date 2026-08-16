# Navigation Drawer Implementation Plan

> **Execution mode — deliberate deviation from the writing-plans template.**
> The template hands this to `superpowers:subagent-driven-development`.
> `CLAUDE.md` disables that skill by default: "Subagents write the code
> themselves — that is their purpose, and it is exactly what this file exists to
> prevent," and states that `CLAUDE.md` wins on conflict. This plan is therefore
> written for **in-session execution under the Teaching Contract**, not for an
> agentic worker.
>
> Consequence for how to read it: steps marked **`TODO(you)`** are deliberately
> unfilled. They are not plan failures — they are the concept-critical decisions
> `CLAUDE.md` reserves for the author, each carrying one guiding question. Every
> mechanical step is complete and copy-ready. Say **"show me the answer"** to
> have any specific `TODO(you)` filled in with reasoning.

**Goal:** Add a persistent left sidebar at `md` and above, and a modal drawer
below `md`, both driven by one nav data module.

**Architecture:** Two narrow Client Component islands — `NavList` (needs
`usePathname`) and `MobileNav` (owns a native `<dialog>`) — inside an otherwise
server-rendered shell. The mobile drawer holds no React state; the DOM element
owns its own open state and is driven through a ref.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Vitest + jsdom +
Testing Library. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-16-nav-drawer-design.md`

**Branch:** `feature/nav-drawer` (already created; the spec is committed on it)

## Global Constraints

- **pnpm only.** Never npm or yarn. No new dependencies in this feature.
- **No `"use client"` beyond `nav-list.tsx` and `mobile-nav.tsx`.** The layout,
  sidebar wrapper, and header stay Server Components.
- **Active state uses exact equality**, `pathname === item.href`, with a comment
  saying it must be revisited when nested routes exist.
- **`aria-current="page"` is required** on the active item. Colour alone is
  forbidden by `.claude/rules/react-nextjs.md`.
- **No icons.** `NavItem` gains no `icon` field; a library has not been chosen.
- **Sidebar width is `16rem`**; the `md` breakpoint is the single switch point.
- **Follow the house style** in `status-filter.tsx`: hoisted `className` consts
  above the component, data array → `.map` → `Link`.
- **Test convention:** `vi.mock` hoisted, then top-level `await import`. Use
  `renderWithProviders` only for components using TanStack Query — neither
  component here does, so plain `render` is correct.
- **Never claim a command passed without running it** (`CLAUDE.md`).

## Commands

```bash
# Fast loop — run from apps/web
pnpm vitest run src/components/layout/nav/nav-list.test.tsx

# Full gate — run from the repo root before each commit
pnpm turbo lint typecheck test --filter=web
```

## File Structure

| File | Responsibility | Boundary |
| --- | --- | --- |
| `nav/nav-items.ts` | the menu's content, as data | none |
| `nav/nav-list.tsx` | render items, match active, fire `onNavigate` | **client** |
| `nav/app-sidebar.tsx` | the persistent column and its landmark | server |
| `nav/mobile-nav.tsx` | the toggle, the dialog, open/close | **client** |
| `(app)/layout.tsx` | the grid shell | server |
| `header/app-header.tsx` | mount the toggle, align with the sidebar | server |
| `header/account-menu.tsx` | give up the hamburger glyph | client |
| `vitest.setup.ts` | `HTMLDialogElement` test double | test-only |

---

## Task 1: Nav data and `NavList`

The core of the feature. Everything else is placement. `NavList` is where the
one genuinely interesting constraint lands: it must be a Client Component
because App Router layouts do not re-render on client-side navigation, so a
server-rendered sidebar could never update its active item.

**Files:**
- Create: `apps/web/src/components/layout/nav/nav-items.ts`
- Create: `apps/web/src/components/layout/nav/nav-list.tsx`
- Test: `apps/web/src/components/layout/nav/nav-list.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `type NavItem = { key: string; label: string; href: string }`;
  `navItems: NavItem[]`; `NavList({ onNavigate }: { onNavigate?: () => void })`.
  Tasks 2 and 4 both render `<NavList />`; Task 4 passes `onNavigate`.

**Behavior under test** (read before writing assertions):
- One link renders per entry in `navItems`, with the entry's `href` and `label`.
- The entry whose `href` equals the current pathname carries
  `aria-current="page"`.
- Entries that do not match carry no `aria-current` at all — `undefined`, not
  `"false"`.
- Clicking a link calls `onNavigate` when it is supplied.
- Edge case that matters: clicking the link for the page you are already on
  still calls `onNavigate`. This is why Task 4 cannot use an effect.

- [ ] **Step 1: Create the nav data**

`apps/web/src/components/layout/nav/nav-items.ts`

```ts
export type NavItem = {
  key: string;
  label: string;
  href: string;
};

// Flat by intent. Promotion to grouped sections is a contained change to this
// file plus nav-list.tsx, and is not justified by a single item.
export const navItems: NavItem[] = [
  { key: "students", label: "Students", href: "/" },
];
```

- [ ] **Step 2: Create the `NavList` skeleton**

Markup and styling are mechanical; the active-matching and navigation-callback
decisions are yours.

`apps/web/src/components/layout/nav/nav-list.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/components/layout/nav/nav-items";

const listClassName = "flex flex-col gap-1";

const itemClassName =
  "block rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

const currentItemClassName = "bg-zinc-950 text-white";

const otherItemClassName = "text-zinc-600 hover:bg-zinc-100";

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className={listClassName}>
      {navItems.map((item) => {
        // TODO(you): Derive whether this item is the current page, and build
        // its className from the two variants above.
        //
        // Exact equality against item.href — a startsWith match would light up
        // every route, because the only href is "/". Leave a comment saying
        // this needs revisiting once nested routes exist.
        //
        // Q: status-filter.tsx receives `current` as a prop from the server
        //    page and needs no "use client". Why can't this component take the
        //    pathname as a prop from (app)/layout.tsx instead?

        return (
          <li key={item.key}>
            <Link
              href={item.href}
              className={itemClassName}
              // TODO(you): add the aria-current signal, and the onNavigate call.
              //
              // Q: What should aria-current be for a non-active item — "false",
              //    or absent entirely? Check what status-filter.tsx:42 does.
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

- [ ] **Step 3: Create the test file with empty blocks**

Mocks and scaffolding are mechanical. The assertions are yours.

`apps/web/src/components/layout/nav/nav-list.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

const { NavList } = await import("@/components/layout/nav/nav-list");

beforeEach(() => {
  pathname = "/";
});

describe("NavList", () => {
  it("renders a link for each nav item", () => {
    render(<NavList />);
    // TODO(you): assert the Students link exists and points at "/".
  });

  it("marks the item matching the current path as the current page", () => {
    render(<NavList />);
    // TODO(you): assert aria-current="page" on the matching link.
  });

  it("leaves non-matching items without an aria-current attribute", () => {
    pathname = "/somewhere-else";
    render(<NavList />);
    // TODO(you): assert the attribute is absent — not "false".
    // Q: which matcher distinguishes "absent" from "present but falsy"?
  });

  it("calls onNavigate when a link is clicked", async () => {
    const onNavigate = vi.fn();
    render(<NavList onNavigate={onNavigate} />);
    // TODO(you): click the link and assert onNavigate fired.
  });

  it("calls onNavigate even when the link is for the current page", async () => {
    const onNavigate = vi.fn();
    render(<NavList onNavigate={onNavigate} />);
    // TODO(you): pathname is already "/", so this click changes no route.
    // Assert onNavigate still fired — this is the case that rules out useEffect
    // in Task 4.
  });
});
```

- [ ] **Step 4: Write the assertions, then run to watch them fail**

Fill in the five `TODO(you)` blocks above. Then, from `apps/web`:

```bash
pnpm vitest run src/components/layout/nav/nav-list.test.tsx
```

Expected: "renders a link for each nav item" passes (the markup exists);
the `aria-current` and `onNavigate` tests **fail**. That split is the point —
the mechanical half is done, the concept-critical half is not.

- [ ] **Step 5: Implement the `NavList` TODOs until green**

```bash
pnpm vitest run src/components/layout/nav/nav-list.test.tsx
```

Expected: 5 passed.

- [ ] **Step 6: Full gate, then commit**

```bash
pnpm turbo lint typecheck test --filter=web
```

```bash
git add apps/web/src/components/layout/nav/
git commit -m "feat: add nav item data and active-aware nav list"
```

---

## Task 2: Sidebar and the layout grid

Deliverable: a working, visible desktop sidebar. Purely mechanical — the one
judgment call is that `AppSidebar` stays a Server Component even though it
renders a Client Component, which is allowed and keeps the bundle to one island.

**Files:**
- Create: `apps/web/src/components/layout/nav/app-sidebar.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `NavList` from Task 1.
- Produces: `AppSidebar()`, taking no props. Mounted only by the layout.

- [ ] **Step 1: Create the sidebar**

`apps/web/src/components/layout/nav/app-sidebar.tsx`

```tsx
import { NavList } from "@/components/layout/nav/nav-list";

// `hidden` below md removes this from the accessibility tree entirely, so it
// never coexists with the mobile drawer's nav landmark.
const asideClassName = "hidden border-r border-zinc-200 bg-white md:block";

const navClassName = "p-4";

export function AppSidebar() {
  return (
    <aside className={asideClassName}>
      <nav aria-label="Main" className={navClassName}>
        <NavList />
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Wire the grid into the layout**

Replace the body of `apps/web/src/app/(app)/layout.tsx`:

```tsx
import { AppHeader } from "@/components/layout/header/app-header";
import { AppSidebar } from "@/components/layout/nav/app-sidebar";
import { requireCurrentUser } from "@/lib/auth-server";

const shellClassName = "grid md:grid-cols-[16rem_minmax(0,1fr)]";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  return (
    <div>
      <AppHeader userEmail={user.email} />
      <div className={shellClassName}>
        <AppSidebar />
        <div>{children}</div>
      </div>
    </div>
  );
}
```

`minmax(0,1fr)` rather than `1fr`: a bare `1fr` track refuses to shrink below
its content's min-content width, which lets a wide student table push the grid
horizontally instead of scrolling inside its own column.

- [ ] **Step 3: Confirm nothing regressed**

```bash
pnpm turbo lint typecheck test --filter=web
```

Expected: all existing tests still pass. No new tests here — this task is
markup, and the behavior it introduces is verified in the browser at Step 4.

- [ ] **Step 4: Look at it**

```bash
pnpm turbo dev --filter=web
```

Check at a wide viewport: the sidebar sits left with "Students" highlighted and
carrying `aria-current` (inspect the element). Narrow the window past `md`: the
sidebar disappears and content takes the full width. There is no way to reach
navigation while narrow yet — that is Task 4.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/nav/app-sidebar.tsx apps/web/src/app/\(app\)/layout.tsx
git commit -m "feat: show a persistent nav sidebar on wide viewports"
```

---

## Task 3: Free the hamburger glyph

Small and independently reviewable — you may want a different glyph, and
rejecting this does not block anything else. Isolated so the header work in
Task 5 is not entangled with an icon opinion.

**Files:**
- Modify: `apps/web/src/components/layout/header/account-menu.tsx:87`

**Interfaces:**
- Consumes: nothing. Produces: nothing. The component's props, its
  `aria-label="Account menu"`, and its panel id are all unchanged — which is
  why the four existing header tests should survive untouched.

- [ ] **Step 1: Swap the glyph**

In `account-menu.tsx`, replace the single `<path>` inside the trigger's `<svg>`:

```tsx
          <path d="M4 6h16M4 12h16M4 18h16" />
```

with a person outline, keeping the surrounding `<svg>` attributes exactly as
they are (`fill="none" stroke="currentColor" strokeWidth="2"`):

```tsx
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
```

- [ ] **Step 2: Verify the existing tests still pass**

```bash
pnpm turbo lint typecheck test --filter=web
```

Expected: the four `app-header.test.tsx` tests and all `account-menu.test.tsx`
tests pass. They assert on the accessible name, not the icon path — but that is
a claim to verify, not to assume.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/header/account-menu.tsx
git commit -m "refactor: use a person icon for the account menu trigger"
```

---

## Task 4: The mobile drawer

The interesting task. Two things to hold onto: jsdom cannot run `<dialog>`, so
the suite needs a test double; and the drawer holds no React state, because the
DOM element already owns it authoritatively.

**Files:**
- Modify: `apps/web/vitest.setup.ts`
- Create: `apps/web/src/components/layout/nav/mobile-nav.tsx`
- Test: `apps/web/src/components/layout/nav/mobile-nav.test.tsx`

**Interfaces:**
- Consumes: `NavList` from Task 1, passing `onNavigate`.
- Produces: `MobileNav()`, taking no props. Task 5 mounts it in the header.

**Behavior under test:**
- The drawer is closed initially.
- Clicking the trigger opens it.
- Clicking a nav link inside it closes it.
- Clicking the backdrop closes it.
- Clicking the drawer's own contents does **not** close it.

**Not under test, by design:** focus trapping, Escape, background inertness, and
focus restoration. Those are browser behaviors we deliberately did not
implement, so there is no code of ours to assert against — and jsdom could not
run them regardless. They are verified by hand in Task 6.

- [ ] **Step 1: Add the `HTMLDialogElement` test double**

jsdom 30.0.1 ships the class and reflects the `open` attribute, but `show`,
`showModal`, and `close` are all `undefined`. Replace `apps/web/vitest.setup.ts`
entirely with the following — the existing `afterEach(cleanup)` is preserved and
the `vitest` import is merged rather than duplicated:

```ts
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll } from "vitest";

// jsdom 30 ships HTMLDialogElement with attribute reflection but no methods.
// This double implements just enough for component tests: the `open` attribute
// and the `close` event. It is test-only and never shipped to a browser, and it
// verifies our wiring — not the browser's modal semantics (focus trapping,
// inertness, Escape), which jsdom cannot model at all.
//
// The explicit `this` parameters are required: these are assigned to a
// prototype rather than declared as methods, so `this` would otherwise be
// implicitly `any` under the strict TypeScript config.
beforeAll(() => {
  const dialog = window.HTMLDialogElement.prototype;

  dialog.show = function show(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };

  dialog.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };

  dialog.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.hasAttribute("open")) {
      return;
    }
    this.removeAttribute("open");
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 2: Create the `MobileNav` skeleton**

`apps/web/src/components/layout/nav/mobile-nav.tsx`

```tsx
"use client";

import { useRef } from "react";

import { NavList } from "@/components/layout/nav/nav-list";

const triggerClassName =
  "flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 md:hidden";

// <dialog> ships centred with a border and auto margins. Reset those for a
// full-height left drawer. `backdrop:` styles the ::backdrop pseudo-element,
// which is the scrim. `md:hidden` covers resizing the viewport while open.
const dialogClassName =
  "m-0 h-full max-h-none w-64 max-w-none border-r border-zinc-200 bg-white p-4 backdrop:bg-zinc-950/50 md:hidden";

export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // TODO(you): open, close, and backdrop-dismiss handlers.
  //
  // Q1: There is no useState here on purpose. If you mirrored the open state in
  //     React, what would that mirror be wrong about the instant the user
  //     presses Escape — and who told the DOM to close?
  //
  // Q2: The ::backdrop belongs to the dialog's own box, so a backdrop click
  //     reports the dialog as its target. How do you tell that apart from a
  //     click on the drawer's contents?
  //
  // Q3: Closing on navigation goes on the link's onClick, via NavList's
  //     onNavigate. Why would a useEffect watching usePathname() fail the
  //     "clicked the current page's link" case from Task 1?

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-haspopup="dialog"
        className={triggerClassName}
        // TODO(you): open the dialog. Which method gives you the focus trap,
        // Escape handling, and background inertness — show() or showModal()?
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        className={dialogClassName}
        // TODO(you): dismiss on backdrop click. See Q2.
      >
        <nav aria-label="Main">
          <NavList /* TODO(you): close the drawer on navigation. See Q3. */ />
        </nav>
      </dialog>
    </>
  );
}
```

There is intentionally no `aria-expanded` on the trigger: `showModal()` makes
the background inert, so the trigger is unreachable to assistive technology
while the drawer is open and the state is unobservable. `aria-haspopup="dialog"`
is the accurate signal.

- [ ] **Step 3: Create the test file with empty blocks**

`apps/web/src/components/layout/nav/mobile-nav.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const { MobileNav } = await import("@/components/layout/nav/mobile-nav");

// The dialog is the only one on the page; getByRole("dialog") only matches
// while it is open, so query the element directly to assert the closed case.
function getDialog(container: HTMLElement) {
  const dialog = container.querySelector("dialog");
  if (!dialog) {
    throw new Error("expected a dialog element to be rendered");
  }
  return dialog;
}

describe("MobileNav", () => {
  it("renders the drawer closed", () => {
    const { container } = render(<MobileNav />);
    // TODO(you): assert the dialog is not open.
  });

  it("opens the drawer when the trigger is clicked", async () => {
    const { container } = render(<MobileNav />);
    // TODO(you): click "Open navigation", then assert the dialog is open.
  });

  it("closes the drawer when a nav link is clicked", async () => {
    const { container } = render(<MobileNav />);
    // TODO(you): open it, click the "Students" link, assert it closed.
  });

  it("closes the drawer when the backdrop is clicked", async () => {
    const { container } = render(<MobileNav />);
    // TODO(you): open it, then click the dialog element itself — that is what
    // a backdrop click reports as its target — and assert it closed.
  });

  it("keeps the drawer open when its contents are clicked", async () => {
    const { container } = render(<MobileNav />);
    // TODO(you): open it, click the <nav> inside, assert it is still open.
    // This is the test that fails if you dismiss on every dialog click.
  });
});
```

- [ ] **Step 4: Write the assertions, then run to watch them fail**

```bash
pnpm vitest run src/components/layout/nav/mobile-nav.test.tsx
```

Expected: "renders the drawer closed" passes; the other four fail, because no
handler is wired yet.

- [ ] **Step 5: Implement the `MobileNav` TODOs until green**

```bash
pnpm vitest run src/components/layout/nav/mobile-nav.test.tsx
```

Expected: 5 passed.

- [ ] **Step 6: Full gate, then commit**

```bash
pnpm turbo lint typecheck test --filter=web
```

```bash
git add apps/web/vitest.setup.ts apps/web/src/components/layout/nav/mobile-nav.tsx apps/web/src/components/layout/nav/mobile-nav.test.tsx
git commit -m "feat: add a modal nav drawer for narrow viewports"
```

---

## Task 5: Mount the drawer in the header

Deliverable: the feature working end to end. Also fixes the alignment problem
the sidebar introduced — the header's `max-w-6xl` centring leaves the brand
sitting inboard of the sidebar's flush-left edge.

**Files:**
- Modify: `apps/web/src/components/layout/header/app-header.tsx:6-7`
- Test: `apps/web/src/components/layout/header/app-header.test.tsx`

**Interfaces:**
- Consumes: `MobileNav` from Task 4.
- Produces: nothing new. `AppHeader`'s `userEmail` prop is unchanged.

- [ ] **Step 1: Add the failing test**

Append inside the existing `describe("AppHeader")` block in
`app-header.test.tsx`:

```tsx
  it("renders the navigation toggle", () => {
    renderWithProviders(<AppHeader userEmail={userEmail} />);
    // TODO(you): assert the "Open navigation" button is present.
  });
```

`app-header.test.tsx` already mocks `next/navigation` for `useRouter`. `NavList`
now needs `usePathname` from the same module, so extend that existing mock
rather than adding a second one:

```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm vitest run src/components/layout/header/app-header.test.tsx
```

Expected: the new test fails — no such button. The four existing tests pass.

- [ ] **Step 3: Mount the toggle and go full-bleed**

`apps/web/src/components/layout/header/app-header.tsx`

```tsx
import { AccountMenu } from "@/components/layout/header/account-menu";
import { HeaderBrand } from "@/components/layout/header/header-brand";
import { MobileNav } from "@/components/layout/nav/mobile-nav";

const headerClassName = "border-b border-zinc-200 bg-white";

// Full-bleed rather than the previous mx-auto max-w-6xl: the sidebar below is
// flush left, and a centred header would leave the brand inboard of its edge.
const innerClassName = "flex h-16 items-center justify-between px-6";

const leftClassName = "flex items-center gap-3";

export function AppHeader({ userEmail }: { userEmail: string }) {
  return (
    <header className={headerClassName}>
      <div className={innerClassName}>
        <div className={leftClassName}>
          <MobileNav />
          <HeaderBrand />
        </div>
        <AccountMenu userEmail={userEmail} />
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Run the full gate**

```bash
pnpm turbo lint typecheck test --filter=web
```

Expected: everything passes, including all five `app-header.test.tsx` tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/header/app-header.tsx apps/web/src/components/layout/header/app-header.test.tsx
git commit -m "feat: mount the nav drawer toggle in the header"
```

---

## Task 6: Browser verification gate

Required by the spec, not optional. Five behaviors are depended upon and none
can be asserted in jsdom. This task may produce a code change; if it does not,
it still produces a recorded result.

**Files:**
- Possibly modify: `apps/web/src/components/layout/nav/mobile-nav.tsx`
- Modify: `docs/superpowers/specs/2026-08-16-nav-drawer-design.md` (record the
  scroll answer)

- [ ] **Step 1: Run the app and narrow the viewport below `md`**

```bash
pnpm turbo dev --filter=web
```

- [ ] **Step 2: Walk the checklist, keyboard only**

1. Tab to the toggle, press Enter — the drawer opens.
2. Tab repeatedly — focus stays inside the drawer and does not reach the page
   behind it.
3. Press Escape — the drawer closes.
4. Focus is back on the toggle, not lost to `<body>`.
5. Reopen, then click the scrim — it closes.
6. Reopen, then activate "Students" — it closes and stays on the page.
7. Reopen and try to scroll the page behind the drawer.

- [ ] **Step 3: Resolve the open question**

Item 7 is the spec's recorded unknown: whether `showModal()` prevents the page
behind it from scrolling. Decide from what you observed, not from expectation.

- **If it does not scroll:** no code. Update the spec's "Manual verification"
  section to state the answer and drop the open-question marker.
- **If it scrolls:** the page needs a scroll lock while the drawer is open —
  which reintroduces a synchronisation concern the zero-state design avoided, so
  bring it back for discussion rather than reaching for `useEffect` alone.

- [ ] **Step 4: Confirm the desktop side is unaffected**

Widen past `md`: the toggle disappears, the sidebar returns, "Students" is
highlighted, and no dialog is reachable.

- [ ] **Step 5: Commit the recorded result**

```bash
git add docs/superpowers/specs/2026-08-16-nav-drawer-design.md
git commit -m "docs: record browser verification results for the nav drawer"
```

---

## Definition of done

- [ ] `pnpm turbo lint typecheck test --filter=web` passes from the repo root,
      with output seen — not assumed.
- [ ] **27 tests pass.** The verified baseline on this branch before any of this
      work is 16 passing across 4 files; this plan adds 11 — 5 `NavList`,
      5 `MobileNav`, and 1 header test.
- [ ] The four pre-existing `app-header.test.tsx` tests still pass.
- [ ] Task 6's checklist has been walked in a real browser and item 7 answered.
- [ ] No `TODO(you)` comments remain in committed source. Per the standing note
      in memory, strip the scaffolding before the final commit.
- [ ] `"use client"` appears in exactly two files under `src/components/layout/`.

## Follow-ups not in this plan

Carried from the spec, deliberately out of scope:

- **`src/middleware.ts:20`** lists routes explicitly. No change is needed here,
  but the next screen added will silently skip the auth redirect unless it is
  added to the matcher.
- **Active matching** beyond exact equality, once nested routes exist.
- **Icons**, once a library is chosen.
- **Grouping**, once the item count justifies it.
- **`NavList`'s `onNavigate` asymmetry** — `MobileNav` passes it and
  `AppSidebar` does not. Correct at this size; revisit if the drawer grows.
