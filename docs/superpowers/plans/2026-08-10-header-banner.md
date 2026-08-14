# Header Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent header banner to every authenticated route, containing a brand wordmark linking home and an account menu that discloses the signed-in user's email and a logout action.

**Architecture:** A `(app)` route group holds an async Server Component layout that fetches the current user and renders `AppHeader`. `AppHeader` is thin composition over two children — a static server `HeaderBrand` and a `"use client"` `AccountMenu` that owns open/closed state and the logout mutation. The 401-redirect logic lives in `requireCurrentUser` rather than the layout, so it is unit-testable.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS v4, TanStack Query 5, Vitest + React Testing Library (added by Task 1), pnpm 11.13.0.

**Spec:** `docs/superpowers/specs/2026-08-10-header-banner-design.md`

## Global Constraints

- Package manager is **pnpm**, never npm or yarn. Install into the web workspace with `pnpm --dir apps/web add -D <pkg>`.
- All commands below are run from the repository root unless stated otherwise.
- Branch is `feature/header-banner` (already created; the spec commit is on it).
- Conventional Commit subjects: `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Components use **named exports** and extract Tailwind class strings to module-level `const`s, matching `src/components/students/status-filter.tsx`.
- Palette is Tailwind `zinc`, matching existing components.
- Do not weaken types, lint rules, or tests to make a step pass.
- Never claim a command passed without running it.

## Teaching Contract Note

`CLAUDE.md` reserves concept-critical code for the author. Each task below marks
its concept-critical items. During execution the author writes those; the code
in this plan is the reference to check against, not to paste. Mechanical items
(config, imports, types, wiring, fixtures, empty test blocks) are the author's
by a different route — they are boilerplate — but may be taken from here
directly.

Per Teaching Contract step 3, assertions and implementation are never written in
the same step. Each task below orders them: empty blocks → assertions → run and
watch it fail → implement → run and watch it pass.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/vitest.config.ts` | Test runner config; mirrors the `@/*` path alias |
| `apps/web/vitest.setup.ts` | jest-dom matchers, RTL cleanup between tests |
| `apps/web/src/test/render-with-providers.tsx` | Wraps a UI tree in `QueryClientProvider` for tests |
| `apps/web/src/lib/session.ts` | The session cookie name, shared by middleware and server auth |
| `apps/web/src/lib/auth-server.ts` | Server-only: fetch current user, redirect on 401 |
| `apps/web/src/components/layout/header/header-brand.tsx` | Brand wordmark linking to `/` |
| `apps/web/src/components/layout/header/account-menu.tsx` | Disclosure button + panel with email and logout |
| `apps/web/src/components/layout/header/app-header.tsx` | Banner landmark composing brand + account menu |
| `apps/web/src/app/(app)/layout.tsx` | Authenticated shell: fetch user, render header |
| `apps/web/src/app/(app)/error.tsx` | Error boundary for the authenticated shell |
| `apps/web/src/app/(app)/page.tsx` | Students page, moved; inline header removed |

Deleted: `apps/web/src/components/auth/logout-button.tsx`.

---

## Task 1: Frontend test infrastructure

`apps/web` has no test runner today. Nothing else in this plan can follow the
red/green cycle until this exists.

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Create: `apps/web/src/test/render-with-providers.tsx`
- Create: `apps/web/src/test/setup.test.tsx`
- Modify: `apps/web/package.json` (add `test` script + devDependencies)

**Interfaces:**
- Consumes: nothing.
- Produces: `renderWithProviders(ui: ReactElement): RenderResult` from
  `@/test/render-with-providers`. A `pnpm --dir apps/web test` script that runs
  `vitest run`.

**Concept-critical:** none. This task is entirely tooling configuration.

- [ ] **Step 1: Install the test dependencies**

```bash
pnpm --dir apps/web add -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 2: Create the Vitest config**

Create `apps/web/vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

`globals` is deliberately left off. Tests import `describe`/`it`/`expect` from
`vitest` explicitly, which keeps `tsconfig.json` untouched — turning globals on
would require adding `"types": ["vitest/globals"]` there.

- [ ] **Step 3: Create the setup file**

Create `apps/web/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

The explicit `cleanup` is required because RTL's automatic cleanup only
registers when Vitest globals are enabled, and they are not.

- [ ] **Step 4: Create the provider test helper**

Create `apps/web/src/test/render-with-providers.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}
```

Retries are disabled so a failing mutation surfaces its error state
immediately instead of after backoff.

- [ ] **Step 5: Add the test script**

In `apps/web/package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

This makes the root `turbo run test` task meaningful for web; it currently
no-ops because the workspace defines no `test` script.

- [ ] **Step 6: Write the smoke test**

Create `apps/web/src/test/setup.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";

describe("test setup", () => {
  it("renders JSX into jsdom with jest-dom matchers available", () => {
    renderWithProviders(<h1>Evolve</h1>);

    expect(
      screen.getByRole("heading", { name: "Evolve" }),
    ).toBeInTheDocument();
  });
});
```

This asserts the toolchain — React rendering, jsdom, the `@/` alias, jest-dom
matchers, and the query provider — rather than any application behavior.

- [ ] **Step 7: Run the test suite**

Run: `pnpm --dir apps/web test`
Expected: 1 test file, 1 test passing.

- [ ] **Step 8: Confirm typecheck and lint still pass**

Run: `pnpm --dir apps/web typecheck && pnpm --dir apps/web lint`
Expected: both exit 0. The new `.ts`/`.tsx` files fall under the existing
`include` globs, so they are typechecked from now on.

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/vitest.config.ts \
  apps/web/vitest.setup.ts apps/web/src/test
git commit -m "$(cat <<'EOF'
chore: add vitest and react testing library to the web app

Adds the frontend test runner the repository was missing, so turbo run test
covers apps/web.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Server-side current user

**Files:**
- Create: `apps/web/src/lib/session.ts`
- Create: `apps/web/src/lib/auth-server.ts`
- Create: `apps/web/src/lib/auth-server.test.ts`
- Modify: `apps/web/src/middleware.ts:3` (use the shared constant)

**Interfaces:**
- Consumes: `apiRequest` and `ApiError` from `@/lib/api`; `User` from `@/types/auth`.
- Produces: `SESSION_COOKIE_NAME: string` from `@/lib/session`;
  `requireCurrentUser(): Promise<User>` from `@/lib/auth-server`.

**Concept-critical** (Learning Objectives — server/client boundaries,
authentication and authorization boundaries): the body of `requireCurrentUser`,
in particular the cookie forwarding and the 401 branch.

- [ ] **Step 1: Extract the session cookie name**

Create `apps/web/src/lib/session.ts`:

```ts
export const SESSION_COOKIE_NAME = "session_token";
```

Update `apps/web/src/middleware.ts` to import it instead of declaring its own
copy, deleting the local `const SESSION_COOKIE_NAME = "session_token";` on line 3:

```ts
import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/session";
```

`session.ts` holds only the constant, with no `next/headers` import, so the
Edge-runtime middleware can safely import it.

- [ ] **Step 2: Write the empty test blocks**

Create `apps/web/src/lib/auth-server.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiRequest: vi.fn(),
}));

const { cookies } = await import("next/headers");
const { redirect } = await import("next/navigation");
const { ApiError, apiRequest } = await import("@/lib/api");
const { requireCurrentUser } = await import("@/lib/auth-server");

const staffUser = {
  id: 1,
  email: "staff@evolve.test",
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.mocked(cookies).mockResolvedValue({
    get: () => ({ name: "session_token", value: "abc123" }),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
  vi.mocked(apiRequest).mockReset();
  vi.mocked(redirect).mockClear();
});

describe("requireCurrentUser", () => {
  it("forwards the session cookie to the API", async () => {});

  it("returns the user the API responds with", async () => {});

  it("redirects to /login when the session is rejected", async () => {});

  it("rethrows errors that are not 401", async () => {});
});
```

The `redirect` mock throws, mirroring the real `next/navigation` behavior where
`redirect()` never returns.

- [ ] **Step 3: Fill in the assertions**

Replace the four empty bodies:

```ts
  it("forwards the session cookie to the API", async () => {
    vi.mocked(apiRequest).mockResolvedValue(staffUser);

    await requireCurrentUser();

    expect(apiRequest).toHaveBeenCalledWith("/api/auth/me", {
      headers: { Cookie: "session_token=abc123" },
    });
  });

  it("returns the user the API responds with", async () => {
    vi.mocked(apiRequest).mockResolvedValue(staffUser);

    await expect(requireCurrentUser()).resolves.toEqual(staffUser);
  });

  it("redirects to /login when the session is rejected", async () => {
    vi.mocked(apiRequest).mockRejectedValue(
      new ApiError("Not authenticated", 401),
    );

    await expect(requireCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("rethrows errors that are not 401", async () => {
    vi.mocked(apiRequest).mockRejectedValue(
      new ApiError("Server exploded", 500),
    );

    await expect(requireCurrentUser()).rejects.toThrow("Server exploded");
    expect(redirect).not.toHaveBeenCalled();
  });
```

- [ ] **Step 4: Run the tests and verify they fail**

Run: `pnpm --dir apps/web test src/lib/auth-server.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/auth-server"`, because the
module does not exist yet.

- [ ] **Step 5: Implement `requireCurrentUser`**

Create `apps/web/src/lib/auth-server.ts`:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, apiRequest } from "@/lib/api";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { User } from "@/types/auth";

export async function requireCurrentUser(): Promise<User> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);

  try {
    return await apiRequest<User>("/api/auth/me", {
      headers: session
        ? { Cookie: `${SESSION_COOKIE_NAME}=${session.value}` }
        : {},
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login");
    }

    throw error;
  }
}
```

Two things worth understanding rather than copying. First, `cookies()` is
awaited — it has returned a Promise since Next 15, and awaiting it opts this
route into dynamic rendering. Second, `credentials: "include"` in
`lib/api.ts:24` does nothing here: it is a browser fetch option, and Node's
fetch has no cookie jar, so the header must be built by hand.

- [ ] **Step 6: Run the tests and verify they pass**

Run: `pnpm --dir apps/web test src/lib/auth-server.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/session.ts apps/web/src/lib/auth-server.ts \
  apps/web/src/lib/auth-server.test.ts apps/web/src/middleware.ts
git commit -m "$(cat <<'EOF'
feat: fetch the current user from server components

Adds requireCurrentUser, which forwards the session cookie to /api/auth/me
and redirects to /login when the session is rejected. Middleware only checks
that the cookie exists, so an invalid session needs handling here.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Account menu

**Files:**
- Create: `apps/web/src/components/layout/header/account-menu.tsx`
- Create: `apps/web/src/components/layout/header/account-menu.test.tsx`

**Interfaces:**
- Consumes: `renderWithProviders` from `@/test/render-with-providers`; `logout`
  from `@/lib/auth`.
- Produces: `AccountMenu({ userEmail }: { userEmail: string })` from
  `@/components/layout/header/account-menu`.

**Concept-critical** (Learning Objectives — state snapshots and hooks, server
versus client boundaries, forms and mutations, accessibility): the whole
component. In particular, why the effect is the correct tool here and why the
`"use client"` boundary starts at this file rather than at `AppHeader`.

- [ ] **Step 1: Write the empty test blocks**

Create `apps/web/src/components/layout/header/account-menu.test.tsx`:

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@/lib/auth", () => ({ logout: vi.fn() }));

const { logout } = await import("@/lib/auth");
const { AccountMenu } = await import(
  "@/components/layout/header/account-menu"
);
const { renderWithProviders } = await import("@/test/render-with-providers");

const userEmail = "staff@evolve.test";

beforeEach(() => {
  push.mockClear();
  vi.mocked(logout).mockReset();
  vi.mocked(logout).mockResolvedValue(undefined);
});

describe("AccountMenu", () => {
  it("hides the panel until the trigger is clicked", () => {});

  it("reveals the signed-in email when opened", async () => {});

  it("closes on Escape and returns focus to the trigger", async () => {});

  it("logs out and navigates to the login page", async () => {});

  it("keeps the panel open and shows an error when logout fails", async () => {});
});
```

- [ ] **Step 2: Fill in the assertions**

Replace the five empty bodies:

```tsx
  it("hides the panel until the trigger is clicked", () => {
    renderWithProviders(<AccountMenu userEmail={userEmail} />);

    const trigger = screen.getByRole("button", { name: "Account menu" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(userEmail)).not.toBeInTheDocument();
  });

  it("reveals the signed-in email when opened", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountMenu userEmail={userEmail} />);

    const trigger = screen.getByRole("button", { name: "Account menu" });
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(userEmail)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Log out" }),
    ).toBeVisible();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountMenu userEmail={userEmail} />);

    const trigger = screen.getByRole("button", { name: "Account menu" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(userEmail)).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("logs out and navigates to the login page", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountMenu userEmail={userEmail} />);

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/login");
    });
    expect(logout).toHaveBeenCalledOnce();
  });

  it("keeps the panel open and shows an error when logout fails", async () => {
    vi.mocked(logout).mockRejectedValue(new Error("Network unreachable"));

    const user = userEvent.setup();
    renderWithProviders(<AccountMenu userEmail={userEmail} />);

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unreachable",
    );
    expect(screen.getByText(userEmail)).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });
```

- [ ] **Step 3: Run the tests and verify they fail**

Run: `pnpm --dir apps/web test src/components/layout/header/account-menu.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/layout/header/account-menu"`.

- [ ] **Step 4: Implement `AccountMenu`**

Create `apps/web/src/components/layout/header/account-menu.tsx`:

```tsx
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logout } from "@/lib/auth";

const containerClassName = "relative";

const triggerClassName =
  "flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

const panelClassName =
  "absolute right-0 z-10 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg";

const emailClassName =
  "truncate px-3 py-2 text-sm font-medium text-zinc-900";

const logoutClassName =
  "w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";

const errorClassName = "px-3 py-2 text-sm text-red-700";

export function AccountMenu({ userEmail }: { userEmail: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.push("/login");
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={containerClassName}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-expanded={isOpen}
        aria-controls="account-menu-panel"
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        className={triggerClassName}
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

      {isOpen && (
        <div id="account-menu-panel" className={panelClassName}>
          <p className={emailClassName}>{userEmail}</p>

          <hr className="my-1 border-zinc-200" />

          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={logoutClassName}
          >
            {mutation.isPending ? "Logging out..." : "Log out"}
          </button>

          {mutation.isError && (
            <p role="alert" className={errorClassName}>
              {mutation.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

The effect is the right tool here for the reason `.claude/rules/react-nextjs.md`
allows: it synchronizes React with an external system — the `document` — rather
than standing in for an event handler. The click that toggles the panel stays in
`onClick`, where it belongs.

The panel is conditionally rendered rather than hidden with CSS, which is why
the tests assert `not.toBeInTheDocument()` rather than `not.toBeVisible()`.

- [ ] **Step 5: Run the tests and verify they pass**

Run: `pnpm --dir apps/web test src/components/layout/header/account-menu.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/layout/header/account-menu.tsx \
  apps/web/src/components/layout/header/account-menu.test.tsx
git commit -m "$(cat <<'EOF'
feat: add the account menu component

A disclosure button revealing the signed-in email and a logout action, with
Escape and outside-click dismissal. Surfaces logout failures instead of
discarding them.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Header brand and banner

**Files:**
- Create: `apps/web/src/components/layout/header/header-brand.tsx`
- Create: `apps/web/src/components/layout/header/app-header.tsx`
- Create: `apps/web/src/components/layout/header/app-header.test.tsx`

**Interfaces:**
- Consumes: `AccountMenu` from `@/components/layout/header/account-menu`.
- Produces: `HeaderBrand()` from `@/components/layout/header/header-brand`;
  `AppHeader({ userEmail }: { userEmail: string })` from
  `@/components/layout/header/app-header`.

**Concept-critical** (Learning Objectives — component composition, Server and
Client Components, accessibility): the decision that these two files carry no
`"use client"` directive, and the banner landmark semantics.

- [ ] **Step 1: Write the empty test blocks**

Create `apps/web/src/components/layout/header/app-header.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/auth", () => ({ logout: vi.fn() }));

const { AppHeader } = await import("@/components/layout/header/app-header");
const { renderWithProviders } = await import("@/test/render-with-providers");

describe("AppHeader", () => {
  it("renders a banner landmark", () => {});

  it("links the brand to the dashboard", () => {});

  it("renders the account menu trigger", () => {});
});
```

- [ ] **Step 2: Fill in the assertions**

```tsx
  it("renders a banner landmark", () => {
    renderWithProviders(<AppHeader userEmail="staff@evolve.test" />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("links the brand to the dashboard", () => {
    renderWithProviders(<AppHeader userEmail="staff@evolve.test" />);

    expect(
      screen.getByRole("link", { name: "Evolve Martial Arts" }),
    ).toHaveAttribute("href", "/");
  });

  it("renders the account menu trigger", () => {
    renderWithProviders(<AppHeader userEmail="staff@evolve.test" />);

    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toBeInTheDocument();
  });
```

The first assertion is the interesting one: it passes only because `<header>`
is not nested inside `<main>`, `<article>`, or `<section>`. It is a real
regression guard against someone later moving the header inside the page.

- [ ] **Step 3: Run the tests and verify they fail**

Run: `pnpm --dir apps/web test src/components/layout/header/app-header.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/layout/header/app-header"`.

- [ ] **Step 4: Implement `HeaderBrand`**

Create `apps/web/src/components/layout/header/header-brand.tsx`:

```tsx
import Link from "next/link";

const brandClassName =
  "rounded-md text-base font-semibold tracking-tight text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2";

export function HeaderBrand() {
  return (
    <Link href="/" className={brandClassName}>
      Evolve Martial Arts
    </Link>
  );
}
```

No `aria-label`: the link already has an accessible name from its text content,
and adding one would only override it. When the logo image arrives, this file is
the only one that changes — and at that point the image needs `alt="Evolve
Martial Arts"` to preserve the accessible name the test asserts.

- [ ] **Step 5: Implement `AppHeader`**

Create `apps/web/src/components/layout/header/app-header.tsx`:

```tsx
import { AccountMenu } from "@/components/layout/header/account-menu";
import { HeaderBrand } from "@/components/layout/header/header-brand";

const headerClassName = "border-b border-zinc-200 bg-white";

const innerClassName =
  "mx-auto flex h-16 max-w-6xl items-center justify-between px-6";

export function AppHeader({ userEmail }: { userEmail: string }) {
  return (
    <header className={headerClassName}>
      <div className={innerClassName}>
        <HeaderBrand />
        <AccountMenu userEmail={userEmail} />
      </div>
    </header>
  );
}
```

`justify-between` is doing the job pontem's `<v-spacer />` does in
`NavBar.vue:139`. There is no `role="banner"` because `<header>` carries that
role implicitly here; pontem needs it explicitly because `v-app-bar` renders a
bare `<div>`.

Note this file has no `"use client"` directive even though it renders a client
component. It stays a Server Component and `AccountMenu` marks the boundary
itself — importing a client component from a server component is exactly how the
boundary is meant to be drawn.

- [ ] **Step 6: Run the tests and verify they pass**

Run: `pnpm --dir apps/web test src/components/layout/header/app-header.test.tsx`
Expected: PASS, 3 tests.

**If the run fails inside `next/link`** rather than on an assertion: `Link`
reads the App Router context, and this suite renders it outside a router. This
project does not use `next/jest`, which would normally paper over that. The fix
is to stub the module at the top of the test file, alongside the existing
mocks — a link is an anchor, and this suite is asserting composition, not
Next.js navigation internals:

```tsx
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
```

Apply this only if the unmocked run actually fails; an unnecessary mock is a
test that stops reflecting the real component.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/layout/header/header-brand.tsx \
  apps/web/src/components/layout/header/app-header.tsx \
  apps/web/src/components/layout/header/app-header.test.tsx
git commit -m "$(cat <<'EOF'
feat: add the header banner and brand

Composes the brand wordmark and account menu into a banner landmark, keeping
the client boundary at the account menu.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Mount the header on authenticated routes

**Files:**
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/app/(app)/error.tsx`
- Move: `apps/web/src/app/page.tsx` → `apps/web/src/app/(app)/page.tsx`
- Modify: the moved `page.tsx` (remove the inline header block)
- Delete: `apps/web/src/components/auth/logout-button.tsx`

**Interfaces:**
- Consumes: `requireCurrentUser` from `@/lib/auth-server`; `AppHeader` from
  `@/components/layout/header/app-header`.
- Produces: nothing imported elsewhere.

**Concept-critical** (Learning Objectives — App Router architecture, server
versus client boundaries, caching and revalidation): the route group layout and
why it may assume a non-null user.

- [ ] **Step 1: Move the students page into the route group**

```bash
mkdir -p "apps/web/src/app/(app)"
git mv apps/web/src/app/page.tsx "apps/web/src/app/(app)/page.tsx"
```

`(app)` is a route group: parentheses keep it out of the URL, so the students
page stays at `/`.

- [ ] **Step 2: Create the authenticated layout**

Create `apps/web/src/app/(app)/layout.tsx`:

```tsx
import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/header/app-header";
import { requireCurrentUser } from "@/lib/auth-server";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireCurrentUser();

  return (
    <>
      <AppHeader userEmail={user.email} />
      {children}
    </>
  );
}
```

There is no null-user branch because `middleware.ts` guarantees a session cookie
on every route in this group, and `requireCurrentUser` redirects when that
cookie turns out to be invalid. The layout is glue by design — the logic worth
testing was deliberately extracted in Task 2.

- [ ] **Step 3: Create the error boundary**

Create `apps/web/src/app/(app)/error.tsx`:

```tsx
"use client";

const containerClassName =
  "mx-auto mt-12 max-w-md rounded-lg border border-red-200 bg-red-50 p-6";

const retryClassName =
  "mt-4 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white";

export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className={containerClassName}>
      <h1 className="font-semibold text-red-900">Something went wrong</h1>

      <p className="mt-1 text-sm text-red-700">{error.message}</p>

      <button type="button" onClick={reset} className={retryClassName}>
        Try again
      </button>
    </div>
  );
}
```

Error boundaries must be Client Components — they rely on React error
boundaries, which do not exist on the server.

- [ ] **Step 4: Remove the inline header from the students page**

In `apps/web/src/app/(app)/page.tsx`, delete the `LogoutButton` import on line 1
and replace the `<header>` block (lines 18–34) so the page keeps only its own
title, with the brand line and logout button now living in the banner:

```tsx
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950">
          Students
        </h1>

        <p className="mt-3 max-w-2xl text-zinc-600">
          View and manage the students enrolled at the school.
        </p>
      </header>
```

Also reduce the top padding on `<main>`, since the banner now occupies that
space — change `py-12` to `pb-12 pt-8`.

This inner `<header>` does not conflict with the banner: nested inside `<main>`,
it carries no landmark role.

- [ ] **Step 5: Delete the now-unused logout button**

```bash
git rm apps/web/src/components/auth/logout-button.tsx
```

Confirm nothing still references it:

Run: `grep -rn "logout-button\|LogoutButton" apps/web/src`
Expected: no output.

- [ ] **Step 6: Run the full test suite, typecheck, lint, and build**

```bash
pnpm --dir apps/web test
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
pnpm --dir apps/web build
```

Expected: 4 test files and 13 tests passing; typecheck and lint exit 0; the
build succeeds and lists `/` as dynamically rendered on demand rather than
prerendered as static content, because `requireCurrentUser` reads cookies. If
the build reports `/` as static, the cookie read is not happening where you
think it is — investigate before moving on.

- [ ] **Step 7: Verify in the running app**

Start the stack per `startup.md`, then confirm by hand, since no automated test
covers the assembled shell:

1. `/login` and `/signup` render with **no** banner.
2. After signing in, `/` shows the banner with the brand at left and the menu
   trigger at right.
3. The menu opens on click and shows the signed-in email.
4. Escape closes it and focus returns to the trigger.
5. Log out returns to `/login`.
6. With the API stopped, loading `/` shows the error boundary rather than an
   unhandled crash.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: show the header banner on authenticated routes

Moves the students page into an (app) route group whose layout fetches the
current user and renders the banner. Replaces the page's inline header and
the standalone logout button with the account menu.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9: Open the pull request**

```bash
git push -u origin feature/header-banner
gh pr create --title "feat: add header banner" --body "$(cat <<'EOF'
## Summary

Adds a persistent header banner to authenticated routes, structured after
pontem-ui's NavBar.vue: thin composition over small single-purpose children,
colocated tests, explicit accessibility.

- `(app)` route group whose layout fetches the current user server-side
- `AppHeader` composing `HeaderBrand` and a client `AccountMenu`
- `requireCurrentUser` forwards the session cookie and redirects on 401
- Vitest + React Testing Library, which the web app previously lacked
- Removes the standalone logout button, now owned by the account menu

## Notes

`middleware.ts` only checks that the session cookie exists, never that it is
valid. A stale cookie previously would have sailed through; the 401 branch in
`requireCurrentUser` now handles it.

Design: `docs/superpowers/specs/2026-08-10-header-banner-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage.** Every section of the design maps to a task: test tooling →
Task 1; `lib/auth-server.ts`, cookie forwarding, caching, the 401 bug → Task 2;
`AccountMenu` with the disclosure pattern and logout error handling → Task 3;
`HeaderBrand`, `AppHeader`, banner semantics → Task 4; route group, layout,
error boundary, page move, `logout-button.tsx` deletion → Task 5. The four
"deliberately not carried over" decisions are reflected: flat files inside one
header folder, no snapshot assertions anywhere, disclosure rather than
`role="menu"`, text wordmark with no theme swap.

**Type consistency.** `requireCurrentUser(): Promise<User>` is produced in Task
2 and consumed in Task 5. `AccountMenu({ userEmail: string })` is produced in
Task 3 and consumed in Task 4. `AppHeader({ userEmail: string })` is produced in
Task 4 and consumed in Task 5. `SESSION_COOKIE_NAME` is produced in Task 2 and
consumed by both `auth-server.ts` and `middleware.ts`. `renderWithProviders` is
produced in Task 1 and consumed in Tasks 1, 3, and 4. The panel id
`account-menu-panel` matches between `aria-controls` and the panel element.

**Known gap.** `app/(app)/layout.tsx` has no unit test — it is an async Server
Component that RTL cannot render. Step 7 of Task 5 covers it manually. This is
stated in the design rather than papered over.
