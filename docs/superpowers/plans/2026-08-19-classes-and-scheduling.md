# Classes and Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This repository's `CLAUDE.md` overrides the recommendation above.** `subagent-driven-development` is disabled by default here — the Teaching Contract requires the human to write concept-critical code in-session, which a subagent cannot do on their behalf. Execute this plan with `superpowers:executing-plans` inline in conversation, respecting the write-split in "Teaching Contract Application" below, unless the user has said "subagent mode."

**Goal:** Add `Program` and `Class` as new domain concepts — a recurring weekly schedule per class and a student roster — with full API and web UI, per the approved design.

**Architecture:** Four new, purely-additive tables (`programs`, `classes`, `class_schedule_days`, `class_enrollments`) built bottom-up in six independently-shippable slices: Program backend, Programs UI, Class+Schedule backend, Classes UI, Enrollment backend, Classes detail UI (edit + roster). Each backend slice follows the existing `Student` resource's layering (model → migration → schema → service → routes) and archive/restore convention; each frontend slice follows the existing Students page's list+sidebar-form pattern.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, pytest (backend); Next.js App Router, TanStack Query, React Hook Form, Zod, Vitest (frontend); PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-08-19-classes-and-scheduling-design.md`

## Global Constraints

- pnpm is the only package manager; run frontend commands as `pnpm --dir apps/web <script>`.
- Backend commands run from `apps/api` using the project's venv: `.venv/bin/pytest`, `.venv/bin/ruff check app tests`, `.venv/bin/ruff format app tests`, `.venv/bin/mypy app`, `.venv/bin/alembic revision --autogenerate -m "<message>"`, `.venv/bin/alembic upgrade head`.
- All API routes are registered under the `/api` prefix (see `app/main.py`).
- No hard deletes. Every resource uses the `archived_at` + `POST /{id}/archive` + `POST /{id}/restore` convention already established by `Student`.
- `start_time`/`end_time` are timezone-naive (`datetime.time`) — single-location school, no timezone handling needed.
- No `ClassSession`, `AttendanceRecord`, instructor field, or enrollment capacity in this plan — explicitly deferred per the spec.
- Archiving a `Program` never cascades to its `Class` rows. Archiving a `Class` never removes its enrollments. Status changes stay local to the record they're made on.
- `class_enrollments` needs a **partial unique index** on `(class_id, student_id) WHERE removed_at IS NULL` — this is the mechanism that prevents double-enrollment while still allowing re-enrollment history.
- Test database: `TEST_DATABASE_URL` env var, defaults to `postgresql+psycopg://evolve:evolve@localhost:5432/evolve_test`. Postgres must be running (`pnpm db:up`).
- Each task is developed on its own short-lived branch off `main` (`feature/<slug>`, per `CONTRIBUTING.md`) and merged via PR before the next task begins.

## Teaching Contract Application

Per `CLAUDE.md`'s Teaching Contract and the user's framing when this plan was requested:

**The assistant writes, in full, in every task:** file/module scaffolding and imports, Alembic migrations (generated from the human-authored model), pytest fixtures/factories and test *stubs* (signature + fixtures wired up, no assertion), FastAPI route wiring and service-layer bodies, `main.py`/`app/models/__init__.py` registration, TypeScript types, frontend API client functions (`lib/*.ts`), nav wiring, and the JSX/Tailwind markup and hook wiring (`useForm`/`useMutation`) in components — all of it follows an established pattern already in this codebase (`Student`), so it isn't new learning to replicate it.

**The human writes, left as `// TODO(you):` / `# TODO(you):` comments with one specific question each, never pre-solved by the assistant:** SQLAlchemy model column/relationship/constraint definitions, Pydantic schema field and validator definitions, Zod schema field and validator definitions, and every test assertion.

Within each task, the model (if any) is written before its test stubs, since fixtures need real columns to construct instances against — read "tests first" here as "the test is written before the service/route logic it exercises," not "before the data model exists."

---

## Task 1: Program backend

**Files:**
- Create: `apps/api/app/models/program.py`
- Modify: `apps/api/app/models/__init__.py`
- Create: `apps/api/alembic/versions/<generated>_create_programs_table.py`
- Create: `apps/api/app/schemas/program.py`
- Create: `apps/api/app/services/program_service.py`
- Create: `apps/api/app/api/routes/programs.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/tests/conftest.py`
- Create: `apps/api/tests/test_programs.py`

**Interfaces:**
- Produces: `Program` model (`app.models.program.Program`) with fields `id: int`, `name: str`, `description: str | None`, `archived_at: datetime | None`, `created_at: datetime`, `updated_at: datetime`.
- Produces: `app.schemas.program.ProgramStatusFilter(StrEnum)` (`ACTIVE`/`ARCHIVED`/`ALL`), `ProgramBase`, `ProgramCreate`, `ProgramUpdate`, `ProgramResponse`.
- Produces: `app.services.program_service.list_programs(db, *, status=ProgramStatusFilter.ACTIVE, offset=0, limit=100) -> list[Program]`, `get_program(db, program_id) -> Program | None`, `create_program(db, data: ProgramCreate) -> Program`, `update_program(db, program, data: ProgramUpdate) -> Program`, `archive_program(db, program) -> Program`, `restore_program(db, program) -> Program`.
- Produces: routes `GET/POST /api/programs`, `GET/PATCH /api/programs/{program_id}`, `POST /api/programs/{program_id}/archive`, `POST /api/programs/{program_id}/restore`.
- Produces: `make_program` pytest fixture in `conftest.py` — `Callable[..., Program]`, factory pattern matching `make_student`.
- Consumes: nothing new — this is the first task.

### Step 1: Scaffold the Program model with a TODO(you) for its columns

Create `apps/api/app/models/program.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Program(Base):
    __tablename__ = "programs"

    # TODO(you): define the columns per the spec:
    #   id            primary key
    #   name          required string, e.g. max_length 100
    #   description   optional string
    #   archived_at   nullable timestamptz, indexed (mirrors Student.archived_at)
    #   created_at    timestamptz, server_default=func.now()
    #   updated_at    timestamptz, server_default=func.now(), onupdate=func.now()
    # Look at apps/api/app/models/student.py for the exact Mapped/mapped_column
    # style already used in this codebase.
    ...
```

- [ ] **Step 1: Write the file above, then fill in the TODO(you) columns**

### Step 2: Register the model

Modify `apps/api/app/models/__init__.py`:

```python
from app.models.program import Program
from app.models.session import UserSession
from app.models.student import Student
from app.models.user import User

__all__ = ["Program", "Student", "UserSession", "User"]
```

- [ ] **Step 2: Update `apps/api/app/models/__init__.py` as above**

### Step 3: Generate and review the migration

- [ ] **Step 3a:** Run from `apps/api`:
```bash
.venv/bin/alembic revision --autogenerate -m "create programs table"
```
- [ ] **Step 3b:** Open the generated file in `apps/api/alembic/versions/`. Confirm `upgrade()` creates a `programs` table with the columns from Step 1, and `downgrade()` drops it. This is generated directly from your model, so if a column looks wrong, fix the model (Step 1) and regenerate rather than hand-editing the migration.
- [ ] **Step 3c:** Run:
```bash
.venv/bin/alembic upgrade head
```
Expected: migration applies with no errors.

### Step 4: Add the `make_program` fixture

Modify `apps/api/tests/conftest.py` — add below `make_student`:

```python
from app.models.program import Program


@pytest.fixture
def make_program(db_session: Session) -> Callable[..., Program]:
    """Factory for synthetic programs."""
    counter = {"n": 0}

    def _make(**overrides: object) -> Program:
        counter["n"] += 1
        n = counter["n"]

        defaults: dict[str, object] = {
            "name": f"Test Program {n}",
            "description": None,
        }
        program = Program(**{**defaults, **overrides})

        db_session.add(program)
        db_session.commit()
        db_session.refresh(program)

        return program

    return _make
```

Also add `from app.models.program import Program` to the existing import block near the top (alongside the `Student`/`User` imports), and remove the inline import shown above if you'd rather keep all imports together — match the file's existing style.

- [ ] **Step 4: Add the fixture and import as above**

### Step 5: Write failing test stubs

Create `apps/api/tests/test_programs.py`:

```python
"""CRUD and archive/restore behavior for programs."""

from collections.abc import Callable
from datetime import UTC, datetime

import pytest
from app.models.program import Program
from fastapi.testclient import TestClient

ARCHIVED_ON = datetime(2026, 1, 1, tzinfo=UTC)
MISSING_PROGRAM_ID = 999999


def test_create_program_returns_the_program(client: TestClient) -> None:
    # TODO(you): POST /api/programs with a name (and optionally a
    # description). Assert the response status code and that the response
    # body echoes the name back.
    pytest.fail("TODO(you): write the assertion")


def test_creating_a_program_without_a_name_is_rejected(client: TestClient) -> None:
    # TODO(you): POST /api/programs with an empty JSON body. What status
    # code should a missing required field produce?
    pytest.fail("TODO(you): write the assertion")


def test_list_programs_defaults_to_active(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): create one active and one archived program, then GET
    # /api/programs with no query params. Assert only the active one comes
    # back.
    pytest.fail("TODO(you): write the assertion")


def test_list_programs_can_include_archived(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): same setup as above, but GET /api/programs?status=all.
    # Assert both programs come back.
    pytest.fail("TODO(you): write the assertion")


def test_get_unknown_program_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/programs/{MISSING_PROGRAM_ID}")

    assert response.status_code == 404


def test_update_program_changes_the_name(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): PATCH a program's name and assert the response reflects
    # the change.
    pytest.fail("TODO(you): write the assertion")


def test_archive_sets_the_timestamp(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): mirror test_archive_sets_the_timestamp in
    # test_students_archive.py, adapted for /api/programs.
    pytest.fail("TODO(you): write the assertion")


def test_rearchiving_preserves_the_original_timestamp(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): a program archived at ARCHIVED_ON, then archived again via
    # the API — the timestamp must not change. Why does this rule exist?
    pytest.fail("TODO(you): write the assertion")


def test_restore_clears_the_timestamp(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    pytest.fail("TODO(you): write the assertion")


def test_archive_unknown_program_returns_404(client: TestClient) -> None:
    response = client.post(f"/api/programs/{MISSING_PROGRAM_ID}/archive")

    assert response.status_code == 404
```

- [ ] **Step 5: Write the file above**
- [ ] **Step 6: Run `.venv/bin/pytest tests/test_programs.py -v` — expect every non-404 test to FAIL** (the `pytest.fail` calls fail on purpose; the two 404 tests will fail too, with a 404-route-not-found-shaped error, since no route exists yet)

### Step 7: Write the assertions

- [ ] **Step 7: Replace each `pytest.fail(...)` in `test_programs.py` with a real assertion**, per its TODO(you) comment.

### Step 8: Scaffold the Pydantic schemas with a TODO(you) for validation

Create `apps/api/app/schemas/program.py`:

```python
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class ProgramStatusFilter(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    ALL = "all"


# TODO(you): define ProgramBase, ProgramCreate, ProgramUpdate, and
# ProgramResponse, following the shape of apps/api/app/schemas/student.py:
#   - ProgramBase: name (required, 1-100 chars), description (optional)
#   - ProgramCreate(ProgramBase): no extra fields
#   - ProgramUpdate: every field optional, so a PATCH can send a subset
#   - ProgramResponse(ProgramBase): id, archived_at, created_at, updated_at,
#     with ConfigDict(from_attributes=True) so it can serialize a Program
#     ORM instance directly
...
```

- [ ] **Step 8: Write the file above, then fill in the TODO(you) schemas**

### Step 9: Write the service layer

Create `apps/api/app/services/program_service.py`:

```python
from datetime import UTC, datetime
from typing import assert_never

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.program import Program
from app.schemas.program import ProgramCreate, ProgramStatusFilter, ProgramUpdate


def list_programs(
    db: Session,
    *,
    offset: int = 0,
    limit: int = 100,
    status: ProgramStatusFilter = ProgramStatusFilter.ACTIVE,
) -> list[Program]:
    statement = select(Program).order_by(Program.name)

    match status:
        case ProgramStatusFilter.ACTIVE:
            statement = statement.where(Program.archived_at.is_(None))
        case ProgramStatusFilter.ARCHIVED:
            statement = statement.where(Program.archived_at.is_not(None))
        case ProgramStatusFilter.ALL:
            pass
        case _:
            assert_never(status)

    statement = statement.offset(offset).limit(limit)

    return list(db.scalars(statement).all())


def get_program(db: Session, program_id: int) -> Program | None:
    return db.get(Program, program_id)


def create_program(db: Session, program_data: ProgramCreate) -> Program:
    program = Program(**program_data.model_dump())

    db.add(program)
    db.commit()
    db.refresh(program)

    return program


def update_program(
    db: Session,
    program: Program,
    program_data: ProgramUpdate,
) -> Program:
    changes = program_data.model_dump(exclude_unset=True)

    for field, value in changes.items():
        setattr(program, field, value)

    db.add(program)
    db.commit()
    db.refresh(program)

    return program


def archive_program(db: Session, program: Program) -> Program:
    if program.archived_at is not None:
        return program

    program.archived_at = datetime.now(UTC)
    db.add(program)
    db.commit()
    db.refresh(program)
    return program


def restore_program(db: Session, program: Program) -> Program:
    program.archived_at = None
    db.add(program)
    db.commit()
    db.refresh(program)
    return program
```

- [ ] **Step 9: Write the file above**

### Step 10: Write the routes

Create `apps/api/app/api/routes/programs.py`:

```python
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.program import (
    ProgramCreate,
    ProgramResponse,
    ProgramStatusFilter,
    ProgramUpdate,
)
from app.services import program_service

router = APIRouter(
    prefix="/programs", tags=["Programs"], dependencies=[Depends(get_current_user)]
)

DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ProgramResponse])
def list_programs(
    db: DatabaseSession,
    status: ProgramStatusFilter = Query(default=ProgramStatusFilter.ACTIVE),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
) -> list[ProgramResponse]:
    return program_service.list_programs(db, status=status, offset=offset, limit=limit)


@router.get("/{program_id}", response_model=ProgramResponse)
def get_program(program_id: int, db: DatabaseSession) -> ProgramResponse:
    program = program_service.get_program(db, program_id)

    if program is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")

    return program


@router.post("", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(program_data: ProgramCreate, db: DatabaseSession) -> ProgramResponse:
    return program_service.create_program(db, program_data)


@router.patch("/{program_id}", response_model=ProgramResponse)
def update_program(
    program_id: int,
    program_data: ProgramUpdate,
    db: DatabaseSession,
) -> ProgramResponse:
    program = program_service.get_program(db, program_id)

    if program is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")

    return program_service.update_program(db, program, program_data)


@router.post("/{program_id}/archive", response_model=ProgramResponse)
def archive_program(program_id: int, db: DatabaseSession) -> ProgramResponse:
    program = program_service.get_program(db, program_id)

    if program is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")

    return program_service.archive_program(db, program)


@router.post("/{program_id}/restore", response_model=ProgramResponse)
def restore_program(program_id: int, db: DatabaseSession) -> ProgramResponse:
    program = program_service.get_program(db, program_id)

    if program is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")

    return program_service.restore_program(db, program)
```

- [ ] **Step 10: Write the file above**

### Step 11: Register the router

Modify `apps/api/app/main.py`:

```python
from app.api.routes.programs import router as programs_router
```

and add, alongside the other `include_router` calls:

```python
app.include_router(programs_router, prefix="/api")
```

- [ ] **Step 11: Update `apps/api/app/main.py` as above**

### Step 12: Run tests, lint, and typecheck

- [ ] **Step 12a:** Run `.venv/bin/pytest tests/test_programs.py -v` from `apps/api` — expect all PASS.
- [ ] **Step 12b:** Run `.venv/bin/ruff check app tests` and `.venv/bin/ruff format --check app tests` — fix anything flagged.
- [ ] **Step 12c:** Run `.venv/bin/mypy app` — fix any type errors.

### Step 13: Commit

```bash
git add apps/api/app/models/program.py apps/api/app/models/__init__.py \
  apps/api/alembic/versions/ apps/api/app/schemas/program.py \
  apps/api/app/services/program_service.py apps/api/app/api/routes/programs.py \
  apps/api/app/main.py apps/api/tests/conftest.py apps/api/tests/test_programs.py
git commit -m "feat: add Program model and API"
```

- [ ] **Step 13: Commit as above**

---

## Task 2: Programs UI

**Files:**
- Create: `apps/web/src/types/program.ts`
- Create: `apps/web/src/lib/programs.ts`
- Create: `apps/web/src/schemas/program.ts`
- Create: `apps/web/src/components/programs/status-filter.tsx`
- Create: `apps/web/src/components/programs/program-form.tsx`
- Create: `apps/web/src/components/programs/program-list.tsx`
- Create: `apps/web/src/components/programs/program-row-actions.tsx`
- Create: `apps/web/src/app/(app)/programs/page.tsx`
- Modify: `apps/web/src/components/layout/nav/nav-items.ts`
- Modify: `apps/web/src/components/layout/nav/nav-icons.tsx`
- Create: `apps/web/src/components/programs/program-list.test.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/programs`, `GET/PATCH /api/programs/{id}`, `POST /api/programs/{id}/archive`, `POST /api/programs/{id}/restore` (Task 1).
- Produces: `Program`, `ProgramStatus`, `CreateProgramInput` types; `getPrograms`, `getProgram`, `createProgram`, `archiveProgram`, `restoreProgram` in `lib/programs.ts`; a `NavIconKey` value `"layers"`.

### Step 1: Types

Create `apps/web/src/types/program.ts`:

```typescript
export type ProgramStatus = "active" | "archived" | "all";

export type Program = {
  id: number;
  name: string;
  description: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProgramInput = {
  name: string;
  description: string | null;
};
```

- [ ] **Step 1: Write the file above**

### Step 2: API client

Create `apps/web/src/lib/programs.ts`:

```typescript
import { apiRequest } from "@/lib/api";
import type { CreateProgramInput, Program, ProgramStatus } from "@/types/program";

export function getPrograms(status: ProgramStatus = "active"): Promise<Program[]> {
  return apiRequest<Program[]>(`/api/programs?status=${status}`);
}

export function getProgram(programId: number): Promise<Program> {
  return apiRequest<Program>(`/api/programs/${programId}`);
}

export function createProgram(program: CreateProgramInput): Promise<Program> {
  return apiRequest<Program>("/api/programs", {
    method: "POST",
    body: JSON.stringify(program),
  });
}

export function archiveProgram(programId: number): Promise<Program> {
  return apiRequest<Program>(`/api/programs/${programId}/archive`, { method: "POST" });
}

export function restoreProgram(programId: number): Promise<Program> {
  return apiRequest<Program>(`/api/programs/${programId}/restore`, { method: "POST" });
}
```

- [ ] **Step 2: Write the file above**

### Step 3: Zod schema with a TODO(you)

Create `apps/web/src/schemas/program.ts`:

```typescript
import { z } from "zod";

// TODO(you): define createProgramSchema, following
// apps/web/src/schemas/student.ts's pattern:
//   - name: required, trimmed, 1-100 characters
//   - description: optional text (trim empty string to null, like
//     `optionalText` does in schemas/student.ts)
// Then export CreateProgramFormValues (z.input<...>) and
// CreateProgramValues (z.output<...>), matching student.ts's naming.
...
```

- [ ] **Step 3: Write the file above, then fill in the TODO(you) schema**

### Step 4: Status filter component

Create `apps/web/src/components/programs/status-filter.tsx`:

```typescript
import type { ProgramStatus } from "@/types/program";
import Link from "next/link";

const options: { value: ProgramStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const containerClassName = "mb-4 flex gap-1 rounded-lg border border-zinc-200 p-1";

const optionClassName = "rounded-md px-3 py-1.5 text-sm font-medium";

const currentOptionClassName = "bg-zinc-950 text-white";

const otherOptionClassName = "text-zinc-600 hover:bg-zinc-100";

export function StatusFilter({ current }: { current: ProgramStatus }) {
  return (
    <div className={containerClassName}>
      {options.map((option) => {
        const isCurrent = option.value === current;
        const className = [
          optionClassName,
          isCurrent ? currentOptionClassName : otherOptionClassName,
        ].join(" ");

        return (
          <Link
            key={option.value}
            href={`?status=${option.value}`}
            className={className}
            aria-current={isCurrent ? "page" : undefined}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Write the file above**

### Step 5: Program form (create)

Create `apps/web/src/components/programs/program-form.tsx`:

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { createProgram } from "@/lib/programs";
import {
  createProgramSchema,
  type CreateProgramFormValues,
  type CreateProgramValues,
} from "@/schemas/program";

export function ProgramForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProgramFormValues, unknown, CreateProgramValues>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createProgram,
    onSuccess: async () => {
      reset();

      await queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });

  async function onSubmit(values: CreateProgramValues) {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setError("root", {
        type: "server",
        message: error instanceof Error ? error.message : "Unable to create program",
      });
    }
  }

  const fieldClassName =
    "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  const errorClassName = "mt-1 text-sm text-red-700";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-950">Add program</h2>

        <p className="mt-1 text-sm text-zinc-600">
          Name a training program students can be grouped under.
        </p>
      </div>

      <div className="grid gap-5">
        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Name</span>

          <input {...register("name")} className={fieldClassName} />

          {errors.name && <p className={errorClassName}>{errors.name.message}</p>}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Description</span>

          <textarea {...register("description")} rows={3} className={fieldClassName} />

          {errors.description && (
            <p className={errorClassName}>{errors.description.message}</p>
          )}
        </label>
      </div>

      {errors.root && (
        <div className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

      {mutation.isSuccess && (
        <div className="mt-5 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Program created successfully.
        </div>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Creating..." : "Create program"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Write the file above**

### Step 6: Program list + row actions

Create `apps/web/src/components/programs/program-row-actions.tsx`:

```tsx
"use client";

import { archiveProgram, restoreProgram } from "@/lib/programs";
import type { Program } from "@/types/program";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const buttonClassName =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50";

const errorClassName = "mt-1 text-sm text-red-700";

export function ProgramRowActions({ program }: { program: Program }) {
  const queryClient = useQueryClient();

  const { isError, isPending, error, mutate } = useMutation({
    mutationFn: async (shouldArchive: boolean) => {
      if (shouldArchive) {
        return archiveProgram(program.id);
      } else {
        return restoreProgram(program.id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={buttonClassName}
        disabled={isPending}
        onClick={() => mutate(!program.archived_at)}
      >
        {program.archived_at ? "Restore" : "Archive"}
      </button>

      {isError && (
        <p className={errorClassName}>
          {error instanceof Error ? error.message : "An error occurred"}
        </p>
      )}
    </div>
  );
}
```

Create `apps/web/src/components/programs/program-list.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";

import { ProgramRowActions } from "@/components/programs/program-row-actions";
import { getPrograms } from "@/lib/programs";
import { ProgramStatus } from "@/types/program";

const emptyStateCopy: Record<ProgramStatus, { heading: string; body: string }> = {
  active: {
    heading: "No active programs",
    body: "Add a program using the form, or check the archived filter.",
  },
  archived: {
    heading: "No archived programs",
    body: "Programs you archive will appear here.",
  },
  all: {
    heading: "No programs yet",
    body: "Add your first program using the form.",
  },
};

export function ProgramList({ status }: { status: ProgramStatus }) {
  const {
    data: programs,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["programs", status],
    queryFn: () => getPrograms(status),
  });

  if (isPending) {
    return <p className="text-sm text-zinc-600">Loading programs...</p>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="font-medium text-red-900">Unable to load programs</p>

        <p className="mt-1 text-sm text-red-700">{error.message}</p>

        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (programs.length === 0) {
    const { heading, body } = emptyStateCopy[status];

    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
        <h2 className="font-semibold text-zinc-900">{heading}</h2>

        <p className="mt-2 text-sm text-zinc-600">{body}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full border-collapse text-left">
        <thead className="bg-zinc-100">
          <tr>
            <th className="px-4 py-3 text-sm font-semibold">Name</th>
            <th className="px-4 py-3 text-sm font-semibold">Description</th>
            <th className="px-4 py-3 text-sm font-semibold">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200">
          {programs.map((program) => (
            <tr key={program.id}>
              <td className="px-4 py-3">
                {program.name}

                {program.archived_at && (
                  <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    Archived
                  </span>
                )}
              </td>

              <td className="px-4 py-3 text-sm text-zinc-600">
                {program.description ?? "—"}
              </td>

              <td className="px-4 py-3">
                <ProgramRowActions program={program} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Write both files above**

### Step 7: Programs page

Create `apps/web/src/app/(app)/programs/page.tsx`:

```tsx
import { ProgramForm } from "@/components/programs/program-form";
import { ProgramList } from "@/components/programs/program-list";
import { StatusFilter } from "@/components/programs/status-filter";
import { ProgramStatus } from "@/types/program";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const normalizeStatus = (status?: string): ProgramStatus => {
    if (!["active", "archived", "all"].includes(status ?? "")) {
      return "active";
    }
    return status as ProgramStatus;
  };
  const params = await searchParams;
  const status = normalizeStatus(params.status);
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950">Programs</h1>

        <p className="mt-3 max-w-2xl text-zinc-600">
          View and manage the training programs offered at the school.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section>
          <StatusFilter current={status} />
          <ProgramList status={status} />
        </section>

        <aside>
          <ProgramForm />
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Write the file above**

### Step 8: Nav wiring

Modify `apps/web/src/components/layout/nav/nav-items.ts`:

```typescript
export type NavIconKey = "users" | "layers";

export const navItems: NavItem[] = [
  { key: "students", label: "Students", href: "/", icon: "users" },
  { key: "programs", label: "Programs", href: "/programs", icon: "layers" },
];
```

Modify `apps/web/src/components/layout/nav/nav-icons.tsx` — add a `LayersIcon` (Feather "layers" glyph, same `iconClassName`/stroke attributes as `UsersIcon`) and register it:

```typescript
function LayersIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={iconClassName}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export const navIcons: Record<NavIconKey, () => React.JSX.Element> = {
  users: UsersIcon,
  layers: LayersIcon,
};
```

- [ ] **Step 8: Update both files as above**

### Step 9: Component test stub

Create `apps/web/src/components/programs/program-list.test.tsx`:

```typescript
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";
import { ProgramList } from "@/components/programs/program-list";

vi.mock("@/lib/programs", () => ({
  getPrograms: vi.fn(),
}));

const { getPrograms } = await import("@/lib/programs");

describe("ProgramList", () => {
  it("renders each program returned by the query", async () => {
    // TODO(you): mock getPrograms to resolve with a couple of synthetic
    // programs, render <ProgramList status="active" />, and assert their
    // names appear on screen (use waitFor since the query resolves async).
    pytest_fail_placeholder: void 0;
  });

  it("shows the active empty state when there are no programs", async () => {
    // TODO(you): mock getPrograms to resolve with [], render, and assert
    // the "No active programs" heading appears.
  });
});
```

Note: replace the `pytest_fail_placeholder` line — that was a typo-guard, not real code; delete it once you've written the real test body. Use `expect(...).rejects`/`waitFor` patterns as needed; see `app-sidebar.test.tsx` for this codebase's Testing Library conventions.

- [ ] **Step 9: Write the file above, then fill in the TODO(you) test bodies**
- [ ] **Step 10: Run `pnpm --dir apps/web test` — confirm `program-list.test.tsx` passes**

### Step 11: Manual check + lint/typecheck

- [ ] **Step 11a:** Run `pnpm --dir apps/web dev` and `pnpm api:dev` (or your usual startup sequence per `startup.md`), then visit `/programs` in a browser. Create a program, confirm it appears; archive it, confirm it drops out of the default list; switch the filter to "All", confirm it reappears with an "Archived" badge.
- [ ] **Step 11b:** Run `pnpm --dir apps/web lint` and `pnpm --dir apps/web typecheck` — fix anything flagged.

### Step 12: Commit

```bash
git add apps/web/src/types/program.ts apps/web/src/lib/programs.ts \
  apps/web/src/schemas/program.ts apps/web/src/components/programs/ \
  apps/web/src/app/\(app\)/programs/ apps/web/src/components/layout/nav/nav-items.ts \
  apps/web/src/components/layout/nav/nav-icons.tsx
git commit -m "feat: add Programs page"
```

- [ ] **Step 12: Commit as above**

---

## Task 3: Class + Schedule backend

**Files:**
- Create: `apps/api/app/models/class_.py`
- Modify: `apps/api/app/models/__init__.py`
- Create: `apps/api/alembic/versions/<generated>_create_classes_and_schedule_days.py`
- Create: `apps/api/app/schemas/class_.py`
- Create: `apps/api/app/services/class_service.py`
- Create: `apps/api/app/api/routes/classes.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/tests/conftest.py`
- Create: `apps/api/tests/test_classes.py`

**Interfaces:**
- Consumes: `Program` model (Task 1) for the `program_id` foreign key.
- Produces: `Class` model with fields `id`, `program_id`, `name`, `description`, `start_time`, `end_time`, `archived_at`, `created_at`, `updated_at`, and relationship `schedule_days: Mapped[list["ClassScheduleDay"]]`. `ClassScheduleDay` model with `id`, `class_id`, `weekday`.
- Produces: `app.schemas.class_.ClassStatusFilter`, `Schedule` (`weekdays: list[int]`, `start_time: time`, `end_time: time`), `ClassBase`, `ClassCreate`, `ClassUpdate`, `ClassResponse` (embeds `schedule: Schedule`).
- Produces: `app.services.class_service.list_classes(db, *, status=ClassStatusFilter.ACTIVE, program_id=None, offset=0, limit=100) -> list[Class]`, `get_class(db, class_id) -> Class | None`, `create_class(db, data: ClassCreate) -> Class`, `update_class(db, class_, data: ClassUpdate) -> Class`, `archive_class`, `restore_class`.
- Produces: routes `GET/POST /api/classes`, `GET/PATCH /api/classes/{class_id}`, `POST /api/classes/{class_id}/archive`, `POST /api/classes/{class_id}/restore`.
- Produces: `make_class` pytest fixture — depends on `make_program`, defaults `program_id` to a freshly-made program if not given.

### Step 1: Scaffold the Class and ClassScheduleDay models with a TODO(you)

Create `apps/api/app/models/class_.py`:

```python
from datetime import datetime, time

from sqlalchemy import DateTime, ForeignKey, Integer, String, Time, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Class(Base):
    __tablename__ = "classes"

    # TODO(you): define the columns per the spec:
    #   id            primary key
    #   program_id    FK -> programs.id, required, ondelete="RESTRICT"
    #   name          required string, max_length 100
    #   description   optional string
    #   start_time    Time, required
    #   end_time      Time, required
    #   archived_at   nullable timestamptz, indexed
    #   created_at    timestamptz, server_default=func.now()
    #   updated_at    timestamptz, server_default=func.now(), onupdate=func.now()
    #
    # Also add a relationship so the service layer can read a class's
    # schedule days:
    #   schedule_days: Mapped[list["ClassScheduleDay"]] = relationship(
    #       back_populates="class_", cascade="all, delete-orphan"
    #   )
    ...


class ClassScheduleDay(Base):
    __tablename__ = "class_schedule_days"

    # TODO(you): define the columns:
    #   id         primary key
    #   class_id   FK -> classes.id, required, ondelete="CASCADE"
    #   weekday    small integer, 0 (Monday) - 6 (Sunday)
    #
    # Add the back-reference and the spec's uniqueness rule (a class can't
    # have the same weekday twice):
    #   class_: Mapped["Class"] = relationship(back_populates="schedule_days")
    #   __table_args__ = (UniqueConstraint("class_id", "weekday"),)
    ...
```

- [ ] **Step 1: Write the file above, then fill in both TODO(you) blocks**

### Step 2: Register the models

Modify `apps/api/app/models/__init__.py`:

```python
from app.models.class_ import Class, ClassScheduleDay
from app.models.program import Program
from app.models.session import UserSession
from app.models.student import Student
from app.models.user import User

__all__ = ["Class", "ClassScheduleDay", "Program", "Student", "UserSession", "User"]
```

- [ ] **Step 2: Update `apps/api/app/models/__init__.py` as above**

### Step 3: Generate and review the migration

- [ ] **Step 3a:** Run `.venv/bin/alembic revision --autogenerate -m "create classes and class_schedule_days tables"` from `apps/api`.
- [ ] **Step 3b:** Open the generated file. Confirm it creates `classes` (with the `program_id` foreign key and `RESTRICT` behavior) and `class_schedule_days` (with the `CASCADE` foreign key and the `(class_id, weekday)` unique constraint).
- [ ] **Step 3c:** Run `.venv/bin/alembic upgrade head` — expect it to apply cleanly.

### Step 4: Add the `make_class` fixture

Modify `apps/api/tests/conftest.py` — add below `make_program`:

```python
from datetime import time

from app.models.class_ import Class, ClassScheduleDay


@pytest.fixture
def make_class(
    db_session: Session,
    make_program: Callable[..., Program],
) -> Callable[..., Class]:
    """Factory for synthetic classes. Defaults to meeting Tuesdays 5-6pm."""
    counter = {"n": 0}

    def _make(*, weekdays: list[int] | None = None, **overrides: object) -> Class:
        counter["n"] += 1
        n = counter["n"]

        defaults: dict[str, object] = {
            "program_id": make_program().id,
            "name": f"Test Class {n}",
            "description": None,
            "start_time": time(17, 0),
            "end_time": time(18, 0),
        }
        class_ = Class(**{**defaults, **overrides})

        for weekday in weekdays if weekdays is not None else [1]:
            class_.schedule_days.append(ClassScheduleDay(weekday=weekday))

        db_session.add(class_)
        db_session.commit()
        db_session.refresh(class_)

        return class_

    return _make
```

- [ ] **Step 4: Add the fixture, and its imports, as above**

### Step 5: Write failing test stubs

Create `apps/api/tests/test_classes.py`:

```python
"""CRUD, schedule, and archive/restore behavior for classes."""

from collections.abc import Callable

import pytest
from app.models.class_ import Class
from app.models.program import Program
from fastapi.testclient import TestClient

MISSING_CLASS_ID = 999999


def test_create_class_returns_the_class_with_its_schedule(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): POST /api/classes with a program_id, name, and a schedule
    # of { weekdays: [1, 3], start_time: "17:00:00", end_time: "18:00:00" }.
    # Assert the response echoes the schedule back.
    pytest.fail("TODO(you): write the assertion")


def test_creating_a_class_with_no_weekdays_is_rejected(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): POST /api/classes with schedule.weekdays = []. What status
    # code should this produce, and where is that rule enforced?
    pytest.fail("TODO(you): write the assertion")


def test_creating_a_class_where_end_time_precedes_start_time_is_rejected(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    pytest.fail("TODO(you): write the assertion")


def test_list_classes_defaults_to_active(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    # TODO(you): create one active and one archived class, GET /api/classes
    # with no query params, assert only the active one comes back.
    pytest.fail("TODO(you): write the assertion")


def test_list_classes_can_filter_by_program(
    client: TestClient,
    make_class: Callable[..., Class],
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): create classes under two different programs, GET
    # /api/classes?program_id=<one of them>, assert only that program's
    # class comes back.
    pytest.fail("TODO(you): write the assertion")


def test_get_unknown_class_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/classes/{MISSING_CLASS_ID}")

    assert response.status_code == 404


def test_update_class_replaces_the_schedule(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    # TODO(you): PATCH a class's schedule to a different set of weekdays.
    # Assert the response's schedule reflects only the new weekdays (the
    # old ones are gone, not merged in).
    pytest.fail("TODO(you): write the assertion")


def test_archive_sets_the_timestamp(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    pytest.fail("TODO(you): write the assertion")


def test_restore_clears_the_timestamp(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    pytest.fail("TODO(you): write the assertion")


def test_archiving_a_program_does_not_archive_its_classes(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    # TODO(you): archive the program that owns a class (POST
    # /api/programs/{id}/archive), then GET the class. Assert it is still
    # active. This is the explicit no-cascade rule from the spec.
    pytest.fail("TODO(you): write the assertion")
```

- [ ] **Step 5: Write the file above**
- [ ] **Step 6: Run `.venv/bin/pytest tests/test_classes.py -v` — expect every test to FAIL**

### Step 7: Write the assertions

- [ ] **Step 7: Replace each `pytest.fail(...)` with a real assertion**, per its TODO(you) comment.

### Step 8: Scaffold the Pydantic schemas with a TODO(you)

Create `apps/api/app/schemas/class_.py`:

```python
from datetime import datetime, time
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class ClassStatusFilter(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    ALL = "all"


# TODO(you): define Schedule with two rules from the spec:
#   - weekdays: a non-empty list of unique integers, each 0-6
#   - end_time must be after start_time
# Field-level constraints handle the first two; a model_validator (or
# field_validator with mode="after") handles the cross-field time check.
class Schedule(BaseModel):
    ...


# TODO(you): define ClassBase, ClassCreate, ClassUpdate, and ClassResponse:
#   - ClassBase: program_id (int), name (required, 1-100 chars),
#     description (optional), schedule (Schedule)
#   - ClassCreate(ClassBase): no extra fields
#   - ClassUpdate: every field optional, including schedule as a whole
#     (a PATCH that includes schedule replaces it wholesale, per the spec)
#   - ClassResponse(ClassBase): id, archived_at, created_at, updated_at,
#     with ConfigDict(from_attributes=True)
#
# ClassResponse can't build `schedule` directly from the ORM object (the
# ORM has schedule_days: list[ClassScheduleDay], not a Schedule object) —
# you'll need a field_validator(mode="before") or a classmethod that
# assembles Schedule(weekdays=[d.weekday for d in schedule_days],
# start_time=..., end_time=...) from the Class instance's own start_time/
# end_time before validation runs. Ask yourself: where does that assembly
# belong — the schema, or the service layer, before constructing the
# response?
...
```

- [ ] **Step 8: Write the file above, then fill in the TODO(you) schemas**

### Step 9: Write the service layer

Create `apps/api/app/services/class_service.py`:

```python
from datetime import UTC, datetime
from typing import assert_never

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.class_ import Class, ClassScheduleDay
from app.schemas.class_ import ClassCreate, ClassStatusFilter, ClassUpdate


def list_classes(
    db: Session,
    *,
    offset: int = 0,
    limit: int = 100,
    status: ClassStatusFilter = ClassStatusFilter.ACTIVE,
    program_id: int | None = None,
) -> list[Class]:
    statement = select(Class).order_by(Class.name)

    match status:
        case ClassStatusFilter.ACTIVE:
            statement = statement.where(Class.archived_at.is_(None))
        case ClassStatusFilter.ARCHIVED:
            statement = statement.where(Class.archived_at.is_not(None))
        case ClassStatusFilter.ALL:
            pass
        case _:
            assert_never(status)

    if program_id is not None:
        statement = statement.where(Class.program_id == program_id)

    statement = statement.offset(offset).limit(limit)

    return list(db.scalars(statement).all())


def get_class(db: Session, class_id: int) -> Class | None:
    return db.get(Class, class_id)


def create_class(db: Session, class_data: ClassCreate) -> Class:
    fields = class_data.model_dump(exclude={"schedule"})
    class_ = Class(**fields)
    class_.schedule_days = [
        ClassScheduleDay(weekday=weekday) for weekday in class_data.schedule.weekdays
    ]
    class_.start_time = class_data.schedule.start_time
    class_.end_time = class_data.schedule.end_time

    db.add(class_)
    db.commit()
    db.refresh(class_)

    return class_


def update_class(db: Session, class_: Class, class_data: ClassUpdate) -> Class:
    changes = class_data.model_dump(exclude_unset=True, exclude={"schedule"})

    for field, value in changes.items():
        setattr(class_, field, value)

    if class_data.schedule is not None:
        class_.schedule_days = [
            ClassScheduleDay(weekday=weekday) for weekday in class_data.schedule.weekdays
        ]
        class_.start_time = class_data.schedule.start_time
        class_.end_time = class_data.schedule.end_time

    db.add(class_)
    db.commit()
    db.refresh(class_)

    return class_


def archive_class(db: Session, class_: Class) -> Class:
    if class_.archived_at is not None:
        return class_

    class_.archived_at = datetime.now(UTC)
    db.add(class_)
    db.commit()
    db.refresh(class_)
    return class_


def restore_class(db: Session, class_: Class) -> Class:
    class_.archived_at = None
    db.add(class_)
    db.commit()
    db.refresh(class_)
    return class_
```

Note: `class_.schedule_days = [...]` reassignment relies on the model's `cascade="all, delete-orphan"` relationship from Step 1 to delete the old rows — confirm that's set, or this will raise an integrity error on the unique constraint instead of replacing the rows.

- [ ] **Step 9: Write the file above**

### Step 10: Write the routes

Create `apps/api/app/api/routes/classes.py`:

```python
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.class_ import ClassCreate, ClassResponse, ClassStatusFilter, ClassUpdate
from app.services import class_service

router = APIRouter(
    prefix="/classes", tags=["Classes"], dependencies=[Depends(get_current_user)]
)

DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ClassResponse])
def list_classes(
    db: DatabaseSession,
    status: ClassStatusFilter = Query(default=ClassStatusFilter.ACTIVE),
    program_id: int | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
) -> list[ClassResponse]:
    return class_service.list_classes(
        db, status=status, program_id=program_id, offset=offset, limit=limit
    )


@router.get("/{class_id}", response_model=ClassResponse)
def get_class(class_id: int, db: DatabaseSession) -> ClassResponse:
    class_ = class_service.get_class(db, class_id)

    if class_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    return class_


@router.post("", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(class_data: ClassCreate, db: DatabaseSession) -> ClassResponse:
    return class_service.create_class(db, class_data)


@router.patch("/{class_id}", response_model=ClassResponse)
def update_class(
    class_id: int,
    class_data: ClassUpdate,
    db: DatabaseSession,
) -> ClassResponse:
    class_ = class_service.get_class(db, class_id)

    if class_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    return class_service.update_class(db, class_, class_data)


@router.post("/{class_id}/archive", response_model=ClassResponse)
def archive_class(class_id: int, db: DatabaseSession) -> ClassResponse:
    class_ = class_service.get_class(db, class_id)

    if class_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    return class_service.archive_class(db, class_)


@router.post("/{class_id}/restore", response_model=ClassResponse)
def restore_class(class_id: int, db: DatabaseSession) -> ClassResponse:
    class_ = class_service.get_class(db, class_id)

    if class_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    return class_service.restore_class(db, class_)
```

- [ ] **Step 10: Write the file above**

### Step 11: Register the router

Modify `apps/api/app/main.py` — add the `classes_router` import and `app.include_router(classes_router, prefix="/api")`.

- [ ] **Step 11: Update `apps/api/app/main.py`**

### Step 12: Run tests, lint, and typecheck

- [ ] **Step 12a:** `.venv/bin/pytest tests/test_classes.py -v` — expect all PASS.
- [ ] **Step 12b:** `.venv/bin/ruff check app tests` and `.venv/bin/ruff format --check app tests`.
- [ ] **Step 12c:** `.venv/bin/mypy app`.

### Step 13: Commit

```bash
git add apps/api/app/models/class_.py apps/api/app/models/__init__.py \
  apps/api/alembic/versions/ apps/api/app/schemas/class_.py \
  apps/api/app/services/class_service.py apps/api/app/api/routes/classes.py \
  apps/api/app/main.py apps/api/tests/conftest.py apps/api/tests/test_classes.py
git commit -m "feat: add Class model, schedule, and API"
```

- [ ] **Step 13: Commit as above**

---

## Task 4: Classes list UI

**Files:**
- Create: `apps/web/src/types/class.ts`
- Create: `apps/web/src/lib/classes.ts`
- Create: `apps/web/src/schemas/class.ts`
- Create: `apps/web/src/components/classes/status-filter.tsx`
- Create: `apps/web/src/components/classes/format-schedule.ts`
- Create: `apps/web/src/components/classes/class-form.tsx`
- Create: `apps/web/src/components/classes/class-list.tsx`
- Create: `apps/web/src/components/classes/class-row-actions.tsx`
- Create: `apps/web/src/app/(app)/classes/page.tsx`
- Modify: `apps/web/src/components/layout/nav/nav-items.ts`
- Modify: `apps/web/src/components/layout/nav/nav-icons.tsx`
- Create: `apps/web/src/components/classes/format-schedule.test.ts`
- Create: `apps/web/src/components/classes/class-form.test.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/classes`, `GET/PATCH /api/classes/{id}`, archive/restore (Task 3); `Program` type and `getPrograms` (Task 2, for the program `<select>`).
- Produces: `Class`, `Schedule`, `ClassStatus`, `CreateClassInput` types; `getClasses`, `getClass`, `createClass`, `archiveClass`, `restoreClass` in `lib/classes.ts`; `formatSchedule(schedule: Schedule): string` utility; a `NavIconKey` value `"calendar"`.

### Step 1: Types

Create `apps/web/src/types/class.ts`:

```typescript
export type ClassStatus = "active" | "archived" | "all";

export type Schedule = {
  weekdays: number[];
  start_time: string;
  end_time: string;
};

export type Class = {
  id: number;
  program_id: number;
  name: string;
  description: string | null;
  schedule: Schedule;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateClassInput = {
  program_id: number;
  name: string;
  description: string | null;
  schedule: Schedule;
};

export type UpdateClassInput = Partial<CreateClassInput>;
```

- [ ] **Step 1: Write the file above**

### Step 2: API client

Create `apps/web/src/lib/classes.ts`:

```typescript
import { apiRequest } from "@/lib/api";
import type { Class, ClassStatus, CreateClassInput, UpdateClassInput } from "@/types/class";

export function getClasses(
  status: ClassStatus = "active",
  programId?: number,
): Promise<Class[]> {
  const params = new URLSearchParams({ status });
  if (programId !== undefined) {
    params.set("program_id", String(programId));
  }
  return apiRequest<Class[]>(`/api/classes?${params.toString()}`);
}

export function getClass(classId: number): Promise<Class> {
  return apiRequest<Class>(`/api/classes/${classId}`);
}

export function createClass(input: CreateClassInput): Promise<Class> {
  return apiRequest<Class>("/api/classes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateClass(classId: number, input: UpdateClassInput): Promise<Class> {
  return apiRequest<Class>(`/api/classes/${classId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function archiveClass(classId: number): Promise<Class> {
  return apiRequest<Class>(`/api/classes/${classId}/archive`, { method: "POST" });
}

export function restoreClass(classId: number): Promise<Class> {
  return apiRequest<Class>(`/api/classes/${classId}/restore`, { method: "POST" });
}
```

- [ ] **Step 2: Write the file above**

### Step 3: Zod schema with a TODO(you)

Create `apps/web/src/schemas/class.ts`:

```typescript
import { z } from "zod";

// TODO(you): define createClassSchema, following schemas/student.ts's
// pattern, with fields:
//   - program_id: coerced to number, required (the <select> will submit a
//     string value)
//   - name: required, trimmed, 1-100 characters
//   - description: optional text (trim empty string to null)
//   - weekdays: an array of selected weekday numbers from checkboxes —
//     must be non-empty
//   - start_time / end_time: HTML <input type="time"> values ("HH:MM"
//     strings) — validate end_time is after start_time (z.object(...).refine)
//
// The form will submit weekdays/start_time/end_time as flat fields; use a
// .transform() at the end to nest them into { schedule: { weekdays,
// start_time, end_time } } matching CreateClassInput's shape, so the form
// component doesn't have to build that nesting by hand.
...
```

- [ ] **Step 3: Write the file above, then fill in the TODO(you) schema**

### Step 4: Status filter

Create `apps/web/src/components/classes/status-filter.tsx`:

```typescript
import type { ClassStatus } from "@/types/class";
import Link from "next/link";

const options: { value: ClassStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const containerClassName = "mb-4 flex gap-1 rounded-lg border border-zinc-200 p-1";

const optionClassName = "rounded-md px-3 py-1.5 text-sm font-medium";

const currentOptionClassName = "bg-zinc-950 text-white";

const otherOptionClassName = "text-zinc-600 hover:bg-zinc-100";

export function StatusFilter({ current }: { current: ClassStatus }) {
  return (
    <div className={containerClassName}>
      {options.map((option) => {
        const isCurrent = option.value === current;
        const className = [
          optionClassName,
          isCurrent ? currentOptionClassName : otherOptionClassName,
        ].join(" ");

        return (
          <Link
            key={option.value}
            href={`?status=${option.value}`}
            className={className}
            aria-current={isCurrent ? "page" : undefined}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Write the file above**

### Step 5: Schedule formatting utility

Create `apps/web/src/components/classes/format-schedule.ts`:

```typescript
import type { Schedule } from "@/types/class";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatSchedule(schedule: Schedule): string {
  const days = [...schedule.weekdays]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join(", ");

  return `${days} · ${formatTime(schedule.start_time)}–${formatTime(schedule.end_time)}`;
}

function formatTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}
```

- [ ] **Step 5: Write the file above**

Create `apps/web/src/components/classes/format-schedule.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { formatSchedule } from "@/components/classes/format-schedule";

describe("formatSchedule", () => {
  it("formats a single weekday with a 12-hour time range", () => {
    expect(
      formatSchedule({ weekdays: [1], start_time: "17:00:00", end_time: "18:00:00" }),
    ).toBe("Tue · 5:00 PM–6:00 PM");
  });

  it("sorts and joins multiple weekdays", () => {
    expect(
      formatSchedule({ weekdays: [3, 1], start_time: "09:00:00", end_time: "10:30:00" }),
    ).toBe("Tue, Thu · 9:00 AM–10:30 AM");
  });
});
```

- [ ] **Step 6: Write the test file above**
- [ ] **Step 7: Run `pnpm --dir apps/web test format-schedule` — expect PASS** (this utility is fully mechanical, so its test is pre-written rather than a TODO(you) stub)

### Step 8: Class form (create)

Create `apps/web/src/components/classes/class-form.tsx`:

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { createClass } from "@/lib/classes";
import { getPrograms } from "@/lib/programs";
import {
  createClassSchema,
  type CreateClassFormValues,
  type CreateClassValues,
} from "@/schemas/class";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

export function ClassForm() {
  const queryClient = useQueryClient();

  const { data: programs } = useQuery({
    queryKey: ["programs", "active"],
    queryFn: () => getPrograms("active"),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateClassFormValues, unknown, CreateClassValues>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      program_id: "",
      name: "",
      description: "",
      weekdays: [],
      start_time: "",
      end_time: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createClass,
    onSuccess: async () => {
      reset();

      await queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  async function onSubmit(values: CreateClassValues) {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setError("root", {
        type: "server",
        message: error instanceof Error ? error.message : "Unable to create class",
      });
    }
  }

  const fieldClassName =
    "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  const errorClassName = "mt-1 text-sm text-red-700";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-950">Add class</h2>

        <p className="mt-1 text-sm text-zinc-600">
          Name a class, assign it to a program, and set its weekly schedule.
        </p>
      </div>

      <div className="grid gap-5">
        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Name</span>

          <input {...register("name")} className={fieldClassName} />

          {errors.name && <p className={errorClassName}>{errors.name.message}</p>}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Program</span>

          <select {...register("program_id")} className={fieldClassName}>
            <option value="">Select a program</option>
            {programs?.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>

          {errors.program_id && (
            <p className={errorClassName}>{errors.program_id.message}</p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Description</span>

          <textarea {...register("description")} rows={3} className={fieldClassName} />

          {errors.description && (
            <p className={errorClassName}>{errors.description.message}</p>
          )}
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-zinc-800">Days</legend>

          <div className="mt-1 flex flex-wrap gap-3">
            {WEEKDAY_OPTIONS.map((day) => (
              <label
                key={day.value}
                className="flex items-center gap-1.5 text-sm text-zinc-700"
              >
                <input type="checkbox" value={day.value} {...register("weekdays")} />
                {day.label}
              </label>
            ))}
          </div>

          {errors.weekdays && <p className={errorClassName}>{errors.weekdays.message}</p>}
        </fieldset>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Start time</span>

            <input type="time" {...register("start_time")} className={fieldClassName} />

            {errors.start_time && (
              <p className={errorClassName}>{errors.start_time.message}</p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-800">End time</span>

            <input type="time" {...register("end_time")} className={fieldClassName} />

            {errors.end_time && <p className={errorClassName}>{errors.end_time.message}</p>}
          </label>
        </div>
      </div>

      {errors.root && (
        <div className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

      {mutation.isSuccess && (
        <div className="mt-5 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Class created successfully.
        </div>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Creating..." : "Create class"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 8: Write the file above**

### Step 9: Class form test stubs — weekday and time validation

The spec calls for component tests covering weekday selection and time validation specifically, since these are the genuinely new interaction patterns in this form (everything else mirrors `student-form.tsx`). Create `apps/web/src/components/classes/class-form.test.tsx`:

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";
import { ClassForm } from "@/components/classes/class-form";

vi.mock("@/lib/programs", () => ({
  getPrograms: vi.fn(async () => [
    { id: 1, name: "Kids", description: null, archived_at: null, created_at: "", updated_at: "" },
  ]),
}));

vi.mock("@/lib/classes", () => ({
  createClass: vi.fn(),
}));

const { createClass } = await import("@/lib/classes");

describe("ClassForm", () => {
  it("rejects submission with no weekday selected", async () => {
    // TODO(you): render <ClassForm />, wait for the program option to load,
    // fill in name/program/start time/end time but check no day checkbox,
    // submit, and assert a validation message appears and createClass was
    // never called. This is what proves createClassSchema's non-empty
    // weekdays rule (Task 4 Step 3) actually fires from the UI.
  });

  it("rejects an end time before the start time", async () => {
    // TODO(you): fill the form with a valid name/program/day, but set
    // start_time later than end_time, submit, and assert the cross-field
    // validation error appears and createClass was never called.
  });

  it("submits with the nested schedule shape createClass expects", async () => {
    // TODO(you): fill in a fully valid class (name, program, at least one
    // day, start_time before end_time), submit, and assert createClass was
    // called once with a payload whose `schedule` field has the expected
    // { weekdays, start_time, end_time } — this is what proves the Zod
    // schema's flat-to-nested transform (Task 4 Step 3) produces the shape
    // CreateClassInput expects.
  });
});
```

- [ ] **Step 9: Write the file above, then fill in the TODO(you) test bodies**
- [ ] **Step 10: Run `pnpm --dir apps/web test class-form` — expect PASS**

### Step 11: Class list + row actions

Create `apps/web/src/components/classes/class-row-actions.tsx`:

```tsx
"use client";

import Link from "next/link";

import { archiveClass, restoreClass } from "@/lib/classes";
import type { Class } from "@/types/class";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const buttonClassName =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50";

const errorClassName = "mt-1 text-sm text-red-700";

export function ClassRowActions({ classItem }: { classItem: Class }) {
  const queryClient = useQueryClient();

  const { isError, isPending, error, mutate } = useMutation({
    mutationFn: async (shouldArchive: boolean) => {
      if (shouldArchive) {
        return archiveClass(classItem.id);
      } else {
        return restoreClass(classItem.id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Link href={`/classes/${classItem.id}`} className={buttonClassName}>
        Manage
      </Link>

      <button
        type="button"
        className={buttonClassName}
        disabled={isPending}
        onClick={() => mutate(!classItem.archived_at)}
      >
        {classItem.archived_at ? "Restore" : "Archive"}
      </button>

      {isError && (
        <p className={errorClassName}>
          {error instanceof Error ? error.message : "An error occurred"}
        </p>
      )}
    </div>
  );
}
```

Create `apps/web/src/components/classes/class-list.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";

import { ClassRowActions } from "@/components/classes/class-row-actions";
import { formatSchedule } from "@/components/classes/format-schedule";
import { getClasses } from "@/lib/classes";
import { getPrograms } from "@/lib/programs";
import { ClassStatus } from "@/types/class";

const emptyStateCopy: Record<ClassStatus, { heading: string; body: string }> = {
  active: {
    heading: "No active classes",
    body: "Add a class using the form, or check the archived filter.",
  },
  archived: {
    heading: "No archived classes",
    body: "Classes you archive will appear here.",
  },
  all: {
    heading: "No classes yet",
    body: "Add your first class using the form.",
  },
};

export function ClassList({ status }: { status: ClassStatus }) {
  const {
    data: classes,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["classes", status],
    queryFn: () => getClasses(status),
  });

  // Archived classes can point at archived programs, so the lookup needs
  // "all" rather than "active" or a class on an archived program would show
  // a blank Program column.
  const { data: programs } = useQuery({
    queryKey: ["programs", "all"],
    queryFn: () => getPrograms("all"),
  });

  const programNameById = new Map(programs?.map((program) => [program.id, program.name]));

  if (isPending) {
    return <p className="text-sm text-zinc-600">Loading classes...</p>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="font-medium text-red-900">Unable to load classes</p>

        <p className="mt-1 text-sm text-red-700">{error.message}</p>

        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (classes.length === 0) {
    const { heading, body } = emptyStateCopy[status];

    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
        <h2 className="font-semibold text-zinc-900">{heading}</h2>

        <p className="mt-2 text-sm text-zinc-600">{body}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full border-collapse text-left">
        <thead className="bg-zinc-100">
          <tr>
            <th className="px-4 py-3 text-sm font-semibold">Name</th>
            <th className="px-4 py-3 text-sm font-semibold">Program</th>
            <th className="px-4 py-3 text-sm font-semibold">Schedule</th>
            <th className="px-4 py-3 text-sm font-semibold">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200">
          {classes.map((classItem) => (
            <tr key={classItem.id}>
              <td className="px-4 py-3">
                {classItem.name}

                {classItem.archived_at && (
                  <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    Archived
                  </span>
                )}
              </td>

              <td className="px-4 py-3 text-sm text-zinc-600">
                {programNameById.get(classItem.program_id) ?? "—"}
              </td>

              <td className="px-4 py-3 text-sm text-zinc-600">
                {formatSchedule(classItem.schedule)}
              </td>

              <td className="px-4 py-3">
                <ClassRowActions classItem={classItem} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 11: Write both files above**

### Step 12: Classes page

Create `apps/web/src/app/(app)/classes/page.tsx`:

```tsx
import { ClassForm } from "@/components/classes/class-form";
import { ClassList } from "@/components/classes/class-list";
import { StatusFilter } from "@/components/classes/status-filter";
import { ClassStatus } from "@/types/class";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const normalizeStatus = (status?: string): ClassStatus => {
    if (!["active", "archived", "all"].includes(status ?? "")) {
      return "active";
    }
    return status as ClassStatus;
  };
  const params = await searchParams;
  const status = normalizeStatus(params.status);
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950">Classes</h1>

        <p className="mt-3 max-w-2xl text-zinc-600">
          View and manage the classes offered at the school.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section>
          <StatusFilter current={status} />
          <ClassList status={status} />
        </section>

        <aside>
          <ClassForm />
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 12: Write the file above**

### Step 13: Nav wiring

Modify `apps/web/src/components/layout/nav/nav-items.ts`:

```typescript
export type NavIconKey = "users" | "layers" | "calendar";

export const navItems: NavItem[] = [
  { key: "students", label: "Students", href: "/", icon: "users" },
  { key: "programs", label: "Programs", href: "/programs", icon: "layers" },
  { key: "classes", label: "Classes", href: "/classes", icon: "calendar" },
];
```

Modify `apps/web/src/components/layout/nav/nav-icons.tsx` — add a `CalendarIcon` (Feather "calendar" glyph) and register it under `"calendar"`, same pattern as `LayersIcon` in Task 2.

- [ ] **Step 13: Update both files as above**

### Step 14: Manual check + lint/typecheck

- [ ] **Step 14a:** Run the dev servers, visit `/classes`. Create a class with two weekdays, confirm the list shows the formatted schedule; archive/restore; confirm the "Programs" nav item still works alongside the new "Classes" one.
- [ ] **Step 14b:** `pnpm --dir apps/web lint` and `pnpm --dir apps/web typecheck`.
- [ ] **Step 14c:** `pnpm --dir apps/web test` — confirm the full suite (including `class-form.test.tsx` and `program-list.test.tsx`) passes.

### Step 15: Commit

```bash
git add apps/web/src/types/class.ts apps/web/src/lib/classes.ts \
  apps/web/src/schemas/class.ts apps/web/src/components/classes/ \
  apps/web/src/app/\(app\)/classes/page.tsx \
  apps/web/src/components/layout/nav/nav-items.ts \
  apps/web/src/components/layout/nav/nav-icons.tsx
git commit -m "feat: add Classes list page"
```

- [ ] **Step 15: Commit as above**

---

## Task 5: Enrollment backend

**Files:**
- Create: `apps/api/app/models/class_enrollment.py`
- Modify: `apps/api/app/models/__init__.py`
- Create: `apps/api/alembic/versions/<generated>_create_class_enrollments_table.py`
- Create: `apps/api/app/schemas/class_enrollment.py`
- Create: `apps/api/app/services/class_enrollment_service.py`
- Modify: `apps/api/app/api/routes/classes.py`
- Modify: `apps/api/app/api/routes/students.py`
- Modify: `apps/api/tests/conftest.py`
- Create: `apps/api/tests/test_class_roster.py`
- Create: `apps/api/tests/test_student_classes.py`

**Interfaces:**
- Consumes: `Class` model (Task 3), `Student` model (existing).
- Produces: `ClassEnrollment` model with `id`, `class_id`, `student_id`, `enrolled_at`, `removed_at`, and the partial unique index.
- Produces: `app.schemas.class_enrollment.EnrollmentCreate` (`student_id: int`), `EnrolledStudent` (`id`, `first_name`, `last_name`), `RosterEntryResponse` (`id`, `student: EnrolledStudent`, `enrolled_at`), `StudentClassResponse` (`id`, `class_id`, `class_name`, `enrolled_at`).
- Produces: `app.services.class_enrollment_service.list_roster(db, class_id) -> list[ClassEnrollment]`, `enroll_student(db, class_id, student_id) -> ClassEnrollment`, `remove_enrollment(db, class_id, student_id) -> ClassEnrollment | None`, `list_student_classes(db, student_id) -> list[ClassEnrollment]`.
- Produces: routes `GET/POST /api/classes/{class_id}/roster`, `POST /api/classes/{class_id}/roster/{student_id}/remove`, `GET /api/students/{student_id}/classes`.
- Produces: `make_enrollment` pytest fixture.

### Step 1: Scaffold the ClassEnrollment model with a TODO(you)

Create `apps/api/app/models/class_enrollment.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ClassEnrollment(Base):
    __tablename__ = "class_enrollments"

    # TODO(you): define the columns:
    #   id            primary key
    #   class_id      FK -> classes.id, required, ondelete="CASCADE"
    #   student_id    FK -> students.id, required, ondelete="CASCADE"
    #   enrolled_at   timestamptz, server_default=func.now()
    #   removed_at    nullable timestamptz
    #
    # Then add the spec's partial unique index — a student can't have two
    # *active* enrollments in the same class, but CAN be re-enrolled after
    # removal (a removed row plus a later active row for the same pair):
    #   __table_args__ = (
    #       Index(
    #           "ix_class_enrollments_active_unique",
    #           "class_id",
    #           "student_id",
    #           unique=True,
    #           postgresql_where=Column("removed_at").is_(None),  # <- fix this
    #       ),
    #   )
    # (the postgresql_where expression needs to reference the table's own
    # removed_at column — look at how SQLAlchemy expects that expressed
    # inside __table_args__, since `Column` alone won't resolve correctly
    # there)
    ...
```

- [ ] **Step 1: Write the file above, then fill in the TODO(you) block**

### Step 2: Register the model

Modify `apps/api/app/models/__init__.py` to import and export `ClassEnrollment`.

- [ ] **Step 2: Update `apps/api/app/models/__init__.py`**

### Step 3: Generate and review the migration

- [ ] **Step 3a:** Run `.venv/bin/alembic revision --autogenerate -m "create class_enrollments table"`.
- [ ] **Step 3b:** Open the generated file. **Autogenerate does not always detect `postgresql_where` on a partial index correctly** — confirm the `op.create_index(...)` call includes `postgresql_where=sa.text("removed_at IS NULL")` (or equivalent). If it's missing, add it by hand; this is exactly the kind of thing autogenerate is known to miss, so don't skip this check.
- [ ] **Step 3c:** Run `.venv/bin/alembic upgrade head`.

### Step 4: Add the `make_enrollment` fixture

Modify `apps/api/tests/conftest.py`:

```python
from app.models.class_enrollment import ClassEnrollment


@pytest.fixture
def make_enrollment(db_session: Session) -> Callable[..., ClassEnrollment]:
    def _make(*, class_id: int, student_id: int, **overrides: object) -> ClassEnrollment:
        defaults: dict[str, object] = {"class_id": class_id, "student_id": student_id}
        enrollment = ClassEnrollment(**{**defaults, **overrides})

        db_session.add(enrollment)
        db_session.commit()
        db_session.refresh(enrollment)

        return enrollment

    return _make
```

- [ ] **Step 4: Add the fixture and import as above**

### Step 5: Write failing test stubs — roster

Create `apps/api/tests/test_class_roster.py`:

```python
"""Enrolling and removing students from a class roster."""

from collections.abc import Callable
from datetime import UTC, datetime

import pytest
from app.models.class_ import Class
from app.models.class_enrollment import ClassEnrollment
from app.models.student import Student
from fastapi.testclient import TestClient

MISSING_CLASS_ID = 999999
MISSING_STUDENT_ID = 999999


def test_enrolling_a_student_adds_them_to_the_roster(
    client: TestClient,
    make_class: Callable[..., Class],
    make_student: Callable[..., Student],
) -> None:
    # TODO(you): POST /api/classes/{class_id}/roster with { student_id }.
    # Assert the response status code, then GET the roster and assert the
    # student appears in it.
    pytest.fail("TODO(you): write the assertion")


def test_enrolling_the_same_student_twice_conflicts(
    client: TestClient,
    make_class: Callable[..., Class],
    make_student: Callable[..., Student],
) -> None:
    # TODO(you): enroll a student, then try enrolling them again in the
    # same class. What status code enforces "no double-active-enrollment,"
    # and where does that rule actually live (hint: Task 5 Step 1)?
    pytest.fail("TODO(you): write the assertion")


def test_removing_a_student_takes_them_off_the_default_roster(
    client: TestClient,
    make_class: Callable[..., Class],
    make_student: Callable[..., Student],
    make_enrollment: Callable[..., ClassEnrollment],
) -> None:
    # TODO(you): POST /api/classes/{class_id}/roster/{student_id}/remove,
    # then GET the roster and assert the student is gone from it.
    pytest.fail("TODO(you): write the assertion")


def test_a_removed_student_can_be_re_enrolled(
    client: TestClient,
    make_class: Callable[..., Class],
    make_student: Callable[..., Student],
) -> None:
    # TODO(you): enroll, remove, then enroll the same student in the same
    # class again. Assert the second enroll succeeds (not a 409) and the
    # student is back on the roster. This is the partial-unique-index
    # behavior from Task 5 Step 1 — prove it actually works, not just that
    # the migration applied.
    pytest.fail("TODO(you): write the assertion")


def test_enrolling_in_an_unknown_class_returns_404(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    student = make_student()

    response = client.post(
        f"/api/classes/{MISSING_CLASS_ID}/roster",
        json={"student_id": student.id},
    )

    assert response.status_code == 404


def test_enrolling_an_unknown_student_returns_404(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    class_ = make_class()

    response = client.post(
        f"/api/classes/{class_.id}/roster",
        json={"student_id": MISSING_STUDENT_ID},
    )

    assert response.status_code == 404
```

- [ ] **Step 5: Write the file above**

### Step 6: Write failing test stubs — reverse lookup

Create `apps/api/tests/test_student_classes.py`:

```python
"""A student's-eye view of their active enrollments."""

from collections.abc import Callable

import pytest
from app.models.class_ import Class
from app.models.student import Student
from fastapi.testclient import TestClient


def test_lists_only_active_enrollments_for_the_student(
    client: TestClient,
    make_class: Callable[..., Class],
    make_student: Callable[..., Student],
) -> None:
    # TODO(you): enroll a student in two classes, remove them from one, GET
    # /api/students/{id}/classes, and assert only the still-active class
    # comes back.
    pytest.fail("TODO(you): write the assertion")


def test_a_student_with_no_enrollments_gets_an_empty_list(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    student = make_student()

    response = client.get(f"/api/students/{student.id}/classes")

    assert response.status_code == 200 and response.json() == []
```

- [ ] **Step 6: Write the file above**
- [ ] **Step 7: Run `.venv/bin/pytest tests/test_class_roster.py tests/test_student_classes.py -v` — expect every non-404 test to FAIL**

### Step 8: Write the assertions

- [ ] **Step 8: Replace each `pytest.fail(...)` with a real assertion**, per its TODO(you) comment, in both files.

### Step 9: Scaffold the Pydantic schemas with a TODO(you)

Create `apps/api/app/schemas/class_enrollment.py`:

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EnrollmentCreate(BaseModel):
    student_id: int


# TODO(you): define EnrolledStudent (id, first_name, last_name, with
# ConfigDict(from_attributes=True) so it can build directly from a Student
# ORM instance), RosterEntryResponse (id — the enrollment's own id, student:
# EnrolledStudent, enrolled_at), and StudentClassResponse (id — the
# enrollment's id, class_id, class_name, enrolled_at) for the reverse
# lookup. Both response models need ConfigDict(from_attributes=True).
...
```

- [ ] **Step 9: Write the file above, then fill in the TODO(you) schemas**

### Step 10: Write the service layer

Create `apps/api/app/services/class_enrollment_service.py`:

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.class_enrollment import ClassEnrollment


def list_roster(db: Session, class_id: int) -> list[ClassEnrollment]:
    statement = (
        select(ClassEnrollment)
        .where(ClassEnrollment.class_id == class_id)
        .where(ClassEnrollment.removed_at.is_(None))
    )
    return list(db.scalars(statement).all())


def get_active_enrollment(db: Session, class_id: int, student_id: int) -> ClassEnrollment | None:
    statement = (
        select(ClassEnrollment)
        .where(ClassEnrollment.class_id == class_id)
        .where(ClassEnrollment.student_id == student_id)
        .where(ClassEnrollment.removed_at.is_(None))
    )
    return db.scalar(statement)


def enroll_student(db: Session, class_id: int, student_id: int) -> ClassEnrollment:
    enrollment = ClassEnrollment(class_id=class_id, student_id=student_id)

    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return enrollment


def remove_enrollment(db: Session, class_id: int, student_id: int) -> ClassEnrollment | None:
    enrollment = get_active_enrollment(db, class_id, student_id)

    if enrollment is None:
        return None

    from datetime import UTC, datetime

    enrollment.removed_at = datetime.now(UTC)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return enrollment


def list_student_classes(db: Session, student_id: int) -> list[ClassEnrollment]:
    statement = (
        select(ClassEnrollment)
        .where(ClassEnrollment.student_id == student_id)
        .where(ClassEnrollment.removed_at.is_(None))
    )
    return list(db.scalars(statement).all())
```

(Move the `from datetime import UTC, datetime` import to the top of the file alongside the others — it's written inline above only to keep this snippet's diff small; don't leave it inline in the real file.)

- [ ] **Step 10: Write the file above (with the import at the top of the file)**

### Step 11: Add the roster routes

Modify `apps/api/app/api/routes/classes.py` — add imports for `EnrollmentCreate`, `RosterEntryResponse`, `class_enrollment_service`, `student_service` (to check the student exists), `IntegrityError` from `sqlalchemy.exc`, and append:

```python
@router.get("/{class_id}/roster", response_model=list[RosterEntryResponse])
def list_roster(class_id: int, db: DatabaseSession) -> list[RosterEntryResponse]:
    class_ = class_service.get_class(db, class_id)

    if class_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    return class_enrollment_service.list_roster(db, class_id)


@router.post(
    "/{class_id}/roster",
    response_model=RosterEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_to_roster(
    class_id: int,
    enrollment_data: EnrollmentCreate,
    db: DatabaseSession,
) -> RosterEntryResponse:
    class_ = class_service.get_class(db, class_id)

    if class_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    student = student_service.get_student(db, enrollment_data.student_id)

    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    try:
        return class_enrollment_service.enroll_student(db, class_id, student.id)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This student is already enrolled in this class",
        ) from error


@router.post("/{class_id}/roster/{student_id}/remove", response_model=RosterEntryResponse)
def remove_from_roster(class_id: int, student_id: int, db: DatabaseSession) -> RosterEntryResponse:
    enrollment = class_enrollment_service.remove_enrollment(db, class_id, student_id)

    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active enrollment not found",
        )

    return enrollment
```

Also add `from app.services import student_service` and `from app.services import class_enrollment_service` to this file's imports.

- [ ] **Step 11: Update `apps/api/app/api/routes/classes.py` as above**

### Step 12: Add the reverse-lookup route

Modify `apps/api/app/api/routes/students.py` — add imports for `StudentClassResponse` and `class_enrollment_service`, and append:

```python
@router.get("/{student_id}/classes", response_model=list[StudentClassResponse])
def list_student_classes(student_id: int, db: DatabaseSession) -> list[StudentClassResponse]:
    student = student_service.get_student(db, student_id)

    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    return class_enrollment_service.list_student_classes(db, student_id)
```

Note: `StudentClassResponse` needs `class_name` populated from the enrollment's related `Class.name` — if your `ClassEnrollment` model's TODO(you) in Step 1 didn't add a `class_: Mapped["Class"] = relationship(...)` back-reference, add one now; the response schema can't reach the class's name without it.

- [ ] **Step 12: Update `apps/api/app/api/routes/students.py` as above**

### Step 13: Run tests, lint, and typecheck

- [ ] **Step 13a:** `.venv/bin/pytest tests/test_class_roster.py tests/test_student_classes.py -v` — expect all PASS.
- [ ] **Step 13b:** `.venv/bin/pytest` (full suite) — confirm nothing else broke.
- [ ] **Step 13c:** `.venv/bin/ruff check app tests`, `.venv/bin/ruff format --check app tests`, `.venv/bin/mypy app`.

### Step 14: Commit

```bash
git add apps/api/app/models/class_enrollment.py apps/api/app/models/__init__.py \
  apps/api/alembic/versions/ apps/api/app/schemas/class_enrollment.py \
  apps/api/app/services/class_enrollment_service.py \
  apps/api/app/api/routes/classes.py apps/api/app/api/routes/students.py \
  apps/api/tests/conftest.py apps/api/tests/test_class_roster.py \
  apps/api/tests/test_student_classes.py
git commit -m "feat: add class roster and student enrollment lookup"
```

- [ ] **Step 14: Commit as above**

---

## Task 6: Classes detail page (edit + roster UI)

**Files:**
- Modify: `apps/web/src/types/class.ts`
- Modify: `apps/web/src/lib/classes.ts`
- Create: `apps/web/src/app/(app)/classes/[id]/page.tsx`
- Create: `apps/web/src/components/classes/class-detail.tsx`
- Create: `apps/web/src/components/classes/class-edit-form.tsx`
- Create: `apps/web/src/components/classes/roster-list.tsx`
- Create: `apps/web/src/components/classes/add-student-to-roster.tsx`
- Modify: `apps/web/src/components/layout/nav/nav-list.tsx`
- Create: `apps/web/src/components/classes/roster-list.test.tsx`

**Interfaces:**
- Consumes: `getClass`, `updateClass` (Task 4); `GET/POST /api/classes/{id}/roster`, `POST /api/classes/{id}/roster/{student_id}/remove` (Task 5); `getStudents` (existing, for the add-to-roster picker).

**Note on fetching:** the existing Students page fetches everything client-side through TanStack Query — there's no precedent anywhere in this codebase for a Server Component fetching authenticated resource data (only `requireCurrentUser()` runs server-side, for the session cookie itself). Since `apiRequest`'s `credentials: "include"` relies on the browser holding the session cookie, a Server Component call wouldn't be authenticated the same way. So `[id]/page.tsx` stays a thin Server Component that only parses the route param; the actual class-detail fetch happens client-side in a new `ClassDetail` component, matching how `StudentList` already works.

### Step 1: Extend types and API client for roster

Modify `apps/web/src/types/class.ts` — append:

```typescript
export type RosterEntry = {
  id: number;
  student: { id: number; first_name: string; last_name: string };
  enrolled_at: string;
};
```

Modify `apps/web/src/lib/classes.ts` — append:

```typescript
import type { RosterEntry } from "@/types/class";

export function getRoster(classId: number): Promise<RosterEntry[]> {
  return apiRequest<RosterEntry[]>(`/api/classes/${classId}/roster`);
}

export function addToRoster(classId: number, studentId: number): Promise<RosterEntry> {
  return apiRequest<RosterEntry>(`/api/classes/${classId}/roster`, {
    method: "POST",
    body: JSON.stringify({ student_id: studentId }),
  });
}

export function removeFromRoster(classId: number, studentId: number): Promise<RosterEntry> {
  return apiRequest<RosterEntry>(`/api/classes/${classId}/roster/${studentId}/remove`, {
    method: "POST",
  });
}
```

(Add the `RosterEntry` import to the top of the existing import block rather than mid-file — shown inline here only to keep the diff readable.)

- [ ] **Step 1: Update both files as above**

### Step 2: Fix nav highlighting for the new nested route

This page introduces the app's first nested route (`/classes/[id]`). `nav-list.tsx` currently highlights a nav item with `item.href === pathname`, which was written for a flat, single-page-per-item nav and explicitly flagged in its own comment as needing revisiting once nested routes exist — that's now.

Modify `apps/web/src/components/layout/nav/nav-list.tsx`:

```typescript
const isCurrentPath =
  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
```

Replace the existing `const isCurrentPath = item.href === pathname;` line (and its now-stale comment) with the above. This keeps `/` (Students) exact-match only — otherwise it would match every route as a prefix — while `/classes` correctly stays highlighted on `/classes/42` too.

- [ ] **Step 2: Update `nav-list.tsx` as above**

### Step 3: Roster list stub + assertions

Create `apps/web/src/components/classes/roster-list.test.tsx`:

```typescript
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";
import { RosterList } from "@/components/classes/roster-list";

vi.mock("@/lib/classes", () => ({
  getRoster: vi.fn(),
  removeFromRoster: vi.fn(),
}));

const { getRoster, removeFromRoster } = await import("@/lib/classes");

describe("RosterList", () => {
  it("renders each enrolled student's name", async () => {
    // TODO(you): mock getRoster to resolve with a couple of synthetic
    // roster entries, render <RosterList classId={1} />, and assert both
    // students' names appear (waitFor the async query).
  });

  it("removes a student from the roster on click and refetches", async () => {
    // TODO(you): mock getRoster to resolve once with one entry, mock
    // removeFromRoster to resolve successfully, click that student's
    // "Remove" button, and assert removeFromRoster was called with the
    // right class/student ids.
  });
});
```

- [ ] **Step 3: Write the file above, then fill in the TODO(you) test bodies**

### Step 4: Roster list component

Create `apps/web/src/components/classes/roster-list.tsx`:

```tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getRoster, removeFromRoster } from "@/lib/classes";

const buttonClassName =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50";

export function RosterList({ classId }: { classId: number }) {
  const queryClient = useQueryClient();

  const {
    data: roster,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["roster", classId],
    queryFn: () => getRoster(classId),
  });

  const mutation = useMutation({
    mutationFn: (studentId: number) => removeFromRoster(classId, studentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["roster", classId] });
    },
  });

  if (isPending) {
    return <p className="text-sm text-zinc-600">Loading roster...</p>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="font-medium text-red-900">Unable to load roster</p>

        <p className="mt-1 text-sm text-red-700">{error.message}</p>

        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (roster.length === 0) {
    return <p className="text-sm text-zinc-600">No students enrolled yet.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
      {roster.map((entry) => (
        <li key={entry.id} className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-900">
            {entry.student.first_name} {entry.student.last_name}
          </span>

          <button
            type="button"
            className={buttonClassName}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(entry.student.id)}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Write the file above**
- [ ] **Step 5: Run `pnpm --dir apps/web test roster-list` — expect PASS**

### Step 6: Add-student-to-roster component

Create `apps/web/src/components/classes/add-student-to-roster.tsx`:

```tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { addToRoster, getRoster } from "@/lib/classes";
import { getStudents } from "@/lib/students";

const fieldClassName =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

const errorClassName = "mt-1 text-sm text-red-700";

export function AddStudentToRoster({ classId }: { classId: number }) {
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const { data: students } = useQuery({
    queryKey: ["students", "active"],
    queryFn: () => getStudents("active"),
  });

  const { data: roster } = useQuery({
    queryKey: ["roster", classId],
    queryFn: () => getRoster(classId),
  });

  const enrolledIds = new Set(roster?.map((entry) => entry.student.id));
  const eligibleStudents = students?.filter((student) => !enrolledIds.has(student.id)) ?? [];

  const mutation = useMutation({
    mutationFn: (studentId: number) => addToRoster(classId, studentId),
    onSuccess: async () => {
      setSelectedStudentId("");
      await queryClient.invalidateQueries({ queryKey: ["roster", classId] });
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (selectedStudentId) {
      mutation.mutate(Number(selectedStudentId));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex items-start gap-2">
      <div className="flex-1">
        <select
          value={selectedStudentId}
          onChange={(event) => setSelectedStudentId(event.target.value)}
          disabled={eligibleStudents.length === 0}
          className={fieldClassName}
        >
          <option value="">
            {eligibleStudents.length === 0
              ? "All active students are already enrolled"
              : "Select a student"}
          </option>
          {eligibleStudents.map((student) => (
            <option key={student.id} value={student.id}>
              {student.first_name} {student.last_name}
            </option>
          ))}
        </select>

        {mutation.isError && (
          <p className={errorClassName}>
            {mutation.error instanceof Error ? mutation.error.message : "Unable to add student"}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!selectedStudentId || mutation.isPending}
        className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? "Adding..." : "Add"}
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Write the file above**

### Step 7: Class edit form

Create `apps/web/src/components/classes/class-edit-form.tsx`. It reuses `createClassSchema` from Task 4 (same fields and validation as the create form), pre-filled from an existing class rather than starting blank, and calls `updateClass` on submit instead of `createClass`:

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { updateClass } from "@/lib/classes";
import { getPrograms } from "@/lib/programs";
import {
  createClassSchema,
  type CreateClassFormValues,
  type CreateClassValues,
} from "@/schemas/class";
import type { Class } from "@/types/class";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

export function ClassEditForm({ classItem }: { classItem: Class }) {
  const queryClient = useQueryClient();

  const { data: programs } = useQuery({
    queryKey: ["programs", "active"],
    queryFn: () => getPrograms("active"),
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateClassFormValues, unknown, CreateClassValues>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      program_id: String(classItem.program_id),
      name: classItem.name,
      description: classItem.description ?? "",
      weekdays: classItem.schedule.weekdays,
      // The API serializes time as "HH:MM:SS"; <input type="time"> needs "HH:MM".
      start_time: classItem.schedule.start_time.slice(0, 5),
      end_time: classItem.schedule.end_time.slice(0, 5),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateClassValues) => updateClass(classItem.id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      await queryClient.invalidateQueries({ queryKey: ["class", classItem.id] });
    },
  });

  async function onSubmit(values: CreateClassValues) {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setError("root", {
        type: "server",
        message: error instanceof Error ? error.message : "Unable to save class",
      });
    }
  }

  const fieldClassName =
    "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  const errorClassName = "mt-1 text-sm text-red-700";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-950">Edit class</h2>
      </div>

      <div className="grid gap-5">
        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Name</span>

          <input {...register("name")} className={fieldClassName} />

          {errors.name && <p className={errorClassName}>{errors.name.message}</p>}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Program</span>

          <select {...register("program_id")} className={fieldClassName}>
            {programs?.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>

          {errors.program_id && (
            <p className={errorClassName}>{errors.program_id.message}</p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Description</span>

          <textarea {...register("description")} rows={3} className={fieldClassName} />

          {errors.description && (
            <p className={errorClassName}>{errors.description.message}</p>
          )}
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-zinc-800">Days</legend>

          <div className="mt-1 flex flex-wrap gap-3">
            {WEEKDAY_OPTIONS.map((day) => (
              <label
                key={day.value}
                className="flex items-center gap-1.5 text-sm text-zinc-700"
              >
                <input type="checkbox" value={day.value} {...register("weekdays")} />
                {day.label}
              </label>
            ))}
          </div>

          {errors.weekdays && <p className={errorClassName}>{errors.weekdays.message}</p>}
        </fieldset>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Start time</span>

            <input type="time" {...register("start_time")} className={fieldClassName} />

            {errors.start_time && (
              <p className={errorClassName}>{errors.start_time.message}</p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-800">End time</span>

            <input type="time" {...register("end_time")} className={fieldClassName} />

            {errors.end_time && <p className={errorClassName}>{errors.end_time.message}</p>}
          </label>
        </div>
      </div>

      {errors.root && (
        <div className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

      {mutation.isSuccess && (
        <div className="mt-5 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Changes saved.
        </div>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 7: Write the file above**

### Step 8: Class detail component and page

Create `apps/web/src/components/classes/class-detail.tsx` — the client component that fetches the class and renders the edit form plus roster:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";

import { AddStudentToRoster } from "@/components/classes/add-student-to-roster";
import { ClassEditForm } from "@/components/classes/class-edit-form";
import { RosterList } from "@/components/classes/roster-list";
import { getClass } from "@/lib/classes";

export function ClassDetail({ classId }: { classId: number }) {
  const {
    data: classItem,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["class", classId],
    queryFn: () => getClass(classId),
  });

  if (isPending) {
    return <p className="text-sm text-zinc-600">Loading class...</p>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="font-medium text-red-900">Unable to load class</p>

        <p className="mt-1 text-sm text-red-700">{error.message}</p>

        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950">{classItem.name}</h1>
      </div>

      <div className="grid gap-8">
        <ClassEditForm classItem={classItem} />

        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-zinc-950">Roster</h2>

          <AddStudentToRoster classId={classId} />
          <RosterList classId={classId} />
        </section>
      </div>
    </main>
  );
}
```

Create `apps/web/src/app/(app)/classes/[id]/page.tsx` — a thin Server Component that only parses the route param and hands off to the client component above:

```tsx
import { notFound } from "next/navigation";

import { ClassDetail } from "@/components/classes/class-detail";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const classId = Number(id);

  if (Number.isNaN(classId)) {
    notFound();
  }

  return <ClassDetail classId={classId} />;
}
```

- [ ] **Step 8: Write both files above**

### Step 9: Manual check + lint/typecheck

- [ ] **Step 9a:** Visit `/classes`, click "Manage" on a class, confirm you land on `/classes/{id}` with the edit form pre-filled and an empty roster. Add a student, confirm they appear; remove them, confirm they disappear; re-add the same student, confirm it succeeds (proves the re-enrollment path end-to-end, not just in tests). Edit the class's schedule and save; confirm the change is reflected back on `/classes`.
- [ ] **Step 9b:** Confirm the "Classes" nav item stays highlighted while on `/classes/{id}` (this is what Step 2's fix was for), and that visiting `/classes/not-a-number` renders the not-found page rather than crashing.
- [ ] **Step 9c:** `pnpm --dir apps/web lint` and `pnpm --dir apps/web typecheck`.
- [ ] **Step 9d:** `pnpm --dir apps/web test` (full suite) — confirm nothing else broke.

### Step 10: Commit

```bash
git add apps/web/src/types/class.ts apps/web/src/lib/classes.ts \
  "apps/web/src/app/(app)/classes/[id]" \
  apps/web/src/components/classes/class-detail.tsx \
  apps/web/src/components/classes/class-edit-form.tsx \
  apps/web/src/components/classes/roster-list.tsx \
  apps/web/src/components/classes/roster-list.test.tsx \
  apps/web/src/components/classes/add-student-to-roster.tsx \
  apps/web/src/components/layout/nav/nav-list.tsx
git commit -m "feat: add class detail page with edit form and roster management"
```

- [ ] **Step 10: Commit as above**

---

## After Task 6

Update `CLAUDE.md`'s domain glossary to add an explicit definition for **Class** (the recurring offering) alongside the existing **Program** and **Class session** entries, per the spec's "Consequences" section. This is a small, separate documentation commit — not part of any task above, since it's project-wide rather than tied to one slice's file set.
