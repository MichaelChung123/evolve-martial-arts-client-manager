# Release-Check Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Override for this repo:** `CLAUDE.md` disables subagent-driven-development by default ("Never dispatch agents for implementation on your own initiative") — use superpowers:executing-plans unless the user has explicitly said "subagent mode" for this task.

**Goal:** Build `tools/release-check`, a small tool that audits dependencies and checks test coverage across `apps/web` and `apps/api`, has Claude turn the raw findings into a prioritized report, and runs both by hand (`pnpm release:check`) and on a weekly GitHub Actions schedule.

**Architecture:** Four independent collectors (workspace npm/pnpm audit, pip audit, web coverage, api coverage) each split into a pure parse function (fixture-tested) and an impure run function (shells out, not unit tested). Their results feed one Claude API call that produces a prioritized markdown report; any failure in that call falls back to a raw, unprioritized dump of whatever data was collected. The whole run always exits 0.

**Tech Stack:** TypeScript running directly on Node's native type-stripping (no build step, no `tsx`), `@anthropic-ai/sdk`, Vitest. Python side: `pip-audit`, `pytest-cov`, both added to `apps/api/requirements.txt`.

**Spec:** `docs/superpowers/specs/2026-08-25-release-check-agent-design.md`

## Global Constraints

- Report-only, always. The script's `main()` never lets a non-zero exit code escape — not from a collector failing, not from the Claude call failing, not from an unexpected bug in the tool itself.
- Model is `claude-opus-5`, non-streaming, `max_tokens: 16000`. No other model without the user explicitly asking.
- The Anthropic client is constructed with zero-arg `new Anthropic()` (resolves `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` / an `ant` profile automatically) — never hand-checked or hard-required before use.
- One dependency audit per ecosystem, not per app: `pnpm audit --json` covers the whole pnpm workspace in a single lockfile (confirmed empirically — running it from `apps/web` and from the repo root produce identical `metadata` counts), so there is exactly one JS-side audit, plus one Python-side audit (`apps/api`). Do not add a second, redundant JS audit scoped to `apps/web` alone.
- Node's native TypeScript support requires relative imports to use the literal `.ts` extension (verified locally: `.js`-extension imports to a sibling `.ts` file fail with `ERR_MODULE_NOT_FOUND` under `node file.ts`, `.ts`-extension imports work). Every relative import in `tools/release-check/src` uses `.ts`, and `tsconfig.json` uses `"moduleResolution": "bundler"` (matches `apps/web`'s own tsconfig) so `tsc --noEmit` accepts that extension instead of demanding the NodeNext `.js` convention.
- No `tsx`, no build step. `tools/release-check/package.json` sets `"type": "module"` and the `start` script runs `node --env-file=.env src/index.ts` directly (Node 24, installed locally, runs `.ts` files natively with no flag — verified locally).
- Coverage floors are genuinely unknown until Tasks 4 and 5 measure them for real. Both default to `0` in code (a real, valid "no floor configured" value, not a placeholder) until each task's own step replaces that literal with the number its own coverage run actually prints.
- Every new package dependency is added via `pnpm add` / `pnpm add -D` / `pip install`, never hand-typed version pins — let the tool resolve and record the real current version.

---

### Task 1: Scaffold `tools/release-check` + coverage-floor config

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `tools/release-check/package.json`
- Create: `tools/release-check/tsconfig.json`
- Create: `tools/release-check/vitest.config.ts`
- Create: `tools/release-check/.env.example`
- Create: `tools/release-check/src/types.ts`
- Create: `tools/release-check/src/config.ts`
- Test: `tools/release-check/src/config.test.ts`

**Interfaces:**
- Produces: `Finding` (type), `CoverageResult` (type), `CollectorResult<T>` (type) from `src/types.ts`; `REPO_ROOT`, `WEB_DIR`, `API_DIR`, `API_VENV_BIN` (string constants) and `loadCoverageFloors(env?: NodeJS.ProcessEnv): { web: number; api: number }` from `src/config.ts`.

- [ ] **Step 1: Add `tools/*` to the pnpm workspace**

Modify `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "tools/*"

allowBuilds:
  sharp: true
  unrs-resolver: true
```

- [ ] **Step 2: Create the package manifest**

Create `tools/release-check/package.json`:

```json
{
  "name": "release-check",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node --env-file=.env src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 3: Install dependencies (lets pnpm pin real current versions)**

Run:
```bash
cd tools/release-check
pnpm add @anthropic-ai/sdk
pnpm add -D typescript vitest @types/node
cd ../..
```

- [ ] **Step 4: Create the TypeScript config**

Create `tools/release-check/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 5: Create the Vitest config**

Create `tools/release-check/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 6: Create the env example**

Create `tools/release-check/.env.example`:

```
ANTHROPIC_API_KEY=
# Optional overrides — leave blank to use the defaults in src/config.ts
WEB_COVERAGE_FLOOR=
API_COVERAGE_FLOOR=
```

- [ ] **Step 7: Write the shared types**

Create `tools/release-check/src/types.ts`:

```typescript
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
```

- [ ] **Step 8: Write the failing test for coverage-floor config**

Create `tools/release-check/src/config.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { loadCoverageFloors } from "./config.ts";

describe("loadCoverageFloors", () => {
  it("defaults both floors to 0 when nothing is set", () => {
    expect(loadCoverageFloors({})).toEqual({ web: 0, api: 0 });
  });

  it("reads overrides from the given environment", () => {
    const floors = loadCoverageFloors({
      WEB_COVERAGE_FLOOR: "72",
      API_COVERAGE_FLOOR: "65",
    });

    expect(floors).toEqual({ web: 72, api: 65 });
  });
});
```

- [ ] **Step 9: Run the test to verify it fails**

Run: `cd tools/release-check && pnpm test`
Expected: FAIL — `Cannot find module './config.ts'` (or similar; the file doesn't exist yet).

- [ ] **Step 10: Write `config.ts`**

Create `tools/release-check/src/config.ts`:

```typescript
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
const DEFAULT_WEB_COVERAGE_FLOOR = 0;
const DEFAULT_API_COVERAGE_FLOOR = 0;

export function loadCoverageFloors(
  env: Record<string, string | undefined> = process.env,
): CoverageFloors {
  return {
    web: Number(env.WEB_COVERAGE_FLOOR || DEFAULT_WEB_COVERAGE_FLOOR),
    api: Number(env.API_COVERAGE_FLOOR || DEFAULT_API_COVERAGE_FLOOR),
  };
}
```

- [ ] **Step 11: Run the test to verify it passes**

Run: `pnpm test` (from `tools/release-check`)
Expected: PASS, both tests green.

- [ ] **Step 12: Typecheck**

Run: `pnpm typecheck` (from `tools/release-check`)
Expected: no errors.

- [ ] **Step 13: Commit**

```bash
git add pnpm-workspace.yaml tools/release-check package.json pnpm-lock.yaml
git commit -m "chore: scaffold the release-check tool package"
```

(Run from the repo root; `pnpm add` in Step 3 updates the root `pnpm-lock.yaml`.)

---

### Task 2: Workspace (npm/pnpm) dependency-audit collector

**Files:**
- Create: `tools/release-check/src/collectors/workspace-audit.ts`
- Test: `tools/release-check/src/collectors/workspace-audit.test.ts`

**Interfaces:**
- Consumes: `Finding`, `CollectorResult` from `../types.ts`; `REPO_ROOT` from `../config.ts`.
- Produces: `parsePnpmAuditOutput(raw: string): Finding[]` and `collectWorkspaceAudit(): Promise<CollectorResult<Finding[]>>`.

- [ ] **Step 1: Write the failing test**

Create `tools/release-check/src/collectors/workspace-audit.test.ts`. The fixture below matches the real shape of `pnpm audit --json` (verified by running it against this repo's own lockfile) — one transitive production advisory and one direct dev-only advisory, to exercise both branches:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test` (from `tools/release-check`)
Expected: FAIL — `Cannot find module './workspace-audit.ts'`.

- [ ] **Step 3: Write the implementation**

Create `tools/release-check/src/collectors/workspace-audit.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test` (from `tools/release-check`)
Expected: PASS, all three tests green.

- [ ] **Step 5: Manually verify the real collector against this repo**

Run (from `tools/release-check`):
```bash
node -e '
import("./src/collectors/workspace-audit.ts").then(async (m) => {
  const result = await m.collectWorkspaceAudit();
  console.log(JSON.stringify(result, null, 2).slice(0, 500));
});
'
```
Expected: `ok: true` and a `data` array — this repo currently has real advisories (`pnpm audit --json` showed 20 as of this plan's writing), so the array should be non-empty.

- [ ] **Step 6: Commit**

```bash
git add tools/release-check/src/collectors/workspace-audit.ts tools/release-check/src/collectors/workspace-audit.test.ts
git commit -m "feat: add the workspace npm/pnpm dependency-audit collector"
```

---

### Task 3: pip-audit collector

**Files:**
- Modify: `apps/api/requirements.txt`
- Create: `tools/release-check/src/collectors/pip-audit.ts`
- Test: `tools/release-check/src/collectors/pip-audit.test.ts`

**Interfaces:**
- Consumes: `Finding`, `CollectorResult` from `../types.ts`; `API_DIR`, `API_VENV_BIN` from `../config.ts`.
- Produces: `parsePipAuditOutput(raw: string): Finding[]` and `collectPipAudit(): Promise<CollectorResult<Finding[]>>`.

- [ ] **Step 1: Install pip-audit and record it**

Run:
```bash
cd apps/api
.venv/bin/pip install pip-audit
.venv/bin/pip freeze > requirements.txt
cd ../..
```

- [ ] **Step 2: Write the failing test**

Create `tools/release-check/src/collectors/pip-audit.test.ts`. The fixture is real captured output from running `pip-audit --format json -r requirements.txt` against a deliberately old `urllib3==1.26.4` pin (trimmed to one vulnerability, description truncated):

```typescript
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test` (from `tools/release-check`)
Expected: FAIL — `Cannot find module './pip-audit.ts'`.

- [ ] **Step 4: Write the implementation**

Create `tools/release-check/src/collectors/pip-audit.ts`:

```typescript
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test` (from `tools/release-check`)
Expected: PASS, both tests green.

- [ ] **Step 6: Manually verify against this repo's real requirements.txt**

Run:
```bash
cd apps/api && .venv/bin/pip-audit --format json -r requirements.txt
```
Expected: exits 0 with `"No known vulnerabilities found"` on stderr (confirmed clean as of this plan's writing) — confirms the binary and flags are correct end to end.

- [ ] **Step 7: Commit**

```bash
git add apps/api/requirements.txt tools/release-check/src/collectors/pip-audit.ts tools/release-check/src/collectors/pip-audit.test.ts
git commit -m "feat: add the pip-audit collector"
```

---

### Task 4: apps/web coverage wiring + collector

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vitest.config.mts`
- Modify: `tools/release-check/src/config.ts` (replace the web floor literal)
- Create: `tools/release-check/src/collectors/web-coverage.ts`
- Test: `tools/release-check/src/collectors/web-coverage.test.ts`

**Interfaces:**
- Consumes: `CollectorResult`, `CoverageResult` from `../types.ts`; `WEB_DIR` from `../config.ts`.
- Produces: `parseWebCoverage(raw: string, floorPercent: number): CoverageResult` and `collectWebCoverage(floorPercent: number): Promise<CollectorResult<CoverageResult>>`.

- [ ] **Step 1: Add the coverage dependency and script**

Run:
```bash
cd apps/web
pnpm add -D @vitest/coverage-v8
cd ../..
```

Modify `apps/web/package.json` — add a `coverage` script next to `test`:

```json
    "test": "vitest run",
    "coverage": "vitest run --coverage",
```

- [ ] **Step 2: Add the coverage reporter to the Vitest config**

Modify `apps/web/vitest.config.mts`:

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Write the failing test for the parser**

Create `tools/release-check/src/collectors/web-coverage.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { parseWebCoverage } from "./web-coverage.ts";

const FIXTURE = JSON.stringify({
  total: {
    lines: { total: 100, covered: 82, skipped: 0, pct: 82 },
    statements: { total: 110, covered: 90, skipped: 0, pct: 81.81 },
    functions: { total: 20, covered: 17, skipped: 0, pct: 85 },
    branches: { total: 40, covered: 30, skipped: 0, pct: 75 },
  },
});

describe("parseWebCoverage", () => {
  it("passes when line coverage is at or above the floor", () => {
    expect(parseWebCoverage(FIXTURE, 80)).toEqual({
      app: "web",
      actualPercent: 82,
      floorPercent: 80,
      passed: true,
    });
  });

  it("fails when line coverage is below the floor", () => {
    expect(parseWebCoverage(FIXTURE, 90).passed).toBe(false);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test` (from `tools/release-check`)
Expected: FAIL — `Cannot find module './web-coverage.ts'`.

- [ ] **Step 5: Write the implementation**

Create `tools/release-check/src/collectors/web-coverage.ts`:

```typescript
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test` (from `tools/release-check`)
Expected: PASS, both tests green.

- [ ] **Step 7: Measure the real baseline and set the floor**

Run:
```bash
cd apps/web && pnpm run coverage
```
Read the `Lines` percentage from the printed coverage table (or `coverage/coverage-summary.json`'s `total.lines.pct`). Round down to the nearest integer.

Modify `tools/release-check/src/config.ts` — replace:
```typescript
const DEFAULT_WEB_COVERAGE_FLOOR = 0;
```
with the measured integer, e.g. (illustrative only — use the real number this step just printed):
```typescript
const DEFAULT_WEB_COVERAGE_FLOOR = 82;
```

- [ ] **Step 8: Re-run the config test with the new default**

Run: `pnpm test` (from `tools/release-check`)
Expected: still PASS — `config.test.ts`'s first case asserts `{}` yields `{ web: 0, api: 0 }`. If it now fails, that test's expectation needs updating to match the new real defaults (`{ web: <measured>, api: 0 }`) — update the assertion, not the default.

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/vitest.config.mts tools/release-check/src/collectors/web-coverage.ts tools/release-check/src/collectors/web-coverage.test.ts tools/release-check/src/config.ts tools/release-check/src/config.test.ts
git commit -m "feat: wire up web coverage reporting and add the coverage collector"
```

(`pnpm-lock.yaml` lives at the repo root, not inside `apps/web` — adjust the `git add` path if `pnpm add` reports it there instead.)

---

### Task 5: apps/api coverage wiring + collector

**Files:**
- Modify: `apps/api/requirements.txt`
- Modify: `.gitignore`
- Modify: `tools/release-check/src/config.ts` (replace the api floor literal)
- Create: `tools/release-check/src/collectors/api-coverage.ts`
- Test: `tools/release-check/src/collectors/api-coverage.test.ts`

**Interfaces:**
- Consumes: `CollectorResult`, `CoverageResult` from `../types.ts`; `API_DIR`, `API_VENV_BIN` from `../config.ts`.
- Produces: `parseApiCoverage(raw: string, floorPercent: number): CoverageResult` and `collectApiCoverage(floorPercent: number): Promise<CollectorResult<CoverageResult>>`.

**Prerequisite:** these steps' live runs need Postgres up (`pnpm db:up` from the repo root) and the `evolve_test` database created once (`docker compose exec postgres createdb -U evolve evolve_test`) — the same prerequisite every other `apps/api` test task in this repo has.

- [ ] **Step 1: Install pytest-cov and record it**

Run:
```bash
cd apps/api
.venv/bin/pip install pytest-cov
.venv/bin/pip freeze > requirements.txt
cd ../..
```

- [ ] **Step 2: Ignore the generated coverage report**

Modify `.gitignore` — add a line near the existing `.coverage` entry:

```
.coverage
coverage.json
htmlcov/
```

- [ ] **Step 3: Write the failing test for the parser**

Create `tools/release-check/src/collectors/api-coverage.test.ts`. The fixture matches `coverage.py`'s stable JSON report schema (the format `pytest-cov --cov-report=json` writes):

```typescript
import { describe, expect, it } from "vitest";
import { parseApiCoverage } from "./api-coverage.ts";

const FIXTURE = JSON.stringify({
  meta: { version: "7.1.0", timestamp: "2026-08-25T00:00:00", branch_coverage: false, show_contexts: false },
  files: {},
  totals: {
    covered_lines: 240,
    num_statements: 300,
    percent_covered: 80.0,
    percent_covered_display: "80",
    missing_lines: 60,
    excluded_lines: 0,
  },
});

describe("parseApiCoverage", () => {
  it("passes when total coverage is at or above the floor", () => {
    expect(parseApiCoverage(FIXTURE, 75)).toEqual({
      app: "api",
      actualPercent: 80,
      floorPercent: 75,
      passed: true,
    });
  });

  it("fails when total coverage is below the floor", () => {
    expect(parseApiCoverage(FIXTURE, 90).passed).toBe(false);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test` (from `tools/release-check`)
Expected: FAIL — `Cannot find module './api-coverage.ts'`.

- [ ] **Step 5: Write the implementation**

Create `tools/release-check/src/collectors/api-coverage.ts`:

```typescript
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test` (from `tools/release-check`)
Expected: PASS, both tests green.

- [ ] **Step 7: Measure the real baseline and set the floor**

With Postgres up (see Prerequisite above), run:
```bash
cd apps/api && .venv/bin/pytest --cov=app --cov-report=json:coverage.json
```
Read `totals.percent_covered` from the generated `apps/api/coverage.json`. Round down to the nearest integer.

Modify `tools/release-check/src/config.ts` — replace:
```typescript
const DEFAULT_API_COVERAGE_FLOOR = 0;
```
with the measured integer (illustrative only — use the real number this step just printed):
```typescript
const DEFAULT_API_COVERAGE_FLOOR = 65;
```

- [ ] **Step 8: Re-run the config test with both new defaults**

Run: `pnpm test` (from `tools/release-check`)
Expected: PASS — update `config.test.ts`'s first case to `{ web: <Task 4's number>, api: <this task's number> }` if it doesn't already reflect both.

- [ ] **Step 9: Commit**

```bash
git add apps/api/requirements.txt .gitignore tools/release-check/src/collectors/api-coverage.ts tools/release-check/src/collectors/api-coverage.test.ts tools/release-check/src/config.ts tools/release-check/src/config.test.ts
git commit -m "feat: wire up api coverage reporting and add the coverage collector"
```

---

### Task 6: Prompt builder

**Files:**
- Create: `tools/release-check/src/report/build-prompt.ts`
- Test: `tools/release-check/src/report/build-prompt.test.ts`

**Interfaces:**
- Consumes: `Finding`, `CoverageResult` from `../types.ts`.
- Produces: `ReleaseCheckInput` (type) and `buildPrompt(input: ReleaseCheckInput): string`.

- [ ] **Step 1: Write the failing test**

Create `tools/release-check/src/report/build-prompt.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildPrompt, type ReleaseCheckInput } from "./build-prompt.ts";

const INPUT: ReleaseCheckInput = {
  workspaceAudit: [
    {
      ecosystem: "npm",
      package: "sharp",
      installedVersion: "0.34.5",
      severity: "high",
      isDirectDependency: false,
      isDevOnly: false,
      advisoryIds: ["GHSA-f88m-g3jw-g9cj"],
      fixedVersions: [">=0.35.0"],
      title: "sharp inherited vulnerabilities in libvips",
      url: "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
    },
  ],
  pipAudit: { error: "pip-audit failed to run: ENOENT" },
  webCoverage: { app: "web", actualPercent: 82, floorPercent: 80, passed: true },
  apiCoverage: { app: "api", actualPercent: 60, floorPercent: 65, passed: false },
};

describe("buildPrompt", () => {
  it("includes instructions on bucketing and the severity asymmetry between ecosystems", () => {
    const prompt = buildPrompt(INPUT);

    expect(prompt).toContain("fix before release");
    expect(prompt).toContain("worth knowing");
    expect(prompt).toContain("noise");
    expect(prompt).toContain("pip findings do not");
  });

  it("embeds all four sections' data as JSON", () => {
    const prompt = buildPrompt(INPUT);

    expect(prompt).toContain('"package": "sharp"');
    expect(prompt).toContain('"error": "pip-audit failed to run: ENOENT"');
    expect(prompt).toContain('"actualPercent": 82');
    expect(prompt).toContain('"passed": false');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test` (from `tools/release-check`)
Expected: FAIL — `Cannot find module './build-prompt.ts'`.

- [ ] **Step 3: Write the implementation**

Create `tools/release-check/src/report/build-prompt.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test` (from `tools/release-check`)
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add tools/release-check/src/report/build-prompt.ts tools/release-check/src/report/build-prompt.test.ts
git commit -m "feat: add the release-check prompt builder"
```

---

### Task 7: Claude API call + raw-dump fallback

**Files:**
- Create: `tools/release-check/src/report/call-claude.ts`
- Test: `tools/release-check/src/report/call-claude.test.ts`

**Interfaces:**
- Consumes: `buildPrompt`, `ReleaseCheckInput` from `./build-prompt.ts`.
- Produces: `ClaudeReportResult` (type: `{ narrative: boolean; markdown: string }`), `MessagesClient` (type), `generateReport(input: ReleaseCheckInput, client?: MessagesClient): Promise<ClaudeReportResult>`.

- [ ] **Step 1: Write the failing test**

Create `tools/release-check/src/report/call-claude.test.ts`. The mock client only needs the `messages.create` shape `generateReport` actually calls — real `Anthropic.RateLimitError`/`AuthenticationError` instances aren't constructed here since their real constructors aren't part of this tool's own code; the fallback path is exercised with a plain `Error`, which every typed SDK error also `instanceof Error`-satisfies at the point this function's own `catch` runs:

```typescript
import { describe, expect, it, vi } from "vitest";
import { generateReport, type MessagesClient } from "./call-claude.ts";
import type { ReleaseCheckInput } from "./build-prompt.ts";

const INPUT: ReleaseCheckInput = {
  workspaceAudit: [],
  pipAudit: [],
  webCoverage: { app: "web", actualPercent: 90, floorPercent: 60, passed: true },
  apiCoverage: { app: "api", actualPercent: 85, floorPercent: 60, passed: true },
};

describe("generateReport", () => {
  it("returns the narrative report on success", async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "## fix before release\nnone" }],
        }),
      },
    } as unknown as MessagesClient;

    const result = await generateReport(INPUT, client);

    expect(result.narrative).toBe(true);
    expect(result.markdown).toContain("fix before release");
  });

  it("falls back to a raw dump when the API call fails", async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("simulated failure")),
      },
    } as unknown as MessagesClient;

    const result = await generateReport(INPUT, client);

    expect(result.narrative).toBe(false);
    expect(result.markdown).toContain("simulated failure");
    expect(result.markdown).toContain('"app": "web"');
  });

  it("falls back when the response has no text block", async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    } as unknown as MessagesClient;

    const result = await generateReport(INPUT, client);

    expect(result.narrative).toBe(false);
    expect(result.markdown).toContain("no text block");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test` (from `tools/release-check`)
Expected: FAIL — `Cannot find module './call-claude.ts'`.

- [ ] **Step 3: Write the implementation**

Create `tools/release-check/src/report/call-claude.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, type ReleaseCheckInput } from "./build-prompt.ts";

export interface ClaudeReportResult {
  narrative: boolean;
  markdown: string;
}

export type MessagesClient = Pick<Anthropic, "messages">;

export async function generateReport(
  input: ReleaseCheckInput,
  client: MessagesClient = new Anthropic(),
): Promise<ClaudeReportResult> {
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      messages: [{ role: "user", content: buildPrompt(input) }],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    if (!textBlock) {
      throw new Error("Claude response contained no text block");
    }

    return { narrative: true, markdown: textBlock.text };
  } catch (error) {
    return { narrative: false, markdown: renderRawDump(input, error) };
  }
}

function describeError(error: unknown): string {
  // Only the distinction that changes what a reader would do about it —
  // network-level vs. an API-level response — is worth naming here. Finer
  // SDK subtypes (rate limit, auth, ...) all hit this same fallback below.
  if (error instanceof Anthropic.APIConnectionError) {
    return `network error: ${error.message}`;
  }
  if (error instanceof Anthropic.APIError) {
    return `API error ${error.status ?? "unknown"}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

function renderRawDump(input: ReleaseCheckInput, error: unknown): string {
  const reason = describeError(error);

  return [
    "# Release Check — Raw Findings",
    "",
    `The Claude summarization step failed (${reason}), so this report shows`,
    "the unprioritized raw data instead.",
    "",
    "## npm/pnpm workspace dependency audit",
    "```json",
    JSON.stringify(input.workspaceAudit, null, 2),
    "```",
    "",
    "## pip dependency audit (apps/api)",
    "```json",
    JSON.stringify(input.pipAudit, null, 2),
    "```",
    "",
    "## apps/web test coverage",
    "```json",
    JSON.stringify(input.webCoverage, null, 2),
    "```",
    "",
    "## apps/api test coverage",
    "```json",
    JSON.stringify(input.apiCoverage, null, 2),
    "```",
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test` (from `tools/release-check`)
Expected: PASS, all three tests green.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck` (from `tools/release-check`)
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add tools/release-check/src/report/call-claude.ts tools/release-check/src/report/call-claude.test.ts
git commit -m "feat: add the Claude summarization call with a raw-dump fallback"
```

---

### Task 8: Report rendering

**Files:**
- Create: `tools/release-check/src/report/render.ts`
- Test: `tools/release-check/src/report/render.test.ts`

**Interfaces:**
- Consumes: `ClaudeReportResult` from `./call-claude.ts`; `REPO_ROOT` from `../config.ts`.
- Produces: `renderReport(result: ClaudeReportResult, outputDir?: string): Promise<string>` (returns the written file path).

- [ ] **Step 1: Write the failing test**

Create `tools/release-check/src/report/render.test.ts`:

```typescript
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderReport } from "./render.ts";

describe("renderReport", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "release-check-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes the markdown to a timestamped file in the given directory", async () => {
    const filePath = await renderReport({ narrative: true, markdown: "# Hello" }, dir);

    expect(filePath.startsWith(dir)).toBe(true);
    expect(filePath.endsWith(".md")).toBe(true);
    await expect(readFile(filePath, "utf-8")).resolves.toBe("# Hello");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test` (from `tools/release-check`)
Expected: FAIL — `Cannot find module './render.ts'`.

- [ ] **Step 3: Write the implementation**

Create `tools/release-check/src/report/render.ts`:

```typescript
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ClaudeReportResult } from "./call-claude.ts";
import { REPO_ROOT } from "../config.ts";

const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, "tools", "release-check", "output");

export async function renderReport(
  result: ClaudeReportResult,
  outputDir: string = DEFAULT_OUTPUT_DIR,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(outputDir, `report-${timestamp}.md`);

  await writeFile(filePath, result.markdown, "utf-8");
  console.log(result.markdown);
  console.log(`\nReport written to ${filePath}`);

  return filePath;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test` (from `tools/release-check`)
Expected: PASS.

- [ ] **Step 5: Ignore the local output directory**

Modify `.gitignore` — add under the "Build output and tool caches" section:

```
tools/release-check/output/
```

- [ ] **Step 6: Commit**

```bash
git add tools/release-check/src/report/render.ts tools/release-check/src/report/render.test.ts .gitignore
git commit -m "feat: add release-check report rendering"
```

---

### Task 9: Orchestrator, root script, and a real end-to-end run

**Files:**
- Create: `tools/release-check/src/index.ts`
- Modify: `package.json` (repo root)

**Interfaces:**
- Consumes: `collectWorkspaceAudit` (Task 2), `collectPipAudit` (Task 3), `collectWebCoverage`, `collectApiCoverage` (Tasks 4–5), `loadCoverageFloors` (Task 1), `generateReport` (Task 7), `renderReport` (Task 8), `ReleaseCheckInput` (Task 6), `CollectorResult` (Task 1).
- Produces: the `pnpm release:check` command.

No new automated test — this task wires together already-tested pieces and its correctness is verified by actually running it, matching the spec's explicit call-out that a live Claude call stays a manual smoke run rather than part of the automated suite.

- [ ] **Step 1: Write the orchestrator**

Create `tools/release-check/src/index.ts`:

```typescript
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
```

- [ ] **Step 2: Add the root script**

Modify `package.json` (repo root) — add next to the existing `db:*` scripts:

```json
    "db:migrate": "cd apps/api && .venv/bin/alembic upgrade head",
    "release:check": "pnpm --dir tools/release-check start"
```

- [ ] **Step 3: Create the local `.env` from the example**

Run:
```bash
cp tools/release-check/.env.example tools/release-check/.env
```
Fill in a real `ANTHROPIC_API_KEY` in `tools/release-check/.env` (or ensure `ant auth login` / a shell-exported `ANTHROPIC_API_KEY` is already active — either credential source works, since `generateReport` defaults to `new Anthropic()`).

- [ ] **Step 4: Run it for real, end to end**

Ensure Postgres is up (`pnpm db:up`), then from the repo root:
```bash
pnpm release:check
```
Expected: the script prints a markdown report to the terminal (either the narrative version or, if something's misconfigured, the raw-dump fallback with a clear reason), writes it to `tools/release-check/output/report-<timestamp>.md`, and the process exits 0. Read the report and confirm it reads sensibly against what Tasks 2 and 3's manual checks found.

- [ ] **Step 5: Commit**

```bash
git add tools/release-check/src/index.ts package.json
git commit -m "feat: wire up the release-check orchestrator and pnpm release:check"
```

(`tools/release-check/.env` itself is never committed — it's covered by the root `.gitignore`'s existing `.env` / `!.env.example` rules.)

---

### Task 10: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/release-check.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/release-check.yml`:

```yaml
name: Release Check

on:
  workflow_dispatch: {}
  schedule:
    - cron: "0 13 * * 1"

jobs:
  release-check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_DB: evolve_test
          POSTGRES_USER: evolve
          POSTGRES_PASSWORD: evolve
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U evolve -d evolve_test"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      TEST_DATABASE_URL: postgresql+psycopg://evolve:evolve@localhost:5432/evolve_test
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 11.13.0

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Set up the api virtualenv
        working-directory: apps/api
        run: |
          python -m venv .venv
          .venv/bin/pip install --upgrade pip
          .venv/bin/pip install -r requirements.txt

      - run: pnpm release:check

      - name: Publish report to job summary
        if: always()
        run: cat tools/release-check/output/report-*.md >> "$GITHUB_STEP_SUMMARY" || true
```

- [ ] **Step 2: Validate the YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release-check.yml'))"`
Expected: no output (valid YAML, no exception).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release-check.yml
git commit -m "ci: add the weekly release-check workflow"
```

- [ ] **Step 4: Manual step — cannot be done by an agent**

In the GitHub repo's Settings → Secrets and variables → Actions, add a repository secret named `ANTHROPIC_API_KEY`. Without this, `workflow_dispatch` and the scheduled run will hit the Claude API call, fail, and fall back to the raw-dump report — informative, not broken, but worth doing so the real report gets generated. After adding the secret, trigger the workflow once manually (Actions tab → Release Check → Run workflow) to confirm it goes green end to end.

---

## Self-Review Notes

- **Spec coverage:** every section of the spec maps to a task — architecture/components → Tasks 1–9; data flow → Task 9; config & secrets → Tasks 1, 9; error handling table → Tasks 2/3 (audit non-zero-exit handling), 4/5 (coverage failure handling), 7 (Claude fallback); testing strategy → the fixture-based tests in Tasks 2–8 plus the explicitly-manual smoke runs in Tasks 2, 3, 9; GitHub Actions → Task 10; coverage floors as a provisional baseline → Tasks 1, 4, 5.
- **Placeholder scan:** the two `DEFAULT_*_COVERAGE_FLOOR = 0` values are real, valid starting values (not markers), and the steps that replace them name the exact file, exact line, and exact command whose output supplies the real number — this is inherent to measuring live state, the same category as a TDD step whose test-failure message can only be confirmed by running it.
- **Type consistency:** `Finding`, `CoverageResult`, and `CollectorResult<T>` (Task 1) are used with identical shapes across Tasks 2–9; `ReleaseCheckInput` (Task 6) is consumed as written in Tasks 7 and 9; `ClaudeReportResult` (Task 7) is consumed as written in Tasks 8 and 9; `MessagesClient` (Task 7) is used only within Task 7's own test.
