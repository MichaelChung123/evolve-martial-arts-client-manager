# Teaching-Mode Instructions: Design

Date: 2026-07-31
Status: Approved, pending implementation

## Problem

The repository carries 778 lines of agent instructions in `AGENTS.md`, plus a
second copy in `apps/web/AGENTS.md`. Four defects make them ineffective:

1. **They are never loaded.** The Claude Code documentation states: "Claude Code
   reads `CLAUDE.md`, not `AGENTS.md`." No setting changes this. Every session to
   date has run without any of this guidance.
2. **The frontend copy is a duplicate.** `apps/web/AGENTS.md` is byte-identical to
   the root file from line 19 onward, differing only in a trailing newline. 745
   duplicated lines that will drift.
3. **The instructions contradict themselves.** Line 7 forbids writing tests
   without an explicit request; line 569 requires a regression test for every bug
   fix, line 653 requires adding or updating tests, and a 34-line Testing Strategy
   section assumes tests exist. The documentation warns that contradictory rules
   cause arbitrary rule selection.
4. **They exceed the recommended size.** The documentation targets under 200 lines
   per `CLAUDE.md`, noting that longer files "consume more context and reduce
   adherence." A flat import would load all 778 lines every session, including
   Python guidance during frontend work.

A fifth defect is content drift: the Persona section references "the JS/Vue/Vuetify
context," carryover from a different project.

## Goals

- Make the instructions actually load in Claude Code sessions.
- Keep exactly one source of truth for each instruction.
- Replace the vague "prefer guided learning" directive with a contract specific
  enough to act on consistently.
- Reconcile the instructions with the newly installed Superpowers plugin.
- Keep sessions oriented toward learning React, Next.js, and Python, since the
  stated project purpose is job-readiness rather than shipping speed.

## Decisions

Four decisions were settled before this design:

| Decision | Choice |
|---|---|
| Teaching style | Explain first, then a skeleton with concept-critical parts left as TODOs for the user |
| Work split | Concept-critical vs. mechanical, arbitrated by the Learning Objectives list |
| Tests | TDD. The user writes the assertions; the agent writes fixtures and scaffolding. Line 7 is deleted |
| File layout | Split into `CLAUDE.md` plus path-scoped `.claude/rules/`; `AGENTS.md` reduced to a pointer |

## Target layout

```
CLAUDE.md                      ~200 lines   always loaded
.claude/rules/
├── react-nextjs.md            ~180   paths: apps/web/**/*.{ts,tsx}
├── python-api.md              ~150   paths: apps/api/**/*.py
├── testing.md                  ~60   always loaded
├── security-privacy.md         ~45   always loaded
└── code-review.md              ~35   always loaded
AGENTS.md                       ~25   pointer for other tools
apps/web/AGENTS.md                     deleted
```

Context accounting:

| | Lines |
|---|---|
| Always loaded (`CLAUDE.md` + 3 unscoped rules) | ~340 |
| Frontend session (+ `react-nextjs.md`) | ~520 |
| Backend session (+ `python-api.md`) | ~490 |
| Current `AGENTS.md`, were it loaded at all | 778 |

`CLAUDE.md` sits at roughly 200 lines, which is the documented ceiling rather than
comfortably under it. The context saving comes from path-scoping, not from a small
`CLAUDE.md`. This is the accepted tradeoff: the always-loaded core is what governs
every session, and cutting it further would mean dropping either the Teaching
Contract or the Learning Objectives that arbitrate it.

### Content assignment

**`CLAUDE.md`** (always loaded):
- Persona, with the Vue/Vuetify references corrected to React/Next.js/TypeScript/Python
- Project Purpose, including the list of concepts not to re-explain
- Product Context and domain language (Student, Guardian, Household, Instructor,
  Program, Membership, Rank, Class session, Attendance record)
- Initial Product Scope
- Toolchain: pnpm 11.13.0, Turborepo, `compose.yaml`, `startup.md`
- The Teaching Contract (below)
- Superpowers Interop (below)
- Coding-Agent Workflow
- Command and Tool Safety
- Decision Records
- The general optimization principle from Performance Guidance: optimize only
  when necessary, and state what work occurs, what the bottleneck is, why the fix
  helps, its maintenance cost, and how to verify the benefit
- **Learning Objectives**, in full

Learning Objectives must stay always-loaded because it arbitrates two runtime
decisions: which parts of an implementation the user writes, and which behaviors
the user asserts in tests.

**`.claude/rules/react-nextjs.md`** — `paths: ["apps/web/**/*.{ts,tsx}"]`:
Modern React Standards, Vue-to-React Mapping, React Mental Models, State and
Data-Fetching Guidance, Next.js Standards, Forms and Validation, Accessibility
and UX. From Performance Guidance: the rule that `useMemo`, `useCallback`, and
`React.memo` are not recommended without a measured reason.

**`.claude/rules/python-api.md`** — `paths: ["apps/api/**/*.py"]`:
Python and FastAPI Learning Guidance, API Design Standards, Domain and
Data-Model Guidance. From Performance Guidance: prefer correct data access,
pagination, and suitable indexes; avoid denormalization and complex caching
without a measured reason.

**`.claude/rules/testing.md`** — always loaded, no `paths` field. Testing must be
in context before any test file exists, which is precisely when a path-scoped
rule would not have triggered.

**`.claude/rules/security-privacy.md`** — always loaded. The application stores
personal information about adults and minors; this applies to every file.

**`.claude/rules/code-review.md`** — always loaded. Small, and needed whenever
review happens.

**`AGENTS.md`** — reduced to a pointer naming `CLAUDE.md` and `.claude/rules/` as
the real instructions, for the benefit of other tools.

### Known limitation

Path-scoped rules trigger when Claude reads a file matching the pattern, not on
every tool use. Creating a new `.tsx` without first reading an existing one may
not load `react-nextjs.md`.

Mitigation: `CLAUDE.md` carries an explicit instruction to read the relevant rule
file at the start of frontend or backend work.

## The Teaching Contract

Replaces the current Teaching Mode section verbatim.

```markdown
## Teaching Contract

Default for every feature and bugfix. Overridden only by the escape hatches.

### 1. Explain before building
Restate the goal and constraints. Name the concept being exercised. Give the Vue
contrast where one exists, and say where it breaks down. State the tradeoff and
what you are choosing not to do.

### 2. Write the skeleton, not the solution
**I write (mechanical):** imports, TypeScript types, file and route wiring,
Alembic migrations, pytest fixtures and conftest, test scaffolding, Tailwind
markup, config, boilerplate.

**You write (concept-critical):** anything exercising an item under Learning
Objectives, and Zod schemas specifically — schema design is modeling work, not
boilerplate. Leave these as `// TODO(you):` comments, each carrying one short
question pointing at the decision.

When unsure which side something falls on, it is concept-critical.

### 3. Tests first
1. I explain the behavior and the edge cases worth covering.
2. I write fixtures, factories, and empty test blocks.
3. You write the assertions. Run them. They must fail.
4. You write the implementation until they pass.
5. I review and suggest refactors.

Never write the assertion and the implementation in the same step.

### 4. Review, don't rewrite
Say what is good, what a senior would flag, and what is blocking versus optional.
Ask a question that makes me reason about it. Do not silently rewrite my code —
propose the change and say why.

### 5. Close the loop
Files changed, decisions made, commands run and their real results, remaining
risks, and the one concept to take away.

### Escape hatches
- "just write it"      → implement fully, no TODOs
- "show me the answer" → fill in the TODOs I'm stuck on, with reasoning
- "production speed"   → drop teaching mode for the rest of this task
- "skip brainstorming" → bypass the Superpowers design gate
- "subagent mode"      → suspend this contract and use subagent-driven
                         development for this task
```

## Superpowers Interop

New section in `CLAUDE.md`.

```markdown
## Superpowers Interop

Superpowers injects its workflow at session start. Where it conflicts with this
file, this file wins.

Active:
- systematic-debugging — but I debug. Explain the method, form the hypothesis
  with me, let me run the experiment.
- test-driven-development — active, using the Teaching Contract split: you write
  fixtures and empty test blocks, I write the assertions.
- verification-before-completion — always. Never claim a command passed without
  running it.
- requesting-code-review / receiving-code-review — use the Code Review
  Expectations in .claude/rules/code-review.md.
- brainstorming — for features. Skip for one-file changes, config edits, and
  typos.
- writing-plans — after a design is approved, then execute in-session under the
  Teaching Contract.
- finishing-a-development-branch / using-git-worktrees — follow CONTRIBUTING.md:
  short-lived branch off main, GitHub Flow, PR to merge.

Disabled by default:
- subagent-driven-development
- dispatching-parallel-agents

  Subagents write the code themselves — that is their purpose, and it is exactly
  what this file exists to prevent. Never dispatch agents for implementation on
  your own initiative.

  Opt-in: I enable them by saying "subagent mode" or "use subagents". This
  suspends the Teaching Contract for the current task only and reverts at the
  next task, unless I say "subagent mode until I say stop". Before dispatching,
  confirm what is being handed off.
```

## Content fixes

| # | Fix | Rationale |
|---|---|---|
| 1 | Delete root `AGENTS.md` line 7 | Resolved to TDD; contradicts lines 569, 653, and Testing Strategy |
| 2 | Persona lines 12, 16: `JS/Vue/Vuetify` → React/Next.js/TypeScript/Python | Carryover from a Vue project. The Vue-to-React mapping section is deliberate and stays |
| 3 | Delete `apps/web/AGENTS.md` | 745 byte-identical duplicated lines |
| 4 | Root `AGENTS.md` → ~25-line pointer | Keeps other tools working without a second source of truth |
| 5 | Architecture tree: `docker-compose.yml` → `compose.yaml` | Matches the actual repository |
| 6 | Add toolchain: pnpm 11.13.0, Turborepo, `startup.md` | Absent from all 778 lines; without it the agent would default to npm |

## Verification

1. Start a new session and run `/context`. Confirm `CLAUDE.md` appears under
   **Memory files**.
2. Read a file under `apps/web/` and confirm `react-nextjs.md` loads.
3. Read a file under `apps/api/` and confirm `python-api.md` loads, and that
   `react-nextjs.md` does not.
4. Confirm `CLAUDE.md` does not exceed 200 lines. If it does, move Decision
   Records and Command and Tool Safety into an unscoped rule file until it fits.
5. Grep the new files for the contradictions listed above; confirm none survive.
6. Request a small feature and confirm the response explains first, produces a
   skeleton with `TODO(you)` markers, and does not write the concept-critical
   parts.

## Out of scope

- `apps/web/pnpm-lock.yaml` and `apps/web/pnpm-workspace.yaml` duplicate the root
  workspace files. This is likely unintentional and can cause duplicate installs,
  but it is a dependency-management issue, not an instructions issue. Track
  separately.
- No application code changes.
- No changes to `CONTRIBUTING.md` or `startup.md`.
