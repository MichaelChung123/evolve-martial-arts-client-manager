# Teaching-Mode Instructions Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Deviation from the writing-plans template:** the standard header recommends
> `superpowers:subagent-driven-development`. This plan explicitly does not.
> The spec being implemented disables subagent-driven development by default
> (see spec § Superpowers Interop), and it would be incoherent to use it to
> install the rule forbidding it. Execute inline.

**Goal:** Make the project's agent instructions actually load in Claude Code, as a
`CLAUDE.md` core plus path-scoped `.claude/rules/`, replacing the vague teaching
directive with an actionable Teaching Contract.

**Architecture:** One always-loaded `CLAUDE.md` holds behavior that governs every
session. Framework-specific reference moves into `.claude/rules/` files scoped by
path, so React guidance loads only under `apps/web/` and Python guidance only under
`apps/api/`. `AGENTS.md` shrinks to a pointer so other tools still find their way in
without becoming a second source of truth.

**Tech Stack:** Markdown only. No application code changes. Verification is
`wc -l`, `grep`, `git`, and a fresh-session `/context` check.

**Spec:** `docs/superpowers/specs/2026-07-31-teaching-mode-instructions-design.md`

## Global Constraints

- `CLAUDE.md` must not exceed **200 lines**. If it does, apply the trim list in
  Task 1 Step 6 in order until it fits.
- Every `.claude/rules/*.md` file that is path-scoped must carry YAML frontmatter
  with a `paths` key. Files without `paths` load in every session — that is
  intentional for three of them and must not be added to the other two.
- Content is **moved, not duplicated**. After this plan, no instruction text may
  appear in two files. `grep` for a distinctive phrase must return one hit.
- Domain vocabulary is fixed and must survive verbatim: Student, Guardian,
  Household, Instructor, Program, Membership, Rank, Class session, Attendance
  record. Never `client` in code.
- Branch is `docs/teaching-mode-instructions`, already created. Per
  `CONTRIBUTING.md`, merge to `main` via pull request, never directly.

## Deviations from the spec

Two, both recorded here and applied to the spec in Task 6.

1. **Default Technology Stack lists and the Architecture repository tree are
   dropped rather than moved.** Per the Claude Code docs, dependency lists and
   directory layouts are derivable from the codebase and cost adherence when kept
   in `CLAUDE.md`. The *non-derivable* rules from those sections are kept: "Do not
   use Create React App", "Do not introduce additional libraries without
   explaining the problem they solve", "Zustand only when…", "prefer FastAPI for
   core domain APIs", "Do not create two competing backends", "Do not create
   abstractions solely because the application might need them later".
2. **Decision Records collapses from 23 lines to 4** in `CLAUDE.md`: what an ADR
   contains, where it lives, and when to write one. The list of example decisions
   is derivable judgement, not a rule.

Without these, `CLAUDE.md` lands at ~376 lines against a 200-line cap.

## File Structure

| File | Lines | Loads | Responsibility |
|---|---|---|---|
| `CLAUDE.md` | ≤200 | always | Behavior governing every session |
| `.claude/rules/react-nextjs.md` | ~190 | `apps/web/**/*.{ts,tsx}` | React and Next.js reference |
| `.claude/rules/python-api.md` | ~165 | `apps/api/**/*.py` | Python, FastAPI, API and data model |
| `.claude/rules/testing.md` | ~65 | always | TDD loop and testing strategy |
| `.claude/rules/security-privacy.md` | ~45 | always | Handling minors' personal data |
| `.claude/rules/code-review.md` | ~35 | always | Review criteria and output shape |
| `AGENTS.md` | ~25 | never (other tools) | Pointer to the above |
| `apps/web/AGENTS.md` | — | — | Deleted |

`testing.md` is unscoped deliberately: under TDD it must be in context *before* any
test file exists, which is exactly when a path-scoped rule would not have fired.

---

### Task 1: Create CLAUDE.md

**Files:**
- Create: `CLAUDE.md`
- Source: `AGENTS.md` (line ranges below), spec § Teaching Contract, spec §
  Superpowers Interop

**Interfaces:**
- Produces: the always-loaded core. Tasks 2 and 3 rely on its "Rule files" section
  naming each rule file, and on Learning Objectives existing here — the Teaching
  Contract references it as the arbiter of concept-critical work.

- [ ] **Step 1: Assemble sections from AGENTS.md**

In this order, copying from `AGENTS.md`:

| Section | Source | Treatment |
|---|---|---|
| Persona | 3–18 | **Delete line 7** (the no-tests rule). Rewrite lines 12 and 16, replacing `JS/Vue/Vuetify` with `React/Next.js/TypeScript/Python`. Keep Beck/Fowler/Martin content verbatim. |
| Project Purpose | 20–44 | Condense to ~16 lines. Keep the "Assume I already understand" list and "Do not explain beginner web-development concepts unless explicitly asked" verbatim. |
| Product Context | 46–63 | Verbatim. All nine domain terms and the `client` prohibition. |
| Initial Product Scope | 64–89 | Keep the seven MVP capabilities. Replace the eight "later capabilities" bullets with one line: "Later phases (scheduling, promotions, payments, documents, instructors, notifications, reporting) are out of scope until the current task requires them." |
| Architecture | 163–202 | Condense to ~12 lines. **Drop the repository tree.** Keep the Prefer/Avoid bullets and "The backend is the source of truth for authorization, validation, and business rules." |
| Coding-Agent Workflow | 654–687 | Condense to ~18 lines. Keep "Never claim a command passed unless it was actually run successfully" verbatim. |
| Command and Tool Safety | 689–708 | Condense to ~14 lines. Keep the full "Ask before" list. |
| Decision Records | 710–732 | Collapse to 4 lines: ADRs live in `docs/decisions/`, contain Context / Decision / Alternatives / Consequences, written only for significant architectural choices. |
| Learning Objectives | 734–778 | Condense to ~28 lines. **Keep all three subheadings and every bullet** — this list arbitrates the Teaching Contract. Compress by putting bullets on shared lines, not by removing any. |

- [ ] **Step 2: Insert the Teaching Contract**

Copy verbatim from the spec's `## The Teaching Contract` fenced block, including
the Zod amendment ("and Zod schemas specifically — schema design is modeling work,
not boilerplate") and all five escape hatches.

- [ ] **Step 3: Insert Superpowers Interop**

Copy verbatim from the spec's `## Superpowers Interop` fenced block, including the
"Disabled by default" subsection and the "subagent mode" opt-in paragraph.

- [ ] **Step 4: Add the Toolchain section**

New content, ~7 lines:

```markdown
## Toolchain

- pnpm 11.13.0 is the package manager. Never npm or yarn.
- Turborepo drives builds across `apps/`. Prefer `pnpm turbo <task>` at the root.
- Local services come from `compose.yaml` (not `docker-compose.yml`).
- `startup.md` documents the full local startup sequence — read it before
  proposing changes to how the dev environment runs.
```

- [ ] **Step 5: Add the Rule files section**

New content, ~8 lines. This mitigates the known limitation that path-scoped rules
fire on reading a matching file, so creating a new file may not trigger them:

```markdown
## Rule files

Detailed guidance lives in `.claude/rules/`. Path-scoped files load when a
matching file is read — which does not happen if you are creating the first file
in an area. **Read the relevant file before starting frontend or backend work:**

- `.claude/rules/react-nextjs.md` — React and Next.js (`apps/web/`)
- `.claude/rules/python-api.md` — Python, FastAPI, API and data model (`apps/api/`)

`testing.md`, `security-privacy.md`, and `code-review.md` load automatically.
```

- [ ] **Step 6: Verify the line cap**

Run: `wc -l CLAUDE.md`
Expected: ≤ 200.

If over, apply in this order until it fits:
1. Condense Learning Objectives further — group bullets onto shared lines. Never
   delete an objective.
2. Cut Coding-Agent Workflow to its three "After modifying code" reporting rules.
3. Cut Architecture to the Avoid list plus the backend-source-of-truth line.
4. Move Command and Tool Safety to a new unscoped `.claude/rules/tool-safety.md`.

- [ ] **Step 7: Verify no contradictions survive**

Run:
```bash
grep -n "unless the user explicitly asks for tests" CLAUDE.md
grep -in "vuetify\|vue/vuetify" CLAUDE.md
grep -n "docker-compose.yml" CLAUDE.md
```
Expected: no output from any of the three.

Then confirm the opposite is present:
```bash
grep -c "TODO(you)" CLAUDE.md        # expect >= 1
grep -c "subagent mode" CLAUDE.md    # expect >= 2 (interop + escape hatch)
```

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with teaching contract and superpowers interop"
```

---

### Task 2: Create the path-scoped rule files

**Files:**
- Create: `.claude/rules/react-nextjs.md`
- Create: `.claude/rules/python-api.md`
- Source: `AGENTS.md` line ranges below

**Interfaces:**
- Consumes: `CLAUDE.md` § Rule files, which names both paths. They must match
  exactly.
- Produces: nothing later tasks depend on structurally. Task 5 greps both.

- [ ] **Step 1: Create `.claude/rules/react-nextjs.md`**

Frontmatter exactly:

```markdown
---
paths:
  - "apps/web/**/*.{ts,tsx}"
---
```

Then, copied from `AGENTS.md` in this order:

| Section | Source |
|---|---|
| Modern React Standards | 204–231 |
| Vue-to-React Mapping | 233–260 |
| React Mental Models | 262–289 |
| State and Data-Fetching Guidance | 291–346 |
| Next.js Standards | 348–373 |
| Forms and Validation | 516–536 |
| Accessibility and UX | 575–594 |

Plus, from the Frontend stack list (125–135) and Performance Guidance (628–652),
only the non-derivable rules — appended as a short `## Frontend conventions`
section:

```markdown
## Frontend conventions

- Tailwind CSS, React Hook Form, and Zod are the defaults.
- TanStack Query only when the feature genuinely needs client-side server state:
  background refetching, caching, mutations with invalidation, optimistic updates,
  or polling.
- Zustand only for shared client state that is not server state or URL state.
  Explain why a store is needed before adding one.
- Do not use Create React App.
- Do not recommend `useMemo`, `useCallback`, or `React.memo` without a measured
  or clearly justified reason. State what work occurs, what the bottleneck is,
  why the fix helps, and how to verify the benefit.
```

- [ ] **Step 2: Create `.claude/rules/python-api.md`**

Frontmatter exactly:

```markdown
---
paths:
  - "apps/api/**/*.py"
---
```

Then, copied from `AGENTS.md` in this order:

| Section | Source |
|---|---|
| Python and FastAPI Learning Guidance | 375–413 |
| API Design Standards | 415–451 |
| Domain and Data-Model Guidance | 453–483 |

Plus a `## Backend conventions` section carrying the non-derivable rules from the
Backend stack list (136–145), the Next.js/FastAPI boundary rule (371), and the
backend half of Performance Guidance:

```markdown
## Backend conventions

- FastAPI owns core domain APIs and business logic. Use Next.js Route Handlers or
  Server Actions only where they clearly improve the web app's boundary or
  orchestration. Do not create two competing backends.
- Alembic for every schema change. Never edit the database by hand.
- Prefer correct data access, pagination, and suitable indexes over
  micro-optimization. Do not denormalize or add caching without a measured reason.
```

- [ ] **Step 3: Verify frontmatter parses and paths are correct**

Run:
```bash
head -5 .claude/rules/react-nextjs.md
head -5 .claude/rules/python-api.md
```
Expected: each opens with `---`, a `paths:` key, one quoted glob, and a closing
`---`. The globs must be `apps/web/**/*.{ts,tsx}` and `apps/api/**/*.py`.

- [ ] **Step 4: Verify the globs match real files**

Run:
```bash
ls apps/web/src/**/*.tsx 2>/dev/null | head -3
ls apps/api/app/**/*.py 2>/dev/null | head -3
```
Expected: at least one file each. If either is empty, the glob is scoped to a
directory that does not exist and the rule would never fire — fix the glob.

- [ ] **Step 5: Commit**

```bash
git add .claude/rules/react-nextjs.md .claude/rules/python-api.md
git commit -m "docs: add path-scoped React and Python rule files"
```

---

### Task 3: Create the unscoped rule files

**Files:**
- Create: `.claude/rules/testing.md`
- Create: `.claude/rules/security-privacy.md`
- Create: `.claude/rules/code-review.md`

**Interfaces:**
- Consumes: `CLAUDE.md` § Teaching Contract step 3, which defines the TDD split.
  `testing.md` must not restate it — it references it.

- [ ] **Step 1: Create `.claude/rules/testing.md`**

**No frontmatter.** This file must load in every session.

Body: Testing Strategy from `AGENTS.md` 538–573, plus a short opening that points
at the contract rather than duplicating it:

```markdown
# Testing

The red/green split is defined in `CLAUDE.md` § Teaching Contract step 3: I write
fixtures, factories, and empty test blocks; you write the assertions and the
implementation. This file covers what to test, not who writes it.
```

Then the existing pyramid (frontend and backend), the six high-value early
workflows, "For every bug fix, add a regression test when practical", and "Do not
test framework implementation details. Test observable behavior and business
rules." Append the dev-quality tooling line from 146–154: ESLint, Prettier, Ruff,
mypy or Pyright.

- [ ] **Step 2: Create `.claude/rules/security-privacy.md`**

**No frontmatter.** Body: Privacy and Security from `AGENTS.md` 485–514, verbatim.
Both the Never and Prefer lists, and "Do not build authentication or cryptography
from scratch."

- [ ] **Step 3: Create `.claude/rules/code-review.md`**

**No frontmatter.** Body: Code Review Expectations from `AGENTS.md` 596–626,
verbatim — all fifteen criteria, the five output elements, and "Differentiate
blocking issues from optional refinements."

- [ ] **Step 4: Verify these three have no frontmatter**

Run: `head -1 .claude/rules/testing.md .claude/rules/security-privacy.md .claude/rules/code-review.md`
Expected: no line is `---`. A `paths` key here would stop them loading globally.

- [ ] **Step 5: Commit**

```bash
git add .claude/rules/testing.md .claude/rules/security-privacy.md .claude/rules/code-review.md
git commit -m "docs: add always-loaded testing, security, and review rules"
```

---

### Task 4: Reduce AGENTS.md and delete the duplicate

**Files:**
- Modify: `AGENTS.md` (replace entirely)
- Delete: `apps/web/AGENTS.md`

- [ ] **Step 1: Confirm the duplicate is still identical before deleting**

Run: `diff <(tail -n +19 AGENTS.md) <(tail -n +2 apps/web/AGENTS.md)`
Expected: no differences except the trailing newline noted in the spec. If real
differences appear, `apps/web/AGENTS.md` diverged since the spec was written —
stop and review them before deleting.

- [ ] **Step 2: Replace AGENTS.md**

```markdown
# AGENTS.md

This project's agent instructions live in `CLAUDE.md` and `.claude/rules/`.

Claude Code reads `CLAUDE.md`, not this file. Other agents should read:

- `CLAUDE.md` — persona, product domain, the Teaching Contract, workflow,
  command safety, and learning objectives. Applies to all work.
- `.claude/rules/react-nextjs.md` — React and Next.js. Applies to `apps/web/`.
- `.claude/rules/python-api.md` — Python, FastAPI, API and data model.
  Applies to `apps/api/`.
- `.claude/rules/testing.md` — testing strategy. Applies to all work.
- `.claude/rules/security-privacy.md` — handling personal data, including
  minors'. Applies to all work.
- `.claude/rules/code-review.md` — review criteria. Applies to all work.

Do not add instructions to this file. It is a pointer, not a source of truth.
```

- [ ] **Step 3: Delete the duplicate**

```bash
git rm apps/web/AGENTS.md
```

- [ ] **Step 4: Verify no content was lost**

For each section header previously in `AGENTS.md`, confirm it now lives in exactly
one new file:

```bash
for s in "Modern React Standards" "Vue-to-React Mapping" "React Mental Models" \
         "State and Data-Fetching" "Next.js Standards" "Forms and Validation" \
         "Accessibility and UX" "Python and FastAPI" "API Design Standards" \
         "Domain and Data-Model" "Privacy and Security" "Testing Strategy" \
         "Code Review Expectations" "Learning Objectives" "Product Context"; do
  n=$(grep -rl "$s" CLAUDE.md .claude/rules/ 2>/dev/null | wc -l)
  echo "$n  $s"
done
```
Expected: every line starts with `1`. A `0` means content was dropped; a `2` means
it was duplicated. Both are failures.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md apps/web/AGENTS.md
git commit -m "docs: reduce AGENTS.md to a pointer, drop duplicated web copy"
```

---

### Task 5: Verify loading in a fresh session

**This task cannot be completed by the agent in the current session.** Path-scoped
rule loading and `/context` output are properties of session startup. The user runs
these steps.

- [ ] **Step 1: Start a new session and run `/context`**

Expected: `CLAUDE.md` appears under **Memory files**. If absent, nothing else in
this plan is in effect.

- [ ] **Step 2: Confirm unscoped rules loaded**

Ask: "Which rule files are currently loaded?"
Expected: `testing.md`, `security-privacy.md`, `code-review.md` — and *not*
`react-nextjs.md` or `python-api.md`.

- [ ] **Step 3: Trigger the frontend scope**

Ask Claude to read a `.tsx` file under `apps/web/src/`, then ask which rules are
loaded. Expected: `react-nextjs.md` now loaded, `python-api.md` still not.

- [ ] **Step 4: Trigger the backend scope**

Ask Claude to read a `.py` file under `apps/api/app/`. Expected: `python-api.md`
now loaded.

- [ ] **Step 5: Behavioral check**

Ask for a small feature, e.g. "add an archived filter to the student list."
Expected, per the Teaching Contract: an explanation first, then a skeleton with
`TODO(you)` markers on the concept-critical parts and the Zod schema, and no
implementation of those parts. If Claude writes the whole feature, the contract is
not being followed — check `/context` first, then wording.

- [ ] **Step 6: Open the pull request**

```bash
git push -u origin docs/teaching-mode-instructions
gh pr create --title "docs: restructure agent instructions for teaching mode" \
  --body "Implements docs/superpowers/specs/2026-07-31-teaching-mode-instructions-design.md"
```

---

### Task 6: Record the deviations in the spec

**Files:**
- Modify: `docs/superpowers/specs/2026-07-31-teaching-mode-instructions-design.md`

- [ ] **Step 1: Update the content assignment**

In § Content assignment, remove Default Technology Stack and the Architecture
repository tree from the `CLAUDE.md` list. Add a note that their non-derivable
rules moved to the two path-scoped files, citing the `/doctor` trim guidance.

- [ ] **Step 2: Update the context accounting table**

Replace the estimates with measured values:

```bash
wc -l CLAUDE.md .claude/rules/*.md
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-31-teaching-mode-instructions-design.md
git commit -m "docs: record spec deviations found during implementation"
```

---

## Self-Review

**Spec coverage.** Every spec section maps to a task: layout → Tasks 1–4; Teaching
Contract → Task 1 Step 2; Superpowers Interop → Task 1 Step 3; all six content
fixes → line 7 (T1S1), Vue/Vuetify (T1S1), duplicate deletion (T4S3), AGENTS.md
pointer (T4S2), `compose.yaml` (T1S4), toolchain (T1S4); the six spec verification
steps → Task 5. The spec's known limitation about path-scoped triggering →
Task 1 Step 5.

**Placeholder scan.** No TBDs. Every content step names either exact line ranges in
`AGENTS.md` or gives verbatim text. Moved sections are cited by source range rather
than re-transcribed — deliberate, since transcribing 700 lines of prose into the
plan and then again into the files invites drift between the two copies.

**Type consistency.** File paths are identical across `CLAUDE.md` § Rule files
(T1S5), the `AGENTS.md` pointer (T4S2), the File Structure table, and the Task 4
verification loop. The two globs appear in Task 2 Steps 1, 2, and 3 identically.

**Known gap.** Task 5 cannot be executed by the agent and is assigned to the user.
Tasks 1–4 and 6 are agent-executable in this session.
