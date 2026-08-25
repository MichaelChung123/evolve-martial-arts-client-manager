# Release-Check Agent — Design

**Date:** 2026-08-25
**Status:** Approved
**Reference:** `~/dev/projects/experience/master_resume.md` (bullet F8) and
`~/dev/projects/experience/general-interview-drills-2026-08.md` (Drill 3) — a
sibling repo, not part of this codebase, that describes an "internal AI agent
that runs daily dependency audits and verifies test coverage before releases"
as a completed accomplishment. That claim predates this design and nothing
matching it exists anywhere yet. This spec makes it real.

## Context

Neither `apps/web` nor `apps/api` has dependency-audit tooling or a wired-up
coverage check today. There is no CI in this repo at all — `.github/` holds
only a pull-request template. This design adds a small tool that runs both
dependency audits and both apps' test coverage, has Claude turn the raw
findings into a prioritized report, and runs it on a schedule via GitHub
Actions as well as by hand before a release.

This is a meta/tooling feature, not a taekwondo-app feature — it doesn't
touch anything in `CLAUDE.md`'s Learning Objectives (React/Next.js/Python),
so unlike other specs in this repo it carries no `TODO(you):` markers; the
assistant writes it directly, per explicit direction.

## Scope

**In scope:** a standalone tool that audits dependencies (`apps/web` +
`apps/api`) and checks test coverage against a fixed floor (`apps/web` +
`apps/api`), summarizes the results with Claude into a prioritized markdown
report, runs via a pnpm script and via a weekly + manual GitHub Actions
workflow. Wiring up coverage tooling in both apps, since neither has it.

**Out of scope:** failing/blocking a release (report-only — no exit-code
gating, ever, including on hard findings); coverage regression tracking
against a stored baseline (fixed threshold only); posting reports as PR
comments; auditing anything beyond `apps/web` and `apps/api` (e.g. root
`devDependencies` like `turbo`).

## Architecture

```
pnpm-workspace.yaml                 UPDATED — packages: ["apps/*", "tools/*"]

tools/release-check/
├─ package.json                     name: release-check, script: "start": "tsx src/index.ts"
├─ tsconfig.json
├─ .env.example                     ANTHROPIC_API_KEY, WEB_COVERAGE_FLOOR, API_COVERAGE_FLOOR
├─ src/
│  ├─ index.ts                      orchestrator — always exits 0
│  ├─ types.ts                      Finding, CoverageResult, CollectorResult<T>
│  ├─ config.ts                     env/threshold/path resolution
│  ├─ collectors/
│  │  ├─ pnpm-audit.ts              `pnpm audit --json` in apps/web → Finding[]
│  │  ├─ pip-audit.ts               apps/api/.venv/bin/pip-audit --format json → Finding[]
│  │  ├─ web-coverage.ts            vitest --coverage → CoverageResult
│  │  └─ api-coverage.ts            pytest --cov --cov-report=json → CoverageResult
│  └─ report/
│     ├─ build-prompt.ts            findings + coverage → Claude request
│     ├─ call-claude.ts             typed-error-handled call, raw-dump fallback
│     └─ render.ts                  stdout + markdown file

apps/web/
├─ package.json                     +devDependency @vitest/coverage-v8, +script "coverage"
└─ vitest.config.mts                +coverage.reporter: ["json-summary", "text"]

apps/api/
└─ requirements.txt                 +pip-audit, +pytest-cov

.github/workflows/release-check.yml NEW — workflow_dispatch + weekly schedule

package.json (root)                 +script "release:check": "pnpm --dir tools/release-check start"
```

`tools/release-check` becomes a normal pnpm workspace member once `tools/*`
is added to `pnpm-workspace.yaml`, so `pnpm turbo test`/`lint`/`typecheck`
pick it up automatically alongside `apps/*` — no changes to `turbo.json`
itself are needed.

## Data flow

```
pnpm release:check
  │
  ├─ collect (parallel, each fails independently):
  │    pnpm-audit.ts  ──▶ apps/web  pnpm audit --json
  │    pip-audit.ts   ──▶ apps/api  .venv/bin/pip-audit --format json
  │    web-coverage.ts──▶ apps/web  vitest run --coverage  → coverage/coverage-summary.json
  │    api-coverage.ts──▶ apps/api  .venv/bin/pytest --cov=app --cov-report=json:coverage.json
  │
  ├─ evaluate coverage floors (deterministic, no LLM):
  │    { actual, floor, passed } per app — informational only, never exits non-zero
  │
  ├─ build-prompt.ts: one request bundling the 2 Finding[] + 2 CoverageResult
  │    → Claude (claude-opus-5), asks for findings grouped by actionability
  │      (fix before release / worth knowing / noise) with the reason for each bucket
  │
  └─ render.ts: prints the report to stdout, writes
       tools/release-check/output/report-<timestamp>.md (gitignored)
```

**Config & secrets:** `tools/release-check/.env.example` documents
`ANTHROPIC_API_KEY`, `WEB_COVERAGE_FLOOR`, `API_COVERAGE_FLOOR`. Real values
go in a local `.env`, per this repo's existing convention (`CONTRIBUTING.md`).
Node's native `--env-file=.env` loads it — no `dotenv` dependency needed.

**Coverage floors are provisional at launch.** Neither app has a coverage
number today. The floors get set to whatever the first real run measures
(rounded down slightly), not to an arbitrary target — so the tool starts
truthful instead of immediately red against a number pulled from nowhere.

**GitHub Actions:** `workflow_dispatch` (manual, "before a release") and a
weekly `schedule: cron`. Both run the same script; the run is always green,
and the report is written to `$GITHUB_STEP_SUMMARY` rather than posted as a
PR comment, since the scheduled run isn't attached to any PR. The workflow
needs both a Node/pnpm setup and a Python/venv setup (installing
`requirements.txt`, which now includes `pip-audit` and `pytest-cov`).
**Manual step, not something this change can do on its own:** `ANTHROPIC_API_KEY`
must be added as a repository secret in GitHub before the workflow can run.

## Error handling

| Failure | Behavior |
|---|---|
| `pnpm audit` / `pip-audit` exit non-zero because they *found* vulnerabilities | Normal — stdout is still parsed as findings, not treated as an error |
| A collector crashes, binary missing, or output unparseable | That section's `CollectorResult` is marked failed with a reason; the other three collectors and the LLM step still run on what succeeded |
| Claude API call fails (auth/rate limit/network — typed exception chain, most-specific first) | Falls back to printing the raw, unprioritized `Finding[]`/`CoverageResult` data instead of the narrative report — never "no report at all" |
| Coverage below floor | Reported, not fatal — script still exits 0 |
| Any/all of the above | Script **always exits 0** — this is a report-only tool by design, never a release gate |

## Testing

Vitest, consistent with `apps/web`, added as `tools/release-check`'s own
devDependency.

**`collectors/*.test.ts`** — feed each collector fixture JSON shaped like
real `pnpm audit`/`pip-audit`/coverage output, assert the normalized
`Finding[]`/`CoverageResult`. Pure functions, no network, no mocking beyond
the fixture strings.

**`report/build-prompt.test.ts`** — given a fixed set of findings and
coverage results, assert the constructed request has the expected shape and
content (e.g. all findings present, coverage results included).

**`report/call-claude.test.ts`** — mocks the Anthropic client:
- success path: a mock response renders into the expected report shape
- failure path (each typed error in the chain): falls back to the raw-dump
  render instead of throwing

**Not automated:** an actual live call to the Claude API. That stays a
manual smoke run (`pnpm release:check` locally with a real key) before
trusting the GitHub Actions workflow — costs money and is non-deterministic,
so it doesn't belong in the test suite.

## Consequences

- `apps/web` and `apps/api` both gain real coverage tooling where none
  existed before — a side benefit independent of this tool.
- New runtime dependencies: `pip-audit`, `pytest-cov` (apps/api, dev-only);
  `@vitest/coverage-v8` (apps/web, dev-only); `@anthropic-ai/sdk`, `tsx`,
  `vitest` (tools/release-check).
- First repo-wide CI workflow. Establishes the GitHub Actions pattern this
  repo can extend later (e.g. running `pnpm turbo lint typecheck test` on
  every PR), though that's not part of this change.
- Requires a manual, one-time `ANTHROPIC_API_KEY` repository secret, which
  the assistant cannot configure.
- The coverage floors recorded at launch are a starting baseline, not a
  design target — expect to raise them over time as real coverage improves.
