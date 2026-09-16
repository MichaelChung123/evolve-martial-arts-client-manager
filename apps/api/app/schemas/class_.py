from datetime import datetime, time
from enum import StrEnum
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ClassStatusFilter(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    ALL = "all"


class Schedule(BaseModel):
    # Field(ge=0, le=6) sits INSIDE the Annotated type parameter, so it
    # constrains each list element. Putting ge/le on the outer Field(...)
    # instead (as list[int] = Field(ge=0, le=6, ...)) would try to apply a
    # numeric-range constraint to the list itself, which Pydantic v2 either
    # ignores or rejects, depending on the constraint.
    weekdays: list[Annotated[int, Field(ge=0, le=6)]] = Field(min_length=1)
    start_time: time
    end_time: time

    @field_validator("weekdays")
    @classmethod
    def weekdays_must_be_unique(cls, value: list[int]) -> list[int]:
        # There's no Field(...) kwarg for "no duplicate elements" in
        # Pydantic v2 (the old unique_items=True was removed) — comparing
        # len(set(value)) to len(value) is the standard way to check it
        # while keeping the field a list (order-preserving), not a set.
        if len(set(value)) != len(value):
            raise ValueError("weekdays must not contain duplicates")
        return value

    @model_validator(mode="after")
    def end_time_must_be_after_start_time(self) -> "Schedule":
        # This needs both fields at once, so it can't live on either field
        # individually — mode="after" runs once the whole model is built,
        # with self already populated.
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class ClassBase(BaseModel):
    program_id: int
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    schedule: Schedule


class ClassCreate(ClassBase):
    pass


class ClassUpdate(BaseModel):
    program_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None)
    schedule: Schedule | None = None


class ClassResponse(ClassBase):
    id: int
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def assemble_schedule_from_orm(cls, data: Any) -> Any:
        # `data` is whatever gets passed to model_validate(): a dict when
        # building from JSON (e.g. a test constructing a ClassResponse
        # directly), or the raw Class ORM instance when FastAPI serializes
        # a route's response_model. Only the ORM instance needs reshaping —
        # it has schedule_days/start_time/end_time as separate attributes,
        # not a single `schedule` field, so there's nothing for a per-field
        # validator to read; this has to run before per-field extraction.
        if isinstance(data, dict):
            return data

        return {
            "id": data.id,
            "program_id": data.program_id,
            "name": data.name,
            "description": data.description,
            "schedule": Schedule(
                weekdays=[day.weekday for day in data.schedule_days],
                start_time=data.start_time,
                end_time=data.end_time,
            ),
            "archived_at": data.archived_at,
            "created_at": data.created_at,
            "updated_at": data.updated_at,
        }
