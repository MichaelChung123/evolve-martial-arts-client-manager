import { describe, expect, it } from "vitest";
import { parsePnpmAuditOutput } from "./workspace-audit.ts";

const FIXTURE = JSON.stringify({
  advisories: {
    "1124066": {
      findings: [
        { version: "0.34.5", paths: ["apps__web>next>sharp"], dev: false, optional: true, bundled: false },
      ],
      id: 1124066,
      title: "sharp inherited vulnerabilities in libvips",
      module_name: "sharp",
      vulnerable_versions: "<0.35.0",
      patched_versions: ">=0.35.0",
      severity: "high",
      github_advisory_id: "GHSA-f88m-g3jw-g9cj",
      url: "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
    },
    "9999999": {
      findings: [
        { version: "9.9.9", paths: ["apps__web>example-lint-plugin"], dev: true, optional: false, bundled: false },
      ],
      id: 9999999,
      title: "Example ReDoS in a lint dependency",
      module_name: "example-lint-plugin",
      vulnerable_versions: "<9.9.10",
      patched_versions: ">=9.9.10",
      severity: "moderate",
      github_advisory_id: "GHSA-xxxx-xxxx-xxxx",
      url: "https://github.com/advisories/GHSA-xxxx-xxxx-xxxx",
    },
  },
});

describe("parsePnpmAuditOutput", () => {
  it("marks a nested, non-dev finding as transitive and production", () => {
    const findings = parsePnpmAuditOutput(FIXTURE);
    const sharp = findings.find((f) => f.package === "sharp");

    expect(sharp).toMatchObject({
      ecosystem: "npm",
      installedVersion: "0.34.5",
      severity: "high",
      isDirectDependency: false,
      isDevOnly: false,
      advisoryIds: ["GHSA-f88m-g3jw-g9cj"],
      fixedVersions: [">=0.35.0"],
    });
  });

  it("marks a two-segment-path, all-dev finding as direct and dev-only", () => {
    const findings = parsePnpmAuditOutput(FIXTURE);
    const plugin = findings.find((f) => f.package === "example-lint-plugin");

    expect(plugin).toMatchObject({
      isDirectDependency: true,
      isDevOnly: true,
    });
  });

  it("returns an empty array when there are no advisories", () => {
    expect(parsePnpmAuditOutput(JSON.stringify({ advisories: {} }))).toEqual([]);
  });
});
