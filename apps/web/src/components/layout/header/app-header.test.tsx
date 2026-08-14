import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// `AppHeader` is a Server Component, but it renders `AccountMenu`, which is a
// client component with a router and a mutation. These two mocks exist for the
// child, not for the component under test.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/auth", () => ({ logout: vi.fn() }));

const { AppHeader } = await import("@/components/layout/header/app-header");
const { renderWithProviders } = await import("@/test/render-with-providers");

const userEmail = "staff@evolve.test";

describe("AppHeader", () => {
  it("renders a banner landmark", () => {
    renderWithProviders(<AppHeader userEmail={userEmail} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("links the brand to the dashboard", () => {
    renderWithProviders(<AppHeader userEmail={userEmail} />);
    expect(screen.getByRole("link", { name: "Evolve Martial Arts" })).toHaveAttribute("href", "/");
  });

  it("renders the account menu trigger", () => {
    renderWithProviders(<AppHeader userEmail={userEmail} />);
    expect(screen.getByRole("button", { name: "Account menu" })).toBeInTheDocument();
  });

  it("passes the signed-in email through to the account menu", async () => {
    renderWithProviders(<AppHeader userEmail={userEmail} />);
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByText(userEmail)).toBeInTheDocument();
  });
});
