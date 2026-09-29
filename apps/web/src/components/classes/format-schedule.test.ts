import { describe, expect, it } from "vitest";

import { formatSchedule } from "@/components/classes/format-schedule";

describe("formatSchedule", () => {
  it("formats a single weekday with a 12-hour time range", () => {
    expect(
      formatSchedule({ weekdays: [1], start_time: "17:00:00", end_time: "18:00:00" }),
    ).toBe("Tue · 5:00 PM–6:00 PM");
  });

  it("sorts and joins multiple weekdays", () => {
    expect(
      formatSchedule({ weekdays: [3, 1], start_time: "09:00:00", end_time: "10:30:00" }),
    ).toBe("Tue, Thu · 9:00 AM–10:30 AM");
  });
});
