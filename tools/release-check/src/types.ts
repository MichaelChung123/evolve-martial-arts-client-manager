export type Ecosystem = "npm" | "pip";

export interface Finding {
  ecosystem: Ecosystem;
  package: string;
  installedVersion: string;
  severity: string | null;
  isDirectDependency: boolean | null;
  isDevOnly: boolean | null;
  advisoryIds: string[];
  fixedVersions: string[];
  title: string;
  url: string | null;
}

export interface CoverageResult {
  app: "web" | "api";
  actualPercent: number;
  floorPercent: number;
  passed: boolean;
}

export type CollectorResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
