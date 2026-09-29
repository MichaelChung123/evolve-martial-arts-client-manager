import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";
import { ClassForm } from "@/components/classes/class-form";

vi.mock("@/lib/programs", () => ({
  getPrograms: vi.fn(async () => [
    { id: 1, name: "Kids", description: null, archived_at: null, created_at: "", updated_at: "" },
  ]),
}));

vi.mock("@/lib/classes", () => ({
  createClass: vi.fn(),
}));

const { createClass } = await import("@/lib/classes");

describe("ClassForm", () => {
  it("rejects submission with no weekday selected", async () => {
    // TODO(you): render <ClassForm />, wait for the program option to load,
    // fill in name/program/start time/end time but check no day checkbox,
    // submit, and assert a validation message appears and createClass was
    // never called. This is what proves createClassSchema's non-empty
    // weekdays rule (Task 4 Step 3) actually fires from the UI.

    renderWithProviders(<ClassForm />);
    await waitFor(() => expect(screen.getByRole("option", { name: "Kids" })).toBeInTheDocument());
    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "My Class");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Program" }), "1");
    await userEvent.type(screen.getByLabelText("Start time"), "09:00");
    await userEvent.type(screen.getByLabelText("End time"), "10:00");
    await userEvent.click(screen.getByRole("button", { name: "Create class" }));
    await waitFor(() => expect(screen.getByText("Select at least one day")).toBeInTheDocument());
    expect(createClass).not.toHaveBeenCalled();
  });

  it("rejects an end time before the start time", async () => {
    // TODO(you): fill the form with a valid name/program/day, but set
    // start_time later than end_time, submit, and assert the cross-field
    // validation error appears and createClass was never called.
    renderWithProviders(<ClassForm />);
    await userEvent.type(screen.getByLabelText("Start time"), "10:00");
    await userEvent.type(screen.getByLabelText("End time"), "09:00");
    await userEvent.click(screen.getByRole("checkbox", { name: "Mon" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Program" }), "1");
    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "My Class");
    await userEvent.click(screen.getByRole("button", { name: "Create class" }));
    await waitFor(() => expect(screen.getByText("End time must be after start time")).toBeInTheDocument());
    expect(createClass).not.toHaveBeenCalled();
  });

  it("submits with the nested schedule shape createClass expects", async () => {
    // TODO(you): fill in a fully valid class (name, program, at least one
    // day, start_time before end_time), submit, and assert createClass was
    // called once with a payload whose `schedule` field has the expected
    // { weekdays, start_time, end_time } — this is what proves the Zod
    // schema's flat-to-nested transform (Task 4 Step 3) produces the shape
    // CreateClassInput expects.
    renderWithProviders(<ClassForm />);
    await userEvent.type(screen.getByLabelText("Start time"), "09:00");
    await userEvent.type(screen.getByLabelText("End time"), "10:00");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Program" }), "1");
    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "My Class");
    await userEvent.click(screen.getByRole("checkbox", { name: "Mon" }));
    await userEvent.click(screen.getByRole("button", { name: "Create class" }));
    await waitFor(() => expect(createClass).toHaveBeenCalledTimes(1));
    expect(createClass).toHaveBeenCalledWith(
      expect.objectContaining({ schedule: { weekdays: [0], start_time: "09:00", end_time: "10:00" } }),
      expect.anything(),
    );
  });
});
