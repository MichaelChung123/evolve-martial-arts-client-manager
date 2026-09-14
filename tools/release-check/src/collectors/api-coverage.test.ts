import { describe, expect, it } from "vitest";
import { parseApiCoverage } from "./api-coverage.ts";

const FIXTURE = JSON.stringify({
  meta: { version: "7.1.0", timestamp: "2026-08-25T00:00:00", branch_coverage: false, show_contexts: false },
  files: {},
  totals: {
    covered_lines: 240,
    num_statements: 300,
    percent_covered: 80.0,
    percent_covered_display: "80",
    missing_lines: 60,
    excluded_lines: 0,
  },
});

describe("parseApiCoverage", () => {
  it("passes when total coverage is at or above the floor", () => {
    expect(parseApiCoverage(FIXTURE, 75)).toEqual({
      app: "api",
      actualPercent: 80,
      floorPercent: 75,
      passed: true,
    });
  });

  it("fails when total coverage is below the floor", () => {
    expect(parseApiCoverage(FIXTURE, 90).passed).toBe(false);
  });
});
