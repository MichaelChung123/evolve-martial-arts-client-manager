import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { CollectorResult, CoverageResult } from "../types.ts";
import { API_DIR, API_VENV_BIN } from "../config.ts";

const execFileAsync = promisify(execFile);
const COVERAGE_JSON_PATH = path.join(API_DIR, "coverage.json");

interface PytestCoverageReport {
  totals: { percent_covered: number };
}

export function parseApiCoverage(raw: string, floorPercent: number): CoverageResult {
  const parsed = JSON.parse(raw) as PytestCoverageReport;
  const actualPercent = parsed.totals.percent_covered;

  return {
    app: "api",
    actualPercent,
    floorPercent,
    passed: actualPercent >= floorPercent,
  };
}

export async function collectApiCoverage(floorPercent: number): Promise<CollectorResult<CoverageResult>> {
  const pytestBin = path.join(API_VENV_BIN, "pytest");

  try {
    // Unlike the audit collectors, a non-zero exit here means tests
    // actually failed — that's a real error, not expected output.
    await execFileAsync(pytestBin, ["--cov=app", "--cov-report=json:coverage.json"], { cwd: API_DIR });
  } catch (error) {
    return { ok: false, error: `pytest coverage run failed: ${(error as Error).message}` };
  }

  let raw: string;
  try {
    raw = await readFile(COVERAGE_JSON_PATH, "utf-8");
  } catch (error) {
    return { ok: false, error: `could not read ${COVERAGE_JSON_PATH}: ${(error as Error).message}` };
  }

  try {
    return { ok: true, data: parseApiCoverage(raw, floorPercent) };
  } catch {
    return { ok: false, error: "coverage.json was not valid JSON" };
  }
}
