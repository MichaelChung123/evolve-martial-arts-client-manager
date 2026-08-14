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
