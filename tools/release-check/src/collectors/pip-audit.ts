import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { CollectorResult, Finding } from "../types.ts";
import { API_DIR, API_VENV_BIN } from "../config.ts";

const execFileAsync = promisify(execFile);

interface PipAuditVuln {
  id: string;
  fix_versions: string[];
  aliases: string[];
  description: string;
}

interface PipAuditDependency {
  name: string;
  version: string;
  vulns: PipAuditVuln[];
}

interface PipAuditOutput {
  dependencies: PipAuditDependency[];
}

function toFindings(dependency: PipAuditDependency): Finding[] {
  return dependency.vulns.map((vuln) => ({
    ecosystem: "pip",
    package: dependency.name,
    installedVersion: dependency.version,
    severity: null,
    isDirectDependency: null,
    isDevOnly: null,
    advisoryIds: [vuln.id, ...vuln.aliases],
    fixedVersions: vuln.fix_versions,
    title: vuln.description,
    url: null,
  }));
}

export function parsePipAuditOutput(raw: string): Finding[] {
  const parsed = JSON.parse(raw) as PipAuditOutput;
  return parsed.dependencies.flatMap(toFindings);
}

export async function collectPipAudit(): Promise<CollectorResult<Finding[]>> {
  const pipAuditBin = path.join(API_VENV_BIN, "pip-audit");
  let stdout: string;

  try {
    // Same non-zero-on-findings behavior as pnpm audit.
    const result = await execFileAsync(pipAuditBin, ["--format", "json", "-r", "requirements.txt"], {
      cwd: API_DIR,
    });
    stdout = result.stdout;
  } catch (error) {
    const execError = error as { stdout?: string };
    if (typeof execError.stdout === "string" && execError.stdout.length > 0) {
      stdout = execError.stdout;
    } else {
      return { ok: false, error: `pip-audit failed to run: ${(error as Error).message}` };
    }
  }

  try {
    return { ok: true, data: parsePipAuditOutput(stdout) };
  } catch {
    return { ok: false, error: "pip-audit output was not valid JSON" };
  }
}
