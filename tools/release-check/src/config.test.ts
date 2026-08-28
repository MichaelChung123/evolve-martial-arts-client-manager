import { describe, expect, it } from "vitest";
import { loadCoverageFloors } from "./config.ts";

describe("loadCoverageFloors", () => {
  it("defaults both floors to the measured baselines when nothing is set", () => {
    expect(loadCoverageFloors({})).toEqual({ web: 90, api: 0 });
  });

  it("reads overrides from the given environment", () => {
    const floors = loadCoverageFloors({
      WEB_COVERAGE_FLOOR: "72",
      API_COVERAGE_FLOOR: "65",
    });

    expect(floors).toEqual({ web: 72, api: 65 });
  });
});
