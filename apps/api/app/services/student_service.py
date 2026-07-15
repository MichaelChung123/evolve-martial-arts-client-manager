from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


def list_students(
    db: Session,
    *,
    offset: int = 0,
    limit: int = 100,
) -> list[Student]:
    statement = (
        select(Student)
        .order_by(Student.last_name, Student.first_name)
        .offset(offset)
        .limit(limit)
    )

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


def delete_student(db: Session, student: Student) -> None:
    db.delete(student)
    db.commit()
