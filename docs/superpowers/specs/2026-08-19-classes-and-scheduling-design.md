# Classes and Scheduling — Design

## Context

The MVP scope in `CLAUDE.md` lists program enrollment as a tracked attribute of a
student, and lists class attendance as a later MVP capability. Neither a
`Program` nor a `Class` concept exists in the codebase yet — only `Student`.
This design introduces the first two: `Program` (the existing domain glossary
term) and `Class` (a recurring offering a student is assigned to), along with
the recurring weekly schedule a class meets on and the roster that assigns
students to it.

Explicitly out of scope for this pass: generating dated `ClassSession`
occurrences from the recurring schedule, and `AttendanceRecord`. Both require
a session-generation design of their own (materialization strategy, effective
date ranges) and are deferred to a follow-up design once this foundation
exists. Also out of scope: instructor assignment (instructor management is a
later phase per `CLAUDE.md`), enrollment capacity/waitlists, and multi-location
or timezone-aware scheduling.

## Decision

Add four tables — `programs`, `classes`, `class_schedule_days`,
`class_enrollments` — plus matching API resources and web UI, built bottom-up
in independently shippable slices.

### Data model

**`programs`**
- `id`, `name` (required), `description` (nullable)
- `archived_at`, `created_at`, `updated_at`
- Archived rather than deleted — a discontinued program may still be
  referenced by historical classes.

**`classes`**
- `id`, `program_id` (FK → `programs.id`, `RESTRICT`, required)
- `name` (required), `description` (nullable)
- `start_time`, `end_time` (plain `time`, no timezone — single-location
  school; the whole class shares one time range across all its meeting days)
- `archived_at`, `created_at`, `updated_at`

**`class_schedule_days`**
- `id`, `class_id` (FK → `classes.id`, `CASCADE`)
- `weekday` (0=Monday .. 6=Sunday)
- Unique on `(class_id, weekday)`
- A class can meet on more than one weekday (e.g. Tue + Thu); all meeting
  days share the one `start_time`/`end_time` on the parent class.
- No effective date range here. That only becomes meaningful once session
  generation exists (a schedule needs a start/end to know which occurrences
  to materialize) — adding it now would be speculative. Flagged as a known
  gap this follow-up design will need to fill, not an oversight.

**`class_enrollments`**
- `id`, `class_id` (FK → `classes.id`, `CASCADE`), `student_id` (FK →
  `students.id`, `CASCADE`)
- `enrolled_at`, `removed_at` (nullable)
- Partial unique index on `(class_id, student_id) WHERE removed_at IS NULL` —
  prevents double-enrollment while a student is active in a class, while
  still allowing re-enrollment history (a removed row plus a later active
  row for the same pair).
- Archiving a `Program` does **not** cascade-archive its `Class` rows, and
  archiving a `Class` does not remove its enrollments. Status changes stay
  explicit and local to the record they're made on — no hidden side effects.

### API

Mirrors the existing `students.py` conventions: `PATCH` for edits,
`POST /{id}/archive` and `POST /{id}/restore` for status transitions, list
endpoints default to a `status` query filter of `active`.

**Programs**
- `GET /programs` (filter: `status`)
- `POST /programs`
- `GET /programs/{id}`
- `PATCH /programs/{id}`
- `POST /programs/{id}/archive`
- `POST /programs/{id}/restore`

**Classes**
- `GET /classes` (filters: `status`, `program_id`)
- `POST /classes` — body includes `program_id`, `name`, `description`,
  `schedule: { weekdays: [int], start_time, end_time }`
- `GET /classes/{id}`
- `PATCH /classes/{id}` — replaces the weekday set wholesale rather than
  patching individual days; a schedule has no lifecycle independent of its
  class
- `POST /classes/{id}/archive`
- `POST /classes/{id}/restore`

**Roster**
- `GET /classes/{id}/roster` — active enrollments, each expanded with basic
  student info (`id`, `first_name`, `last_name`)
- `POST /classes/{id}/roster` — body `{ student_id }`; `409` if the student
  already has an active enrollment in this class
- `POST /classes/{id}/roster/{student_id}/remove` — sets `removed_at`

**Reverse lookup**
- `GET /students/{id}/classes` — a student's active enrollments, added now
  even without a UI consumer yet, for symmetry with the roster endpoint.

### Frontend

Students currently has no edit UI at all (row actions only expose
Archive/Restore; `PATCH` exists on the API but nothing calls it). Rather than
retrofit an edit affordance onto that create-only sidebar for Classes too,
editing and roster management get their own new page:

- **`/programs`** — mirrors the Students page: table (name, description,
  actions) + sidebar create form + status filter + archive/restore row
  actions. New "Programs" nav item.
- **`/classes`** — same list+create-sidebar+status-filter shape (table:
  name, program, schedule summary e.g. "Mon, Wed · 5:00–6:00 PM", actions).
  Row actions: Archive/Restore, plus "Manage" linking to the detail page.
  New "Classes" nav item.
- **`/classes/[id]`** — new detail page (first of its kind in the app): an
  edit form (name, program, description, weekday checkboxes, start/end time)
  pre-filled from the class, plus a roster section — active students with a
  "Remove" action, and a plain `<select>` of active, not-yet-enrolled
  students to add one. A search/autocomplete roster picker isn't justified
  at current student-list scale; revisit if the plain select becomes
  unusable.

### Testing

- Backend: fixtures/factories for all four models in `conftest.py`; API
  integration tests per resource covering CRUD, archive/restore, the
  double-enrollment `409`, the re-enrollment-after-removal case, and the
  "archiving a Program doesn't cascade-archive its Classes" rule explicitly.
- Frontend: component tests for the class form (weekday selection, time
  validation) and the roster add/remove interactions, following the existing
  `nav-sidebar.test.tsx` / `account-menu.test.tsx` pattern.

### Sequencing

Built bottom-up in independently shippable slices — each step lands and
works on its own before the next begins, consistent with the strangler-fig /
small-reversible-steps preference in `CLAUDE.md` and the existing
one-feature-per-PR history:

1. `Program` model + migration + API + tests
2. Programs UI + nav item
3. `Class` + `ClassScheduleDay` models + migration + API (schedule embedded
   in the class payload) + tests
4. Classes list UI + nav item
5. `ClassEnrollment` model + migration + API (roster endpoints +
   `GET /students/{id}/classes`) + tests
6. Classes detail page (edit form + roster UI)

## Alternatives considered

- **No `Program` table, class carries a free-text category instead.** Rejected:
  the domain glossary already defines Program as a first-class concept, and
  `Class.program_id` needs a real FK target for the `RESTRICT`/archival
  behavior to mean anything.
- **Single weekday/time slot per class (no `class_schedule_days` table).**
  Rejected: a "Tue/Thu Kids Beginner" class would have to be modeled as two
  separate `Class` rows, duplicating its identity and roster.
- **Weekdays stored as a Postgres array column on `classes` instead of a
  child table.** Viable, but a child table keeps per-day querying
  (`WHERE weekday = ...`) simple with an ordinary index, and matches the
  relational style already used elsewhere (e.g. `sessions` for auth).
- **Hard-delete on enrollment removal.** Rejected: loses the historical fact
  that a student was ever in a class, inconsistent with `archived_at` on
  `Student`.
- **Generate `ClassSession` rows in this pass.** Rejected: attendance and
  session materialization are large enough decisions (window size, timezone,
  regeneration on schedule change) to deserve their own design once this
  foundation is in place and actually needed.

## Consequences

- `CLAUDE.md`'s domain glossary gains an explicit definition for "Class" (the
  recurring offering) alongside the existing "Program" and "Class session"
  entries — that update is part of this work, not a separate task.
- Four new Alembic migrations, in the sequence above.
- No existing table or endpoint changes — this is purely additive.
- Follow-up work this unblocks: `ClassSession` generation from the recurring
  schedule, `AttendanceRecord`, and (separately) an edit-UI pattern for
  `Student` if that gap is ever worth closing.
