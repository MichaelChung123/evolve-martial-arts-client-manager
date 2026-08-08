# Student Archival and Archived Filter Implementation Plan

> **For agentic workers:** This plan is executed **inline**, in-session, under the
> Teaching Contract. `CLAUDE.md` disables `subagent-driven-development` and states
> "Never dispatch agents for implementation on your own initiative." Do not
> dispatch subagents for these tasks unless the user says "subagent mode".
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `Student` a reversible, auditable archival state, default the
roster to active students, and let staff filter to archived or all via a
shareable URL.

**Architecture:** A nullable `archived_at` timestamp on `students` (`NULL` =
active) drives a `status=active|archived|all` query parameter on
`GET /api/students`. Archive and restore become explicit `POST` action endpoints
replacing the current destructive `DELETE`. On the frontend the server page reads
`searchParams` and passes `status` down, so the filter control is plain `<Link>`s
with no client JavaScript and `StudentList` stays the only client component.

**Tech Stack:** FastAPI 0.139, SQLAlchemy 2.0, Alembic 1.18, Pydantic 2.13,
PostgreSQL 17, pytest 9.1 + httpx 0.28, Next.js 16 (App Router), React 19,
TanStack Query 5, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-07-31-student-archival-filter-design.md`

---

## How this plan differs from a standard writing-plans plan

Two instructions conflict here, and `CLAUDE.md` wins over the skill:

1. **writing-plans forbids placeholders and wants complete implementation code.**
   The Teaching Contract requires concept-critical code be left as `TODO(you):`
   markers. Resolution: every step is fully specific about *which file, which
   function, which behavior, and which question to answer*. Mechanical steps
   carry complete code. Concept-critical steps carry the requirement and the
   question — never the answer. That is a deliberate omission, not a placeholder.
2. **writing-plans recommends subagent-driven execution.** `CLAUDE.md` disables
   it. Execution is inline.

**Work split** (`CLAUDE.md` § Teaching Contract 2–3, and the teaching-mode design
doc line 51: *"The user writes the assertions; the agent writes fixtures and
scaffolding"*):

| Steps marked | Written by | Covers |
|---|---|---|
| **[agent]** | Claude | `conftest.py`, fixtures, factories, empty test blocks, Alembic migrations, imports, type declarations, route wiring, Tailwind markup, config |
| **[you]** | The user | Assertions, and any implementation exercising a Learning Objective — query predicates, transition logic, Pydantic schema design, Server/Client boundary decisions, TanStack Query keys and mutations |

Never write an assertion and its implementation in the same step.

## Global Constraints

- Package manager is **pnpm 11.13.0**. Never npm or yarn.
- Every schema change goes through an **Alembic migration**. Never alter the
  database by hand.
- Backend is the source of truth for authorization and validation.
- Do not use the word `client` in code where `Student`, `Guardian`, or
  `Household` is correct.
- Do not weaken types, linting, or tests to make a change pass.
- Synthetic test data only — never real student information.
- No new dependencies without justifying them first.
- `ruff` for Python lint, `mypy` for Python types, ESLint + Prettier for web.

## File Structure

**Backend — create:**

| File | Responsibility |
|---|---|
| `apps/api/tests/conftest.py` | Test engine, transactional session, `TestClient`, auth override, student factory |
| `apps/api/tests/test_students_filter.py` | `status` filter behavior on `GET /api/students` |
| `apps/api/tests/test_students_archive.py` | Archive/restore transitions and their edge cases |
| `apps/api/alembic/versions/<rev>_add_archived_at_to_students.py` | Adds the nullable column and its index |

**Backend — modify:**

| File | Change |
|---|---|
| `apps/api/app/models/student.py` | Add `archived_at` column |
| `apps/api/app/schemas/student.py` | Add `StudentStatusFilter`, add `archived_at` to `StudentResponse` |
| `apps/api/app/services/student_service.py` | `status` filter on `list_students`; add `archive_student` / `restore_student`; delete `delete_student` |
| `apps/api/app/api/routes/students.py` | `status` query param; `POST /{id}/archive` and `/{id}/restore`; remove `DELETE` |

**Frontend — create:**

| File | Responsibility |
|---|---|
| `apps/web/src/components/students/status-filter.tsx` | Server component; three `<Link>`s, no client JS |
| `apps/web/src/components/students/student-row-actions.tsx` | Client component; archive/restore mutations and confirmation |

**Frontend — modify:**

| File | Change |
|---|---|
| `apps/web/src/types/student.ts` | `archived_at` field, `StudentStatus` union |
| `apps/web/src/lib/students.ts` | `getStudents(status)`, `archiveStudent`, `restoreStudent` |
| `apps/web/src/app/page.tsx` | Await `searchParams`, normalize `status`, pass down |
| `apps/web/src/components/students/student-list.tsx` | `status` prop, query key, Archived badge, empty states |

---

## Task 1: Backend test harness ✅ DONE (`00ab59ec`)

Nothing can be tested until this exists — `apps/api/tests/` currently holds only
`__init__.py`. Entirely mechanical, so this task is **all agent**. Its deliverable
is a smoke test proving the harness works.

**The committed `apps/api/tests/conftest.py` is the source of truth**, not the
code block below. Four deviations from what was planned:

1. **Emails use `example.com`, not `example.test`.** RFC 2606 reserves `.test`
   as a special-use TLD and `email-validator` rejects it, so `EmailStr`
   response serialization failed on every student the factory produced. Caught
   by the added fixture test in Step 3.
2. **`make_student` does not default `archived_at`.** The column is nullable, so
   `**overrides` handles it once Task 2 lands. This removes the ordering hazard
   the original plan documented.
3. **`current_user` persists a real row** rather than returning a detached
   `User(id=1, …)`, so any code path calling `db.get(User, …)` behaves.
4. **Commands are `.venv/bin/…`.** `apps/api` has its own virtualenv and
   `package.json` scripts (`pnpm --filter api test|lint|typecheck`). There is no
   bare `pytest` on PATH.

**Files:**
- Create: `apps/api/tests/conftest.py`
- Create: `apps/api/tests/test_harness.py` (temporary; deleted in Task 3)

**Interfaces:**
- Consumes: nothing.
- Produces: fixtures `db_session: Session`, `client: TestClient`,
  `make_student(**overrides) -> Student`. Every later backend task uses these.

- [ ] **Step 1 [agent]: Create the test database**

The suite runs against real PostgreSQL, not SQLite — the model uses
`DateTime(timezone=True)` and `server_default=func.now()`, which SQLite does not
reproduce faithfully. Create a sibling database on the same server:

```bash
docker compose exec postgres createdb -U evolve evolve_test
```

- [ ] **Step 2 [agent]: Write `conftest.py`**

```python
import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_current_user
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.student import Student  # noqa: F401  (registers table metadata)
from app.models.session import UserSession  # noqa: F401
from app.models.user import User

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://evolve:evolve@localhost:5432/evolve_test",
)


@pytest.fixture(scope="session")
def engine():
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    Base.metadata.create_all(bind=engine)

    yield engine

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(engine) -> Generator[Session, None, None]:
    """One transaction per test, rolled back afterward, so tests never leak."""
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection, autoflush=False, autocommit=False)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def current_user() -> User:
    """A synthetic staff user. The students router sits behind get_current_user."""
    return User(id=1, email="staff@example.test", hashed_password="not-a-real-hash")


@pytest.fixture
def client(db_session: Session, current_user: User) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def make_student(db_session: Session):
    """Factory for synthetic students. Never use real student data."""
    counter = {"n": 0}

    def _make(**overrides) -> Student:
        counter["n"] += 1
        n = counter["n"]

        defaults = {
            "first_name": f"Test{n}",
            "last_name": "Student",
            "email": f"student{n}@example.test",
            "phone": None,
            "date_of_birth": None,
            "archived_at": None,
        }
        student = Student(**{**defaults, **overrides})

        db_session.add(student)
        db_session.commit()
        db_session.refresh(student)

        return student

    return _make
```

Note `make_student` already passes `archived_at`. That column does not exist
until Task 2, so the harness smoke test in Step 3 must not call the factory yet.

- [ ] **Step 3 [agent]: Write a smoke test**

```python
from fastapi.testclient import TestClient


def test_harness_boots_and_authenticates(client: TestClient) -> None:
    response = client.get("/api/students")

    assert response.status_code == 200
    assert response.json() == []
```

- [ ] **Step 4: Run it**

```bash
cd apps/api && .venv/bin/pytest tests/test_harness.py -v
```

Expected: PASS. A failure here is environmental (test database missing, Postgres
down), not a code defect — fix the environment before continuing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/tests/conftest.py apps/api/tests/test_harness.py
git commit -m "test: add backend test harness with transactional session fixtures"
```

---

## Task 2: `archived_at` column and migration ✅ DONE (`2e6f1488`)

Migration is `cd86d8f2f501_add_archived_at_to_students.py`. Autogenerate produced
exactly the expected `add_column` + `create_index` and nothing spurious, so no
hand-editing was needed and the generated filename already matched convention.
Round-trip verified against the dev database; both existing students survived as
active. Step 1 was written by the agent rather than left as `TODO(you)` — see the
note under Step 1.

**Files:**
- Modify: `apps/api/app/models/student.py`
- Create: `apps/api/alembic/versions/<rev>_add_archived_at_to_students.py`

**Interfaces:**
- Consumes: `make_student` from Task 1.
- Produces: `Student.archived_at: Mapped[datetime | None]`. Tasks 3–5 filter and
  mutate it.

- [ ] **Step 1 [you]: Add the column**

In `apps/api/app/models/student.py`, after `date_of_birth` and before
`created_at`:

```python
# TODO(you): add the archived_at column.
# The spec settled on a nullable timezone-aware timestamp, indexed.
# Question: why does `NULL` mean active here, rather than adding a
# second boolean to say whether the timestamp is meaningful?
```

This one is transcription rather than design — the exact column was agreed during
brainstorming and appears in the spec's Data model section. It stays yours because
`CLAUDE.md` §2 puts SQLAlchemy modeling on the concept-critical side, and the
question above is worth answering out loud before you move on.

- [ ] **Step 2 [agent]: Generate the migration**

```bash
cd apps/api && alembic revision --autogenerate -m "add archived_at to students"
```

Then read the generated file. Autogenerate is a starting point, not an authority —
confirm it produced exactly an `add_column` plus a `create_index`, and nothing
else. Rename the file to end `_add_archived_at_to_students.py` to match the
existing naming.

Expected `upgrade()` body:

```python
op.add_column(
    "students",
    sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
)
op.create_index(
    op.f("ix_students_archived_at"), "students", ["archived_at"], unique=False
)
```

- [ ] **Step 3: Verify the migration round-trips**

```bash
cd apps/api && alembic upgrade head && alembic downgrade -1 && alembic upgrade head
```

Expected: all three succeed. This is the migration verification `testing.md` asks
for on significant schema changes. Existing rows become `archived_at = NULL`,
meaning every current student stays active — confirm with:

```bash
docker compose exec postgres psql -U evolve -d evolve \
  -c "select count(*) filter (where archived_at is null) as active, count(*) as total from students;"
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/models/student.py apps/api/alembic/versions/
git commit -m "feat: add archived_at column to students"
```

---

## Task 3: Status filter on the student list ✅ DONE (`6ea820e9`)

Deviations: the service uses `match`/`case` with `typing.assert_never` rather
than sequential `if`s, so an unhandled future enum member is a mypy error rather
than a silent fallthrough (verified by deleting a case: errors went 7 → 8).
`test_pagination_composes_with_the_filter`'s fixture needed the archived student
to sort *first* (`last_name="Aardvark"`) — as originally scaffolded it sorted
last, so filter-then-paginate and paginate-then-filter returned identical rows
and the test could not fail. Two extra tests were added beyond the plan:
`test_active_student_reports_null_archived_at` and the pagination contents check.

`app/core/config.py` and `app/models/session.py` fail `ruff format --check` on
`main`. Pre-existing, unrelated, deliberately left alone.

**Files:**
- Modify: `apps/api/app/schemas/student.py`
- Modify: `apps/api/app/services/student_service.py`
- Modify: `apps/api/app/api/routes/students.py`
- Create: `apps/api/tests/test_students_filter.py`
- Delete: `apps/api/tests/test_harness.py`

**Interfaces:**
- Consumes: `client`, `make_student` from Task 1; `Student.archived_at` from Task 2.
- Produces: `StudentStatusFilter` (a `StrEnum` with members `ACTIVE`, `ARCHIVED`,
  `ALL` and values `"active"`, `"archived"`, `"all"`); `list_students(db, *,
  status: StudentStatusFilter = StudentStatusFilter.ACTIVE, offset: int = 0,
  limit: int = 100) -> list[Student]`. Task 6 consumes the wire format.

- [ ] **Step 1 [agent]: Write the empty test blocks**

Create `apps/api/tests/test_students_filter.py`:

```python
from fastapi.testclient import TestClient


def test_default_excludes_archived_students(client: TestClient, make_student) -> None:
    make_student(first_name="Active")
    make_student(first_name="Archived", archived_at=datetime(2026, 1, 1, tzinfo=UTC))

    response = client.get("/api/students")

    # TODO(you): assert only the active student comes back.


def test_status_archived_returns_only_archived(client: TestClient, make_student) -> None:
    make_student(first_name="Active")
    make_student(first_name="Archived", archived_at=datetime(2026, 1, 1, tzinfo=UTC))

    response = client.get("/api/students", params={"status": "archived"})

    # TODO(you): assert only the archived student comes back.


def test_status_all_returns_both(client: TestClient, make_student) -> None:
    make_student(first_name="Active")
    make_student(first_name="Archived", archived_at=datetime(2026, 1, 1, tzinfo=UTC))

    response = client.get("/api/students", params={"status": "all"})

    # TODO(you): assert both come back.


def test_invalid_status_is_rejected(client: TestClient) -> None:
    response = client.get("/api/students", params={"status": "bogus"})

    # TODO(you): which status code does FastAPI return for an invalid
    # enum query parameter — 400 or 422? Assert the one you expect,
    # then let the run tell you if you were right.


def test_pagination_composes_with_the_filter(client: TestClient, make_student) -> None:
    for index in range(3):
        make_student(last_name=f"Active{index}")
    make_student(last_name="Archived", archived_at=datetime(2026, 1, 1, tzinfo=UTC))

    response = client.get("/api/students", params={"limit": 2})

    # TODO(you): assert the limit applies to active students only,
    # not to a mixed set that was filtered afterward.


def test_response_exposes_archived_at(client: TestClient, make_student) -> None:
    make_student(first_name="Archived", archived_at=datetime(2026, 1, 1, tzinfo=UTC))

    response = client.get("/api/students", params={"status": "archived"})

    # TODO(you): assert archived_at is present and non-null in the payload.
```

Add the imports at the top: `from datetime import UTC, datetime`.

- [ ] **Step 2 [you]: Write the assertions**

Fill in every `TODO(you)` above. Assert on observable behavior — status codes and
response bodies — not on ORM internals.

- [ ] **Step 3: Run them and watch them fail**

```bash
cd apps/api && .venv/bin/pytest tests/test_students_filter.py -v
```

Expected: FAIL. At this point `status` is not a recognized parameter, so FastAPI
ignores it and every test returns all students. Confirm the failures are about
*wrong data*, not import errors — an import error means the test file is broken
rather than the feature being absent.

- [ ] **Step 4 [you]: Add `StudentStatusFilter` to `apps/api/app/schemas/student.py`**

```python
# TODO(you): define StudentStatusFilter.
# Question: StrEnum or Literal["active", "archived", "all"]? One of them
# gives you a named type you can import into the service layer and a
# self-documenting OpenAPI enum; the other is fewer lines. Which cost
# are you paying, and where does it show up?
```

- [ ] **Step 5 [you]: Add `archived_at` to `StudentResponse`**

```python
# TODO(you): add archived_at to StudentResponse.
# Question: it belongs on the response but not on StudentBase — what
# would break if you put it on the base that StudentCreate inherits?
```

- [ ] **Step 6 [you]: Apply the filter in `list_students`**

```python
# TODO(you): give list_students a keyword-only `status` parameter
# defaulting to active, and apply the predicate before offset/limit.
# Questions: why must the WHERE clause come before .offset()/.limit()
# rather than filtering the returned list? And why `.is_(None)` rather
# than `== None`?
```

- [ ] **Step 7 [agent]: Wire the route parameter**

In `apps/api/app/api/routes/students.py`, the signature becomes:

```python
@router.get("", response_model=list[StudentResponse])
def list_students(
    db: DatabaseSession,
    status: StudentStatusFilter = Query(default=StudentStatusFilter.ACTIVE),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
) -> list[StudentResponse]:
    return student_service.list_students(
        db,
        status=status,
        offset=offset,
        limit=limit,
    )
```

Add `StudentStatusFilter` to the existing `app.schemas.student` import.

Note the local name `status` now shadows the `fastapi.status` module inside this
function. The module is still used elsewhere in the file, so confirm `ruff` and
`mypy` stay clean — if shadowing bothers you, the parameter can be renamed with
an alias, which is a reasonable thing to raise at review.

- [ ] **Step 8: Run the tests until they pass**

```bash
cd apps/api && .venv/bin/pytest tests/test_students_filter.py -v
```

- [ ] **Step 9 [agent]: Delete the temporary harness test**

```bash
rm apps/api/tests/test_harness.py
```

Its job — proving the fixtures boot — is now done by real tests.

- [ ] **Step 10: Lint, type-check, commit**

```bash
cd apps/api && .venv/bin/ruff check app tests && .venv/bin/mypy app && .venv/bin/pytest -v
git add apps/api/
git commit -m "feat: filter students by archival status"
```

---

## Task 4: Archive and restore transitions ✅ DONE (`3c099cbf`)

Deviations: the 409 message branches on `existing_student.archived_at` and is
applied to **both** the create and update paths, not just create as planned — the
update path is currently untested. `archive_student` guards with an early return
rather than a conditional assignment. The timestamp comes from
`datetime.now(UTC)` (API server clock) rather than `func.now()` (database clock),
unlike `created_at` / `updated_at`; acceptable now, but the two columns have
different ordering guarantees under multiple API processes.

`mypy` baseline moved 7 → 9: the archive and restore routes follow the existing
annotate-response-model / return-ORM-object pattern. Same kind, not a new
problem. Later tasks should read their gate as 9, not 7.

**Files:**
- Modify: `apps/api/app/services/student_service.py`
- Modify: `apps/api/app/api/routes/students.py`
- Create: `apps/api/tests/test_students_archive.py`

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: `archive_student(db, student) -> Student`,
  `restore_student(db, student) -> Student`; routes
  `POST /api/students/{id}/archive` and `POST /api/students/{id}/restore`, both
  returning `200` with a `StudentResponse`. `delete_student` and the `DELETE`
  route are gone.

- [ ] **Step 1 [agent]: Write the empty test blocks**

Create `apps/api/tests/test_students_archive.py`:

```python
from datetime import UTC, datetime

from fastapi.testclient import TestClient


def test_archive_sets_the_timestamp(client: TestClient, make_student) -> None:
    student = make_student()

    response = client.post(f"/api/students/{student.id}/archive")

    # TODO(you): assert 200, and that archived_at is now non-null.


def test_archived_student_leaves_the_default_list(client: TestClient, make_student) -> None:
    student = make_student()
    client.post(f"/api/students/{student.id}/archive")

    response = client.get("/api/students")

    # TODO(you): assert the student is gone from the default listing.


def test_rearchiving_preserves_the_original_timestamp(client: TestClient, make_student) -> None:
    original = datetime(2026, 1, 1, tzinfo=UTC)
    student = make_student(archived_at=original)

    response = client.post(f"/api/students/{student.id}/archive")

    # TODO(you): assert 200 and that archived_at still equals the
    # original timestamp. This is the audit-trail rule from the spec —
    # a double-click must not rewrite history.


def test_restore_clears_the_timestamp(client: TestClient, make_student) -> None:
    student = make_student(archived_at=datetime(2026, 1, 1, tzinfo=UTC))

    response = client.post(f"/api/students/{student.id}/restore")

    # TODO(you): assert 200 and archived_at is null.


def test_restored_student_returns_to_the_default_list(client: TestClient, make_student) -> None:
    student = make_student(archived_at=datetime(2026, 1, 1, tzinfo=UTC))
    client.post(f"/api/students/{student.id}/restore")

    response = client.get("/api/students")

    # TODO(you): assert the student is listed again.


def test_restoring_an_active_student_is_a_no_op(client: TestClient, make_student) -> None:
    student = make_student()

    response = client.post(f"/api/students/{student.id}/restore")

    # TODO(you): assert 200 and archived_at is still null.


def test_archive_unknown_student_returns_404(client: TestClient) -> None:
    response = client.post("/api/students/999999/archive")

    # TODO(you): assert the status code.


def test_restore_unknown_student_returns_404(client: TestClient) -> None:
    response = client.post("/api/students/999999/restore")

    # TODO(you): assert the status code.


def test_archived_student_is_still_retrievable_by_id(client: TestClient, make_student) -> None:
    student = make_student(archived_at=datetime(2026, 1, 1, tzinfo=UTC))

    response = client.get(f"/api/students/{student.id}")

    # TODO(you): assert 200. Archival hides a student from the roster,
    # it does not make them unreachable.


def test_duplicate_email_conflicts_even_when_the_holder_is_archived(
    client: TestClient, make_student
) -> None:
    make_student(email="returning@example.test", archived_at=datetime(2026, 1, 1, tzinfo=UTC))

    response = client.post(
        "/api/students",
        json={"first_name": "Returning", "last_name": "Student", "email": "returning@example.test"},
    )

    # TODO(you): assert 409. The spec keeps the address reserved so a
    # re-enrolling student gets restored rather than duplicated.


def test_delete_endpoint_is_gone(client: TestClient, make_student) -> None:
    student = make_student()

    response = client.delete(f"/api/students/{student.id}")

    # TODO(you): assert 405 Method Not Allowed.
```

- [ ] **Step 2 [you]: Write the assertions**

- [ ] **Step 3: Run them and watch them fail**

```bash
cd apps/api && .venv/bin/pytest tests/test_students_archive.py -v
```

Expected: FAIL — the archive and restore routes return 404 because they do not
exist, and `test_delete_endpoint_is_gone` fails because `DELETE` still works.

- [ ] **Step 4 [you]: Write the service transitions**

Replace `delete_student` in `apps/api/app/services/student_service.py`:

```python
# TODO(you): write archive_student and restore_student, and delete
# delete_student entirely.
# Questions: where does the timestamp come from — Python's datetime.now
# or the database's now()? What does archive_student do when
# archived_at is already set, and which spec rule forces that answer?
```

- [ ] **Step 5 [agent]: Wire the routes**

In `apps/api/app/api/routes/students.py`, delete the entire `delete_student`
route and its `Response` import if now unused, then add:

```python
@router.post("/{student_id}/archive", response_model=StudentResponse)
def archive_student(
    student_id: int,
    db: DatabaseSession,
) -> StudentResponse:
    student = student_service.get_student(db, student_id)

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return student_service.archive_student(db, student)


@router.post("/{student_id}/restore", response_model=StudentResponse)
def restore_student(
    student_id: int,
    db: DatabaseSession,
) -> StudentResponse:
    student = student_service.get_student(db, student_id)

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return student_service.restore_student(db, student)
```

- [ ] **Step 6 [you]: Improve the duplicate-email message**

In the `create_student` route, the 409 detail currently reads "A student with
this email already exists."

```python
# TODO(you): make the message tell staff the blocking record is archived,
# so they know to restore rather than invent a new address.
# Question: this needs to know whether the conflicting student is
# archived — get_student_by_email already returns the row, so what is
# the smallest change that gets that fact into the message?
```

- [ ] **Step 7: Run the whole suite until it passes**

```bash
cd apps/api && .venv/bin/pytest -v
```

- [ ] **Step 8: Lint, type-check, commit**

```bash
cd apps/api && .venv/bin/ruff check app tests && .venv/bin/mypy app
git add apps/api/
git commit -m "feat: replace student deletion with archive and restore"
```

---

## Task 5: Frontend read path ✅ DONE (`3ed55db7`)

Deviations: the Archived badge renders whenever `archived_at` is set, not only
in the `all` view, so a row is never ambiguous regardless of how it was reached.
`page.tsx` still types `searchParams` as `Promise<{ status: StudentStatus }>` and
casts at both call sites; the honest type is `status?: string`, which would make
`normalizeStatus` earn its return type instead of asserting it. Left as-is —
runtime behavior is correct, but the casts are what allowed a real bug
(`current={params.status}`) to typecheck during development.

Verification note: no browser binary exists on this machine, so the agent
verified the API, the server-rendered filter markup, and the serialized RSC
props by HTTP; rendered rows, badges, no-reload navigation, and keyboard focus
were confirmed manually by the user at localhost:3000.

Dev-database seed used for verification: user `staff@example.com` and synthetic
student `Archived Example` (id 6). Not part of any migration or fixture.

No test runner exists in `apps/web` (out of scope per the spec), so this task
verifies manually in the browser.

**Files:**
- Modify: `apps/web/src/types/student.ts`
- Modify: `apps/web/src/lib/students.ts`
- Create: `apps/web/src/components/students/status-filter.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/components/students/student-list.tsx`

**Interfaces:**
- Consumes: `GET /api/students?status=` from Task 3.
- Produces: `StudentStatus = "active" | "archived" | "all"`;
  `getStudents(status: StudentStatus): Promise<Student[]>`;
  `<StatusFilter current={status} />`; `<StudentList status={status} />`.

- [ ] **Step 1 [agent]: Extend the types**

In `apps/web/src/types/student.ts`, add `archived_at: string | null` to
`Student` and export:

```typescript
export type StudentStatus = "active" | "archived" | "all";
```

- [ ] **Step 2 [agent]: Extend the API client**

In `apps/web/src/lib/students.ts`:

```typescript
export function getStudents(
  status: StudentStatus = "active",
): Promise<Student[]> {
  return apiRequest<Student[]>(`/api/students?status=${status}`);
}
```

Import `StudentStatus` alongside the existing type imports.

- [ ] **Step 3 [you]: Write `StatusFilter`**

Create `apps/web/src/components/students/status-filter.tsx`:

```tsx
// TODO(you): render three links — Active, Archived, All — that set
// ?status= in the URL.
// Questions: this file has no "use client" directive. What does that
// buy you, and what would you lose the moment you needed onClick?
// How does a screen-reader user learn which filter is active, given
// that .claude/rules/react-nextjs.md forbids signalling it with colour
// alone?
```

Tailwind classes matching the existing table styling: container
`"mb-4 flex gap-1 rounded-lg border border-zinc-200 p-1"`, each link
`"rounded-md px-3 py-1.5 text-sm font-medium"`, the current one adding
`"bg-zinc-950 text-white"` and the others `"text-zinc-600 hover:bg-zinc-100"`.

- [ ] **Step 4 [you]: Read `searchParams` in the page**

In `apps/web/src/app/page.tsx`:

```tsx
// TODO(you): make Home read searchParams, normalize status to one of
// the three literals, and pass it to StatusFilter and StudentList.
// Questions: in Next 16 searchParams is a Promise — what does that
// force about the function signature? An unknown value like
// ?status=purple should render the active roster rather than crash:
// where does that normalization belong, and why not inside StudentList?
```

- [ ] **Step 5 [you]: Take `status` in `StudentList`**

```tsx
// TODO(you): accept a status prop and include it in the query key.
// Question: with queryKey ["students", status], what happens when the
// user switches filters twice — does TanStack Query refetch, or serve
// the first result from cache? Which behavior do you want here?
```

- [ ] **Step 6 [agent]: Fix the empty states**

`StudentList`'s empty state currently always reads "No students yet / Add your
first student through the API documentation for now." That is wrong for two of
three filters. Replace the copy with a lookup keyed by status:

```tsx
const emptyStateCopy = {
  active: {
    heading: "No active students",
    body: "Add a student using the form, or check the archived filter.",
  },
  archived: {
    heading: "No archived students",
    body: "Students you archive will appear here.",
  },
  all: {
    heading: "No students yet",
    body: "Add your first student using the form.",
  },
} as const;
```

- [ ] **Step 7 [agent]: Show which students are archived**

In the `all` view an archived row needs a non-colour indicator. In the name cell,
after the student's name:

```tsx
{student.archived_at && (
  <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
    Archived
  </span>
)}
```

- [ ] **Step 8: Verify in the browser**

```bash
pnpm turbo dev
```

Check each of these by hand:
- `/` shows only active students.
- `/?status=archived` shows only archived students.
- `/?status=all` shows both, with badges on the archived ones.
- `/?status=purple` falls back to the active roster without crashing.
- Reloading `/?status=archived` keeps the filter — this is the payoff of URL state.
- Tab to the filter links and confirm focus is visible and the current one is announced.

- [ ] **Step 9: Lint, type-check, commit**

```bash
pnpm --filter web lint && pnpm --filter web exec tsc --noEmit
git add apps/web/
git commit -m "feat: filter the student list by archival status"
```

---

## Task 6: Frontend write path

**Files:**
- Modify: `apps/web/src/lib/students.ts`
- Create: `apps/web/src/components/students/student-row-actions.tsx`
- Modify: `apps/web/src/components/students/student-list.tsx`

**Interfaces:**
- Consumes: the archive/restore endpoints from Task 4.
- Produces: `<StudentRowActions student={student} />`.

- [ ] **Step 1 [agent]: Add the API calls**

```typescript
export function archiveStudent(studentId: number): Promise<Student> {
  return apiRequest<Student>(`/api/students/${studentId}/archive`, {
    method: "POST",
  });
}

export function restoreStudent(studentId: number): Promise<Student> {
  return apiRequest<Student>(`/api/students/${studentId}/restore`, {
    method: "POST",
  });
}
```

- [ ] **Step 2 [agent]: Add an actions column**

In `StudentList`, add a `<th className="px-4 py-3 text-sm font-semibold">Actions</th>`
to the header row and a matching `<td className="px-4 py-3">` in the body
rendering `<StudentRowActions student={student} />`.

- [ ] **Step 3 [you]: Write `StudentRowActions`**

```tsx
// TODO(you): a client component showing Archive for an active student
// and Restore for an archived one, wired to useMutation.
// Questions: which query key do you invalidate so that every status
// variant refreshes — and why does ["students"] cover ["students",
// "archived"]? Archiving is reversible here, so is a confirmation
// dialog still warranted, and does restore need one too? While a
// mutation is in flight, what does the button say and can it be
// clicked twice?
```

`security-privacy.md` asks for confirmation on destructive or hard-to-reverse
actions; `react-nextjs.md` asks for explicit loading, error, and disabled states.
Both apply.

- [ ] **Step 4: Verify in the browser**

- Archiving from the active list removes the row.
- The student appears under `?status=archived`.
- Restoring returns them to the active list.
- Double-clicking Archive does not produce two requests or move the timestamp.
- A failed request surfaces an error rather than failing silently — test by
  stopping the API and clicking Archive.
- The confirmation is reachable and dismissible by keyboard.

- [ ] **Step 5: Full verification and commit**

```bash
cd apps/api && .venv/bin/ruff check app tests && .venv/bin/mypy app && .venv/bin/pytest -v
pnpm --filter web lint && pnpm --filter web exec tsc --noEmit
git add apps/web/
git commit -m "feat: archive and restore students from the roster"
```

---

## Task 7: Close the loop

- [ ] **Step 1: Update the spec's status header**

Change the `Status:` line in
`docs/superpowers/specs/2026-07-31-student-archival-filter-design.md` from
"Approved, not yet implemented" to record the implementing branch, and add a
"Deviations applied during implementation" section for anything that changed —
following the precedent set by the teaching-mode spec.

- [ ] **Step 2: Open the pull request**

```bash
git push -u origin HEAD
gh pr create --base main --title "feat: archive students and filter the roster by status"
```

Complete the `.github/pull_request_template.md` checklist honestly. Backend lint,
types, and tests all have real commands; the frontend has no test suite, so say
that rather than ticking the box.

- [ ] **Step 3: Verification step 6 for the teaching-mode branch**

That branch merged with its Verification step 6 outstanding — "request a small
feature and confirm the response explains first, produces a skeleton with
`TODO(you)` markers, and does not write the concept-critical parts." This feature
is that test. Record the result.

---

## Self-review

**Spec coverage.** Data model → Task 2. Email uniqueness → Task 4 Step 6, tested
in Task 4. API contract and `status` param → Task 3. Transition semantics
including idempotency and 404s → Task 4. Breaking changes: default-excludes-archived
tested in Task 3, `DELETE` removal tested in Task 4. Frontend `searchParams`,
`StatusFilter`, query key, badge, empty states → Task 5. Row actions and
confirmation → Task 6. Testing section → Tasks 1, 3, 4. Out-of-scope items appear
nowhere, as intended.

**Placeholder scan.** The `TODO(you)` markers are contract-mandated deliberate
omissions, each naming a specific file, function, and question. No "TBD", no "add
error handling", no "similar to Task N".

**Type consistency.** `StudentStatusFilter` (backend enum) and `StudentStatus`
(frontend union) are deliberately different names for the two sides of the wire;
both carry the values `active` / `archived` / `all`. `archived_at` is spelled
identically in the model, schema, TypeScript type, and JSON. `archive_student` /
`restore_student` match between service, routes, and tests. `make_student` passes
`archived_at`, which is why Task 1's smoke test avoids the factory.

**Ordering constraint — resolved during Task 1.** The original plan had
`make_student` defaulting `archived_at`, which would not exist until Task 2. The
implemented factory omits it and relies on `**overrides` instead, so the fixtures
work before and after Task 2 and the tasks can be run in any order.

**Pre-existing mypy failures.** `mypy app` reports 7 errors on `main` — routes
annotated `-> StudentResponse` / `-> UserResponse` that return ORM objects for
FastAPI to serialize (`students.py:107`, `auth.py:52,77,99`, and 3 more). They
are unrelated to this feature. Tasks 3, 4, and 6 gate on `mypy app`; that gate
means **no new errors**, not zero errors, until someone fixes the pattern
separately. Note also that `mypy app` does not check `tests/`, so `conftest.py`
is unverified by the type checker.
