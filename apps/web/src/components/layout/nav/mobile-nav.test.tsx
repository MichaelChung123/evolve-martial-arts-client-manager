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
    expect(getDialog(container)).not.toBeVisible();
  });

  it("opens the drawer when the trigger is clicked", async () => {
    const { container } = render(<MobileNav />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(getDialog(container)).toBeVisible();
  });

  it("closes the drawer when a nav link is clicked", async () => {
    const { container } = render(<MobileNav />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    await userEvent.click(screen.getByRole("link", { name: "Students" }));
    expect(getDialog(container)).not.toBeVisible();
  });

  it("closes the drawer when the backdrop is clicked", async () => {
    const { container } = render(<MobileNav />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = getDialog(container);
    // Guards against a false pass: without this, a trigger that did nothing
    // would leave the dialog closed and the final assertion trivially true.
    expect(dialog).toBeVisible();

    await userEvent.click(dialog);
    expect(dialog).not.toBeVisible();
  });

  it("keeps the drawer open when its contents are clicked", async () => {
    const { container } = render(<MobileNav />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    await userEvent.click(screen.getByRole("navigation"));
    expect(getDialog(container)).toBeVisible();
  });
});
