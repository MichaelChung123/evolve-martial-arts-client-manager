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
    expect(screen.getByRole("link", { name: "Students" })).toHaveAttribute("href", "/");
  });

  it("marks the item matching the current path as the current page", () => {
    render(<NavList />);
    expect(screen.getByRole("link", { name: "Students" })).toHaveAttribute("aria-current", "page");
  });

  it("leaves non-matching items without an aria-current attribute", () => {
    pathname = "/somewhere-else";
    render(<NavList />);
    expect(screen.getByRole("link", { name: "Students" })).not.toHaveAttribute("aria-current");
  });

  it("calls onNavigate when a link is clicked", async () => {
    pathname = "/somewhere-else";
    const onNavigate = vi.fn();
    render(<NavList onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("link", { name: "Students" }));
    expect(onNavigate).toHaveBeenCalled();
  });

  it("calls onNavigate even when the link is for the current page", async () => {
    pathname = "/";
    const onNavigate = vi.fn();
    render(<NavList onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("link", { name: "Students" }));
    expect(onNavigate).toHaveBeenCalled();
  });

  it("renders a decorative icon that stays out of the link's name", () => {
    const { container } = render(<NavList />);
    // TODO(you): assert the svg is hidden from assistive technology, and that
    // the link's accessible name is still exactly "Students".
    //
    // Q: If you dropped aria-hidden, which of these two assertions would fail,
    //    and what would the accessible name become?

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Students" })).toBeInTheDocument();
  });
});
