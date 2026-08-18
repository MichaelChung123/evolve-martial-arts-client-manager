import { describe, expect, it } from "vitest";

import { navCollapsedCookie } from "@/components/layout/nav/nav-preferences";

describe("navCollapsedCookie", () => {
  it("records a collapsed sidebar", () => {
    const collapsed = navCollapsedCookie(true)
    expect(collapsed).toMatch(/nav-collapsed=1/);
  });

  it("records an expanded sidebar", () => {
    const expanded = navCollapsedCookie(false)
    expect(expanded).toMatch(/nav-collapsed=0/);
  });

  it("scopes the preference to every route", () => {
    const collapsed = navCollapsedCookie(true)
    expect(collapsed).toMatch(/path=\//);
  });
});
