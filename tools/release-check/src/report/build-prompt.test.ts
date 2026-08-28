import { describe, expect, it } from "vitest";
import { buildPrompt, type ReleaseCheckInput } from "./build-prompt.ts";

const INPUT: ReleaseCheckInput = {
  workspaceAudit: [
    {
      ecosystem: "npm",
      package: "sharp",
      installedVersion: "0.34.5",
      severity: "high",
      isDirectDependency: false,
      isDevOnly: false,
      advisoryIds: ["GHSA-f88m-g3jw-g9cj"],
      fixedVersions: [">=0.35.0"],
      title: "sharp inherited vulnerabilities in libvips",
      url: "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
    },
  ],
  pipAudit: { error: "pip-audit failed to run: ENOENT" },
  webCoverage: { app: "web", actualPercent: 82, floorPercent: 80, passed: true },
  apiCoverage: { app: "api", actualPercent: 60, floorPercent: 65, passed: false },
};

describe("buildPrompt", () => {
  it("includes instructions on bucketing and the severity asymmetry between ecosystems", () => {
    const prompt = buildPrompt(INPUT);

    expect(prompt).toContain("fix before release");
    expect(prompt).toContain("worth knowing");
    expect(prompt).toContain("noise");
    expect(prompt).toContain("pip findings do not");
  });

  it("embeds all four sections' data as JSON", () => {
    const prompt = buildPrompt(INPUT);

    expect(prompt).toContain('"package": "sharp"');
    expect(prompt).toContain('"error": "pip-audit failed to run: ENOENT"');
    expect(prompt).toContain('"actualPercent": 82');
    expect(prompt).toContain('"passed": false');
  });
});
