import { describe, expect, it } from "vitest";
import { parseWebCoverage } from "./web-coverage.ts";

const FIXTURE = JSON.stringify({
  total: {
    lines: { total: 100, covered: 82, skipped: 0, pct: 82 },
    statements: { total: 110, covered: 90, skipped: 0, pct: 81.81 },
    functions: { total: 20, covered: 17, skipped: 0, pct: 85 },
    branches: { total: 40, covered: 30, skipped: 0, pct: 75 },
  },
});

describe("parseWebCoverage", () => {
  it("passes when line coverage is at or above the floor", () => {
    expect(parseWebCoverage(FIXTURE, 80)).toEqual({
      app: "web",
      actualPercent: 82,
      floorPercent: 80,
      passed: true,
    });
  });

  it("fails when line coverage is below the floor", () => {
    expect(parseWebCoverage(FIXTURE, 90).passed).toBe(false);
  });
});
