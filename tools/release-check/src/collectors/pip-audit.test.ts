import { describe, expect, it } from "vitest";
import { parsePipAuditOutput } from "./pip-audit.ts";

const FIXTURE = JSON.stringify({
  dependencies: [
    { name: "alembic", version: "1.18.5", vulns: [] },
    {
      name: "urllib3",
      version: "1.26.4",
      vulns: [
        {
          id: "PYSEC-2021-108",
          fix_versions: ["1.26.5"],
          aliases: ["GHSA-q2q7-5pp4-w6pg", "CVE-2021-33503"],
          description:
            "An issue was discovered in urllib3 before 1.26.5. When provided with a URL containing many @ characters in the authority component, the authority regular expression exhibits catastrophic backtracking.",
        },
      ],
    },
  ],
});

describe("parsePipAuditOutput", () => {
  it("skips dependencies with no vulnerabilities", () => {
    const findings = parsePipAuditOutput(FIXTURE);
    expect(findings.some((f) => f.package === "alembic")).toBe(false);
  });

  it("produces one finding per vulnerability, with no severity (pip-audit doesn't report one)", () => {
    const findings = parsePipAuditOutput(FIXTURE);

    expect(findings).toEqual([
      {
        ecosystem: "pip",
        package: "urllib3",
        installedVersion: "1.26.4",
        severity: null,
        isDirectDependency: null,
        isDevOnly: null,
        advisoryIds: ["PYSEC-2021-108", "GHSA-q2q7-5pp4-w6pg", "CVE-2021-33503"],
        fixedVersions: ["1.26.5"],
        title: "An issue was discovered in urllib3 before 1.26.5. When provided with a URL containing many @ characters in the authority component, the authority regular expression exhibits catastrophic backtracking.",
        url: null,
      },
    ]);
  });
});
