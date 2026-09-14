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


class ProgramBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class ProgramCreate(ProgramBase):
    pass


class ProgramUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None)


class ProgramResponse(ProgramBase):
    id: int
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
