import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";
import { ProgramList } from "@/components/programs/program-list";

vi.mock("@/lib/programs", () => ({
  getPrograms: vi.fn(),
}));

const { getPrograms } = await import("@/lib/programs");

describe("ProgramList", () => {
  it("renders each program returned by the query", async () => {
    // TODO(you): mock getPrograms to resolve with a couple of synthetic
    // programs, render <ProgramList status="active" />, and assert their
    // names appear on screen (use waitFor since the query resolves async).
    vi.mocked(getPrograms).mockResolvedValue([
      { id: 1, name: "Program 1", description: null, archived_at: null, created_at: "2024-01-01", updated_at: "2024-01-01" },
      { id: 2, name: "Program 2", description: null, archived_at: null, created_at: "2024-01-01", updated_at: "2024-01-01" },
    ]);
    renderWithProviders(<ProgramList status="active" />);
    await waitFor(() => expect(screen.getByText("Program 1")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Program 2")).toBeInTheDocument());
  });

  it("shows the active empty state when there are no programs", async () => {
    // TODO(you): mock getPrograms to resolve with [], render, and assert
    // the "No active programs" heading appears.
    vi.mocked(getPrograms).mockResolvedValue([]);
    renderWithProviders(<ProgramList status="active" />);
    await waitFor(() => expect(screen.getByText("No active programs")).toBeInTheDocument());  
  });
});
