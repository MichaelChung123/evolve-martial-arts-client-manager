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
