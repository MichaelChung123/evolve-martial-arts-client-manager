import type { CoverageResult, Finding } from "../types.ts";

export interface ReleaseCheckInput {
  workspaceAudit: Finding[] | { error: string };
  pipAudit: Finding[] | { error: string };
  webCoverage: CoverageResult | { error: string };
  apiCoverage: CoverageResult | { error: string };
}

export function buildPrompt(input: ReleaseCheckInput): string {
  return [
    "You are reviewing a release-readiness check for a small web application.",
    "You are given raw dependency-audit and test-coverage data from two",
    "ecosystems: an npm/pnpm workspace (apps/web) and a Python project",
    "(apps/api). Group every dependency finding into exactly one of three",
    "buckets — 'fix before release', 'worth knowing', or 'noise' — and say",
    "why each finding belongs in its bucket. A finding in a direct,",
    "production dependency is more actionable than the same severity in a",
    "transitive, dev-only one. npm findings include a severity rating;",
    "pip findings do not — judge those from the vulnerability description",
    "text instead of inventing a severity level. Then summarize the two",
    "coverage results plainly: pass or fail against their floor, and by how",
    "much. If a section shows an `error` field instead of data, say plainly",
    "that section couldn't be collected this run rather than guessing at it.",
    "",
    "## npm/pnpm workspace dependency audit",
    JSON.stringify(input.workspaceAudit, null, 2),
    "",
    "## pip dependency audit (apps/api)",
    JSON.stringify(input.pipAudit, null, 2),
    "",
    "## apps/web test coverage",
    JSON.stringify(input.webCoverage, null, 2),
    "",
    "## apps/api test coverage",
    JSON.stringify(input.apiCoverage, null, 2),
  ].join("\n");
}
