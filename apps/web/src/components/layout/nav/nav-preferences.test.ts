import { describe, expect, it } from "vitest";

import { navCollapsedCookie } from "@/components/layout/nav/nav-preferences";

describe("navCollapsedCookie", () => {
  it("records a collapsed sidebar", () => {
    // TODO(you): assert the returned string sets the value to "1".
    const collapsed = navCollapsedCookie(true)
    expect(collapsed).toMatch(/nav-collapsed=1/);
  });

  it("records an expanded sidebar", () => {
    // TODO(you): assert "0".
    //
    // Q: Why write "0" rather than deleting the cookie? What reads it, and
    //    what would an absent cookie mean to that reader?
    const expanded = navCollapsedCookie(false)
    expect(expanded).toMatch(/nav-collapsed=0/);
  });

  it("scopes the preference to every route", () => {
    // TODO(you): assert path=/ is present.
    const collapsed = navCollapsedCookie(true)
    expect(collapsed).toMatch(/path=\//);
  });
});
