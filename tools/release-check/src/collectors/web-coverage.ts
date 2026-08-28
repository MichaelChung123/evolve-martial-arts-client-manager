import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { CollectorResult, CoverageResult } from "../types.ts";
import { WEB_DIR } from "../config.ts";

const execFileAsync = promisify(execFile);
const SUMMARY_PATH = path.join(WEB_DIR, "coverage", "coverage-summary.json");

interface VitestCoverageSummary {
  total: { lines: { pct: number } };
}

export function parseWebCoverage(raw: string, floorPercent: number): CoverageResult {
  const parsed = JSON.parse(raw) as VitestCoverageSummary;
  // Line coverage is the single number this tool reports — the most
  // commonly cited overall figure, and what the floor is set against.
  const actualPercent = parsed.total.lines.pct;

  return {
    app: "web",
    actualPercent,
    floorPercent,
    passed: actualPercent >= floorPercent,
  };
}

export async function collectWebCoverage(floorPercent: number): Promise<CollectorResult<CoverageResult>> {
  try {
    await execFileAsync("pnpm", ["run", "coverage"], { cwd: WEB_DIR });
  } catch (error) {
    return { ok: false, error: `vitest coverage run failed: ${(error as Error).message}` };
  }

  let raw: string;
  try {
    raw = await readFile(SUMMARY_PATH, "utf-8");
  } catch (error) {
    return { ok: false, error: `could not read ${SUMMARY_PATH}: ${(error as Error).message}` };
  }

  try {
    return { ok: true, data: parseWebCoverage(raw, floorPercent) };
  } catch {
    return { ok: false, error: "coverage-summary.json was not valid JSON" };
  }
}
