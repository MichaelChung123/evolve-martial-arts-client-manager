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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Program not found"
        )

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Program not found"
        )

    return program_service.update_program(db, program, program_data)


@router.post("/{program_id}/archive", response_model=ProgramResponse)
def archive_program(program_id: int, db: DatabaseSession) -> ProgramResponse:
    program = program_service.get_program(db, program_id)

    if program is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Program not found"
        )

    return program_service.archive_program(db, program)


@router.post("/{program_id}/restore", response_model=ProgramResponse)
def restore_program(program_id: int, db: DatabaseSession) -> ProgramResponse:
    program = program_service.get_program(db, program_id)

    if program is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Program not found"
        )

    return program_service.restore_program(db, program)
