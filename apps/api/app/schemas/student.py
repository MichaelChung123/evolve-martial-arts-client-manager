from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StudentStatusFilter(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    ALL = "all"


class StudentBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None


class StudentResponse(StudentBase):
    id: int
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
