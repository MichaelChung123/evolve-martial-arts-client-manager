import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const { AppSidebar } = await import("@/components/layout/nav/app-sidebar");

// jsdom keeps document.cookie for the whole file, so without this a cookie
// written by one test would still be there for the next one.
beforeEach(() => {
  document.cookie = "nav-collapsed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

describe("AppSidebar", () => {
  it("renders expanded when no preference is supplied", () => {
    render(<AppSidebar />);
    // TODO(you): assert the toggle's accessible name and its aria-expanded.
    const toggle = screen.getByRole("button", { name: "Collapse navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("renders collapsed when the caller says so", () => {
    render(<AppSidebar defaultCollapsed />);
    // TODO(you): assert both again, for the other state.
    const toggle = screen.getByRole("button", { name: "Expand navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("collapses when the toggle is clicked", async () => {
    render(<AppSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));
    // TODO(you): assert the toggle now reports the collapsed state.
    //
    // Q: You clicked a button found by one name and must now find it by
    //    another. What does that tell you about querying by accessible name
    //    when the name is derived from state?
    const toggle = screen.getByRole("button", { name: "Expand navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the nav link reachable by name when collapsed", () => {
    render(<AppSidebar defaultCollapsed />);
    // TODO(you): assert the "Students" link is still findable.
    expect(screen.getByRole("link", { name: "Students" })).toBeInTheDocument()
  });

  it("remembers the collapsed choice in a cookie", async () => {
    render(<AppSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));
    // TODO(you): assert document.cookie now carries the collapsed preference.
    //
    // Q: This test proves the browser was told. It cannot prove the sidebar
    //    comes back collapsed after a reload. Which step of the manual
    //    verification below is the only thing that can, and why can no jsdom
    //    test replace it?
    expect(document.cookie).toMatch(/nav-collapsed=1/);
  });
});
