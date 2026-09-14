import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CollectorResult, Finding } from "../types.ts";
import { REPO_ROOT } from "../config.ts";

const execFileAsync = promisify(execFile);

interface PnpmAuditFinding {
  version: string;
  paths: string[];
  dev: boolean;
}

interface PnpmAuditAdvisory {
  findings: PnpmAuditFinding[];
  title: string;
  module_name: string;
  patched_versions: string;
  severity: string;
  github_advisory_id: string;
  url: string;
}

interface PnpmAuditOutput {
  advisories: Record<string, PnpmAuditAdvisory>;
}

function toFinding(advisory: PnpmAuditAdvisory): Finding {
  // A finding's path is "<workspace>>direct-dep" (2 segments) when the
  // vulnerable package is a direct dependency, or ">direct>...>vulnerable"
  // (3+ segments) when it's pulled in transitively.
  const isDirectDependency = advisory.findings.some((f) => f.paths.some((p) => p.split(">").length === 2));
  const isDevOnly = advisory.findings.every((f) => f.dev);
  const installedVersion = advisory.findings[0]?.version ?? "unknown";

  return {
    ecosystem: "npm",
    package: advisory.module_name,
    installedVersion,
    severity: advisory.severity,
    isDirectDependency,
    isDevOnly,
    advisoryIds: [advisory.github_advisory_id],
    fixedVersions: advisory.patched_versions ? [advisory.patched_versions] : [],
    title: advisory.title,
    url: advisory.url,
  };
}

export function parsePnpmAuditOutput(raw: string): Finding[] {
  const parsed = JSON.parse(raw) as PnpmAuditOutput;
  return Object.values(parsed.advisories ?? {}).map(toFinding);
}

export async function collectWorkspaceAudit(): Promise<CollectorResult<Finding[]>> {
  let stdout: string;

  try {
    // pnpm audit exits non-zero when it FINDS vulnerabilities — that's
    // normal output, not a failure, so stdout is read either way.
    const result = await execFileAsync("pnpm", ["audit", "--json"], { cwd: REPO_ROOT });
    stdout = result.stdout;
  } catch (error) {
    const execError = error as { stdout?: string };
    if (typeof execError.stdout === "string" && execError.stdout.length > 0) {
      stdout = execError.stdout;
    } else {
      return { ok: false, error: `pnpm audit failed to run: ${(error as Error).message}` };
    }
  }

  try {
    return { ok: true, data: parsePnpmAuditOutput(stdout) };
  } catch {
    return { ok: false, error: "pnpm audit output was not valid JSON" };
  }
}
