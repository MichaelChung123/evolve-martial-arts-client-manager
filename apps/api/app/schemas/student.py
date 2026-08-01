from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# TODO(you) Step 4: define StudentStatusFilter with values
# "active", "archived", "all".
# Question: StrEnum or Literal["active", "archived", "all"]? One gives you
# a named type you can import into the service layer and a self-documenting
# enum in OpenAPI; the other is fewer lines. Which cost are you paying, and
# where does it show up?


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
    # TODO(you) Step 5: add archived_at here.
    # Question: it belongs on the response but not on StudentBase -- what
    # would break if you put it on the base that StudentCreate inherits?
    # Four tests currently fail with KeyError: 'archived_at' because of this.
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
