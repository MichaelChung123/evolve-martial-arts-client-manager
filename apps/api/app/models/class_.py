from datetime import datetime, time

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Class(Base):
    __tablename__ = "classes"

    # TODO(you): define the columns per the spec:
    #   id            primary key
    #   program_id    FK -> programs.id, required, ondelete="RESTRICT"
    #   name          required string, max_length 100
    #   description   optional string
    #   start_time    Time, required
    #   end_time      Time, required
    #   archived_at   nullable timestamptz, indexed
    #   created_at    timestamptz, server_default=func.now()
    #   updated_at    timestamptz, server_default=func.now(), onupdate=func.now()
    #
    # Also add a relationship so the service layer can read a class's
    # schedule days:
    #   schedule_days: Mapped[list["ClassScheduleDay"]] = relationship(
    #       back_populates="class_", cascade="all, delete-orphan"
    #   )
    id: Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("programs.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )
    start_time: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )
    end_time: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    schedule_days: Mapped[list["ClassScheduleDay"]] = relationship(
        back_populates="class_", cascade="all, delete-orphan"
    )


class ClassScheduleDay(Base):
    __tablename__ = "class_schedule_days"

    # TODO(you): define the columns:
    #   id         primary key
    #   class_id   FK -> classes.id, required, ondelete="CASCADE"
    #   weekday    small integer, 0 (Monday) - 6 (Sunday)
    #
    # Add the back-reference and the spec's uniqueness rule (a class can't
    # have the same weekday twice):
    #   class_: Mapped["Class"] = relationship(back_populates="schedule_days")
    #   __table_args__ = (UniqueConstraint("class_id", "weekday"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=False,
    )
    weekday: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    class_: Mapped["Class"] = relationship(back_populates="schedule_days")
    __table_args__ = (UniqueConstraint("class_id", "weekday"),)
