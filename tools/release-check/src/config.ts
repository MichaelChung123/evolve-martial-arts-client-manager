import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(here, "..", "..", "..");
export const WEB_DIR = path.join(REPO_ROOT, "apps", "web");
export const API_DIR = path.join(REPO_ROOT, "apps", "api");
export const API_VENV_BIN = path.join(API_DIR, ".venv", "bin");

export interface CoverageFloors {
  web: number;
  api: number;
}

// Provisional until Tasks 4 and 5 each measure a real baseline and replace
// their own literal below — see the Global Constraints note on floors.
// Web measured for real: 90.26% lines, rounded down. API stays at 0 — this
// environment has no Docker/Postgres, so apps/api's coverage was never
// measured live here; 0 is a real, honest "unmeasured" value, not a stand-in.
const DEFAULT_WEB_COVERAGE_FLOOR = 90;
const DEFAULT_API_COVERAGE_FLOOR = 0;

export function loadCoverageFloors(
  env: Record<string, string | undefined> = process.env,
): CoverageFloors {
  return {
    web: Number(env.WEB_COVERAGE_FLOOR || DEFAULT_WEB_COVERAGE_FLOOR),
    api: Number(env.API_COVERAGE_FLOOR || DEFAULT_API_COVERAGE_FLOOR),
  };
}
