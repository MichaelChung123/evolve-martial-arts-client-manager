from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.class_ import (
    ClassCreate,
    ClassResponse,
    ClassStatusFilter,
    ClassUpdate,
)
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Class not found"
        )

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Class not found"
        )

    return class_service.update_class(db, class_, class_data)


@router.post("/{class_id}/archive", response_model=ClassResponse)
def archive_class(class_id: int, db: DatabaseSession) -> ClassResponse:
    class_ = class_service.get_class(db, class_id)

    if class_ is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Class not found"
        )

    return class_service.archive_class(db, class_)


@router.post("/{class_id}/restore", response_model=ClassResponse)
def restore_class(class_id: int, db: DatabaseSession) -> ClassResponse:
    class_ = class_service.get_class(db, class_id)

    if class_ is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Class not found"
        )

    return class_service.restore_class(db, class_)
