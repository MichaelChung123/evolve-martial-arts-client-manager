from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.student import (
    StudentCreate,
    StudentResponse,
    StudentStatusFilter,
    StudentUpdate,
)
from app.services import student_service

router = APIRouter(
    prefix="/students", tags=["Students"], dependencies=[Depends(get_current_user)]
)

DatabaseSession = Annotated[Session, Depends(get_db)]


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


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    db: DatabaseSession,
) -> StudentResponse:
    student = student_service.get_student(db, student_id)

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return student


@router.post(
    "",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_student(
    student_data: StudentCreate,
    db: DatabaseSession,
) -> StudentResponse:
    if student_data.email:
        existing_student = student_service.get_student_by_email(
            db,
            student_data.email,
        )

        if existing_student is not None:
            archived_note = " It is archived." if existing_student.archived_at else ""

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A student with this email already exists.{archived_note}",
            )

    try:
        return student_service.create_student(db, student_data)
    except IntegrityError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create student because of conflicting data",
        ) from error


@router.patch("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    student_data: StudentUpdate,
    db: DatabaseSession,
) -> StudentResponse:
    student = student_service.get_student(db, student_id)

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    if student_data.email and student_data.email != student.email:
        existing_student = student_service.get_student_by_email(
            db,
            student_data.email,
        )

        if existing_student is not None:
            archived_note = " It is archived." if existing_student.archived_at else ""

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A student with this email already exists.{archived_note}",
            )

    try:
        return student_service.update_student(
            db,
            student,
            student_data,
        )
    except IntegrityError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to update student because of conflicting data",
        ) from error


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
