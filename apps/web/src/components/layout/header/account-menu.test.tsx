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
  it("hides the panel until the trigger is clicked", () => {
    renderWithProviders(<AccountMenu userEmail={userEmail} />);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(userEmail)).not.toBeInTheDocument();
  });

  it("reveals the signed-in email when opened", async () => {
    renderWithProviders(<AccountMenu userEmail={userEmail} />);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(userEmail)).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    renderWithProviders(<AccountMenu userEmail={userEmail} />);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByText(userEmail)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveFocus();
  });

  it("logs out and navigates to the login page", async () => {
    renderWithProviders(<AccountMenu userEmail={userEmail} />);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(logout).toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });

  it("keeps the panel open and shows an error when logout fails", async () => {
    renderWithProviders(<AccountMenu userEmail={userEmail} />);
    vi.mocked(logout).mockRejectedValue(new Error("Network error"));
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Network error");
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("closes when a click lands outside the menu", async () => {
    renderWithProviders(<AccountMenu userEmail={userEmail} />);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(document.body);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("disables the logout button while the request is in flight", async () => {
    vi.mocked(logout).mockReturnValue(new Promise(() => { }))
    renderWithProviders(<AccountMenu userEmail={userEmail} />);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(screen.getByRole("button", { name: "Logging out..." })).toBeDisabled();
  });
});
