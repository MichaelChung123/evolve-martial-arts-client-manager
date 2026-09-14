import { collectWorkspaceAudit } from "./collectors/workspace-audit.ts";
import { collectPipAudit } from "./collectors/pip-audit.ts";
import { collectWebCoverage } from "./collectors/web-coverage.ts";
import { collectApiCoverage } from "./collectors/api-coverage.ts";
import { generateReport } from "./report/call-claude.ts";
import { renderReport } from "./report/render.ts";
import { loadCoverageFloors } from "./config.ts";
import type { ReleaseCheckInput } from "./report/build-prompt.ts";
import type { CollectorResult } from "./types.ts";

function toSection<T>(result: CollectorResult<T>): T | { error: string } {
  return result.ok ? result.data : { error: result.error };
}

async function main(): Promise<void> {
  const floors = loadCoverageFloors();

  const [workspaceAudit, pipAudit, webCoverage, apiCoverage] = await Promise.all([
    collectWorkspaceAudit(),
    collectPipAudit(),
    collectWebCoverage(floors.web),
    collectApiCoverage(floors.api),
  ]);

  const input: ReleaseCheckInput = {
    workspaceAudit: toSection(workspaceAudit),
    pipAudit: toSection(pipAudit),
    webCoverage: toSection(webCoverage),
    apiCoverage: toSection(apiCoverage),
  };

  const report = await generateReport(input);
  await renderReport(report);
}

main().catch((error) => {
  console.error("release-check failed unexpectedly:", error);
  // Never gate a release, even on a bug in this tool itself.
  process.exit(0);
});
