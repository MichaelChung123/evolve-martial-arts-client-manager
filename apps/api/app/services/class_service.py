from datetime import UTC, datetime
from typing import assert_never

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.class_ import Class, ClassScheduleDay
from app.schemas.class_ import ClassCreate, ClassStatusFilter, ClassUpdate


def list_classes(
    db: Session,
    *,
    offset: int = 0,
    limit: int = 100,
    status: ClassStatusFilter = ClassStatusFilter.ACTIVE,
    program_id: int | None = None,
) -> list[Class]:
    statement = select(Class).order_by(Class.name)

    match status:
        case ClassStatusFilter.ACTIVE:
            statement = statement.where(Class.archived_at.is_(None))
        case ClassStatusFilter.ARCHIVED:
            statement = statement.where(Class.archived_at.is_not(None))
        case ClassStatusFilter.ALL:
            pass
        case _:
            assert_never(status)

    if program_id is not None:
        statement = statement.where(Class.program_id == program_id)

    statement = statement.offset(offset).limit(limit)

    return list(db.scalars(statement).all())


def get_class(db: Session, class_id: int) -> Class | None:
    return db.get(Class, class_id)


def create_class(db: Session, class_data: ClassCreate) -> Class:
    fields = class_data.model_dump(exclude={"schedule"})
    class_ = Class(**fields)
    class_.schedule_days = [
        ClassScheduleDay(weekday=weekday) for weekday in class_data.schedule.weekdays
    ]
    class_.start_time = class_data.schedule.start_time
    class_.end_time = class_data.schedule.end_time

    db.add(class_)
    db.commit()
    db.refresh(class_)

    return class_


def update_class(db: Session, class_: Class, class_data: ClassUpdate) -> Class:
    changes = class_data.model_dump(exclude_unset=True, exclude={"schedule"})

    for field, value in changes.items():
        setattr(class_, field, value)

    if class_data.schedule is not None:
        class_.schedule_days = [
            ClassScheduleDay(weekday=weekday)
            for weekday in class_data.schedule.weekdays
        ]
        class_.start_time = class_data.schedule.start_time
        class_.end_time = class_data.schedule.end_time

    db.add(class_)
    db.commit()
    db.refresh(class_)

    return class_


def archive_class(db: Session, class_: Class) -> Class:
    if class_.archived_at is not None:
        return class_

    class_.archived_at = datetime.now(UTC)
    db.add(class_)
    db.commit()
    db.refresh(class_)
    return class_


def restore_class(db: Session, class_: Class) -> Class:
    class_.archived_at = None
    db.add(class_)
    db.commit()
    db.refresh(class_)
    return class_
