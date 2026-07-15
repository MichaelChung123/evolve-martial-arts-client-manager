from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.student import StudentCreate, StudentResponse, StudentUpdate
from app.services import student_service

router = APIRouter(prefix="/students", tags=["Students"])

DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[StudentResponse])
def list_students(
    db: DatabaseSession,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
) -> list[StudentResponse]:
    return student_service.list_students(
        db,
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
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A student with this email already exists",
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
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A student with this email already exists",
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


@router.delete(
    "/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_student(
    student_id: int,
    db: DatabaseSession,
) -> Response:
    student = student_service.get_student(db, student_id)

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    student_service.delete_student(db, student)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
