# Student Archival and Archived Filter: Design

Date: 2026-07-31
Status: Implemented on branch `feature/student-archival-filter`, PR #4. Backend
is covered by 18 passing tests; frontend behaviour was verified manually in the
browser (no test runner exists in `apps/web` — see § Out of scope).

## Problem

The request was "add an archived filter to the student list." Exploration found
there is nothing to filter on:

1. **No archival concept exists.** `Student`
   (`apps/api/app/models/student.py`) carries `id`, `first_name`, `last_name`,
   `email`, `phone`, `date_of_birth`, `created_at`, `updated_at`. There is no
   status or archival column.
2. **The list is unconditional.** `student_service.list_students` selects every
   row, ordered by name, with offset/limit only.
3. **Deletion is destructive.** `DELETE /api/students/{id}` calls `db.delete()`
   and commits. This contradicts `.claude/rules/python-api.md` ("Do not
   permanently delete important student, membership, rank, or attendance
   history") and `.claude/rules/security-privacy.md` ("Archival rather than
   destructive deletion"), and it contradicts the MVP scope in `CLAUDE.md`,
   which lists "archive students" as in-scope.

So the filter is the visible tip of a change that starts at the data model. The
MVP scope item this closes is "create, view, edit, search, and archive
students."

## Goals

- Give `Student` a first-class archival state that records *when* it happened.
- Default the roster to active students without losing access to archived ones.
- Replace destructive deletion with a reversible, auditable transition.
- Keep the client boundary narrow and the filter state shareable via URL.
- Land the repository's first backend test infrastructure alongside the feature.

## Decisions

Four decisions were settled before this design:

| Decision | Choice |
|---|---|
| Scope | Full vertical slice, plus archive/restore replacing hard delete |
| Data model | Nullable `archived_at` timestamp; `NULL` means active |
| API contract | `?status=active\|archived\|all`, defaulting to `active` |
| Filter state | Server page reads `searchParams`, passes `status` down as a prop |

Rejected alternatives and why:

- **Boolean `is_archived`** — simpler to read, but discards the archival
  timestamp. Recovering it later needs another migration and a backfill that
  cannot actually be backfilled.
- **Status enum on `Student`** — more extensible, but enrollment state belongs
  to `Membership`, not `Student`. Conflating them designs for a future the MVP
  has not reached, which `CLAUDE.md` explicitly warns against.
- **`include_archived` boolean param** — cannot express "archived only," so
  auditing archived students would mean eyeballing a mixed list.
- **Keeping `status` default as "all"** — non-breaking, but makes the unsafe
  default the lazy one: every future list view would include archived students
  unless the caller remembered to exclude them.
- **`PATCH` with `archived_at` in the body** — lets any client write an
  arbitrary timestamp and buries a state transition inside a general field
  update.
- **`useSearchParams()` in the client component** — self-contained, but opts the
  subtree out of static rendering, needs a `<Suspense>` boundary, and ships JS
  to do what a link already does.
- **A URL-state library such as `nuqs`** — genuinely useful once search, sort,
  and pagination interact, but an unjustified dependency for one three-value
  parameter today.

## Data model

Add one column to `students`:

```python
archived_at: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True),
    nullable=True,
    index=True,
)
```

`NULL` means active; a timestamp means archived and records when. The Alembic
migration adds the column as nullable, so existing rows become active with no
backfill, and downgrade is a plain `op.drop_column`.

At current scale the index is not load-bearing. It is included because
active-only listing becomes the hot path for every roster view, and adding it
now costs nothing on a table this size.

### Email uniqueness interaction

`Student.email` is `unique=True` globally, and `create_student` rejects
duplicates with 409 before insert. Archiving does **not** release the address:
an archived student's email still blocks creating a new student with it.

This is intentional. If a former student re-enrolls, the correct action is
restoring their record — which preserves their attendance and rank history —
not creating a duplicate that orphans it. The 409 detail message must say so
rather than the current generic "A student with this email already exists," or
staff will have no way to discover that the blocking record is archived.

## API contract

```
GET    /api/students?status=active|archived|all   default: active
POST   /api/students/{id}/archive                 -> 200 StudentResponse
POST   /api/students/{id}/restore                 -> 200 StudentResponse
DELETE /api/students/{id}                         removed
```

`status` is a `StrEnum` so FastAPI validates it, rejects anything else with 422,
and documents the allowed values in OpenAPI. `list_students` gains a `status`
keyword and applies `Student.archived_at.is_(None)`,
`Student.archived_at.is_not(None)`, or no predicate.

`archived_at` is added to `StudentResponse`. Existing `offset`/`limit`
pagination is unchanged and composes with the filter.

### Transition semantics

Both transitions are idempotent and server-authoritative — the client never
supplies a timestamp.

- Archiving an active student sets `archived_at = now()`.
- Archiving an **already-archived** student returns 200 and **preserves the
  original timestamp**. That timestamp is the audit trail; resetting it on a
  double-click would destroy the fact being recorded.
- Restoring sets `archived_at = None`. Restoring an active student is a 200
  no-op.
- Either transition against a missing id returns 404.

`PATCH /api/students/{id}` continues to work on archived students. Archival
controls list visibility, not editability; blocking edits would force a
restore/edit/re-archive dance to fix a typo, and because restoring clears
`archived_at`, re-archiving would stamp today's date over the real archival
date — destroying the audit trail the column exists to keep.

### Breaking changes

Two, both acceptable because nothing consumes them:

1. `GET /api/students` stops returning archived students by default. No caller
   depends on this today, and the endpoint currently cannot return archived
   students at all because none can exist.
2. `DELETE /api/students/{id}` is removed. `apps/web/src/lib/students.ts`
   exposes only `getStudents`, `getStudent`, and `createStudent`, so the web app
   never called it.

## Frontend

`apps/web/src/app/page.tsx` stays a Server Component. It awaits `searchParams`,
validates `status` against the three literals — falling back to `active` for
absent or unrecognized values rather than erroring — and passes the result down.
A hand-edited URL therefore renders the active roster instead of a 422 page; the
API's stricter 422 still guards direct callers, since the page only ever sends a
value it has already normalized.

**`StatusFilter`** (new, server component): three `<Link href="?status=…">`
elements. No `"use client"`, no client JS, no hydration cost. The current
option carries `aria-current="page"` so the active filter is exposed to
assistive technology rather than signalled by styling alone.

**`StudentList`**: keeps `"use client"` for TanStack Query, takes `status` as a
prop, and keys its query `["students", status]` so each filter caches
independently.

**Row actions**: archive sits behind a confirmation dialog; restore is a single
click with no dialog, since it is the undo. Both use `useMutation` with
`invalidateQueries({ queryKey: ["students"] })`, which prefix-matches every
status variant. `StudentForm`'s existing invalidation already uses that key and
needs no change.

**Archived presentation**: in the `all` view, archived rows carry a text
"Archived" badge. `.claude/rules/react-nextjs.md` forbids communicating status
through color alone.

**Empty states**: the current copy ("No students yet / Add your first student")
is wrong for an empty archived or filtered list. Each of the three states needs
its own message.

## Testing

`apps/api/tests/` currently contains only `__init__.py`. pytest 9.1.1 and httpx
0.28.1 are already in `requirements.txt`, so this feature also lands the
repository's first backend test infrastructure: `conftest.py` with a test
database session, a `TestClient`, an authenticated-user fixture (the students
router sits behind `Depends(get_current_user)`), and a student factory.

Per the Teaching Contract (`CLAUDE.md` § Teaching Contract steps 2–3), the agent
writes `conftest.py`, fixtures, factories, and empty test blocks; the user writes
the assertions, runs them to watch them fail, then writes the implementation.
Concept-critical code reaches the user as `TODO(you):` markers, each carrying one
question pointing at the decision.

Cases to cover:

| Area | Case |
|---|---|
| Filter | Default excludes archived students |
| Filter | `status=archived` returns only archived |
| Filter | `status=all` returns both |
| Filter | Invalid `status` returns 422 |
| Filter | Pagination composes with the filter |
| Archive | Sets `archived_at` and removes the student from the default list |
| Archive | Re-archiving preserves the original timestamp |
| Archive | Unknown id returns 404 |
| Restore | Clears `archived_at` and returns the student to the default list |
| Restore | Unknown id returns 404 |
| Read | An archived student is still retrievable by id |
| Create | A duplicate email still 409s when the holder is archived |

## Deviations applied during implementation

**No confirmation dialog on archive.** The design called for one. Task 4 made
archiving reversible in a single click, and `.claude/rules/security-privacy.md`
asks for confirmation on destructive or *hard-to-reverse* actions — which this
no longer is. A modal here would train staff to dismiss dialogs unread. Revisit
if archival ever becomes hard to undo.

**The 409 message covers create and update.** The design specified the create
path only. Both paths call `get_student_by_email`, so both now report whether
the blocking record is archived. The update path has no test.

**The archived badge renders in every view**, not only under `status=all`, so a
row is never ambiguous about its state regardless of how it was reached.

**`archived_at` uses the API server's clock** (`datetime.now(UTC)`), not the
database's (`func.now()`), unlike `created_at` and `updated_at`. Under multiple
API processes those columns therefore have different ordering guarantees.

**`assert_never` guards the status filter.** Not in the design. Adding a fourth
`StudentStatusFilter` member without handling it becomes a mypy error rather
than a silent fallthrough to unfiltered behaviour.

**`page.tsx` types `searchParams` as `Promise<{ status: StudentStatus }>` and
casts at both call sites.** The honest type is `status?: string`, letting
`normalizeStatus` earn its return type rather than assert it. Runtime behaviour
is correct, but those casts allowed a real bug (`current={params.status}`, which
left no filter tab highlighted) to typecheck during development.

**Test-suite deviations.** `test_pagination_composes_with_the_filter` needed its
archived student to sort *first* (`last_name="Aardvark"`); as originally
scaffolded it sorted last, so filtering-before-paginating and
paginating-before-filtering returned identical rows and the test could not fail.
Factory emails use `example.com`, not `example.test` — RFC 2606 reserves `.test`
and `email-validator` rejects it, which broke `EmailStr` serialization.

## Outstanding verification

The backend is covered by 18 tests. The frontend has **no test runner** (see
§ Out of scope) and no browser exists on the development machine, so the
following were confirmed only by HTTP inspection of the API, the server-rendered
markup, and the serialized RSC payload:

Confirmed manually by the user: the filter tabs, archived badges, rendered rows,
client-side navigation without a full reload, and keyboard focus.

**Checked manually before the PR was opened — all passed:**

1. Archive from the active list removes the row; it appears under Archived.
2. Restore returns the student to the active list.
3. Archiving the last active student renders the "No active students" state.
4. With the API stopped, Archive shows a styled, still-clickable button plus a
   red error message.
5. Double-clicking Archive disables the button and issues one request.

Item 4 mattered most: it is the only path through `StudentRowActions` that no
successful interaction reaches, and a styling defect was found and fixed there
during review.

These remain manual. Until `apps/web` has a test runner, any change to
`StudentRowActions`, `StatusFilter`, or the empty states needs this list re-run
by hand.

## Out of scope

- **Frontend tests.** `apps/web` has no test runner. Adding one means choosing
  Vitest or Jest, a jsdom environment, and an API-mocking approach such as MSW.
  `CLAUDE.md` requires that a foundational dependency be discussed on its own
  rather than introduced as a side effect of a feature.
- **Bulk archive/restore.** No stated need.
- **Who archived a student.** `archived_at` records when, not by whom. Actor
  attribution belongs to a general auditing decision across all mutations.
- **Cascading archival.** Guardians, households, memberships, and attendance do
  not exist yet as related records.
- **Search and sort.** Adjacent URL-state work, deliberately separate.
