from datetime import UTC, datetime
from typing import assert_never

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.student import Student
from app.schemas.student import StudentCreate, StudentStatusFilter, StudentUpdate


def list_students(
    db: Session,
    *,
    offset: int = 0,
    limit: int = 100,
    status: StudentStatusFilter = StudentStatusFilter.ACTIVE,
) -> list[Student]:
    statement = select(Student).order_by(Student.last_name, Student.first_name)

    match status:
        case StudentStatusFilter.ACTIVE:
            statement = statement.where(Student.archived_at.is_(None))
        case StudentStatusFilter.ARCHIVED:
            statement = statement.where(Student.archived_at.is_not(None))
        case StudentStatusFilter.ALL:
            pass
        case _:
            assert_never(status)

    statement = statement.offset(offset).limit(limit)

    return list(db.scalars(statement).all())


def get_student(db: Session, student_id: int) -> Student | None:
    return db.get(Student, student_id)


def get_student_by_email(db: Session, email: str) -> Student | None:
    statement = select(Student).where(Student.email == email)
    return db.scalar(statement)


def create_student(db: Session, student_data: StudentCreate) -> Student:
    student = Student(**student_data.model_dump())

    db.add(student)
    db.commit()
    db.refresh(student)

    return student


def update_student(
    db: Session,
    student: Student,
    student_data: StudentUpdate,
) -> Student:
    changes = student_data.model_dump(exclude_unset=True)

    for field, value in changes.items():
        setattr(student, field, value)

    db.add(student)
    db.commit()
    db.refresh(student)

    return student


def archive_student(db: Session, student: Student) -> Student:
    # Archiving is idempotent, and deliberately preserves the original
    # timestamp: archived_at is the audit trail, so a repeated request must
    # not overwrite when the student was actually archived.
    if student.archived_at is not None:
        return student

    student.archived_at = datetime.now(UTC)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def restore_student(db: Session, student: Student) -> Student:
    student.archived_at = None
    db.add(student)
    db.commit()
    db.refresh(student)
    return student
