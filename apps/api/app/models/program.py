from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Program(Base):
    __tablename__ = "programs"

    # TODO(you): define the columns per the spec:
    #   id            primary key
    #   name          required string, e.g. max_length 100
    #   description   optional string
    #   archived_at   nullable timestamptz, indexed (mirrors Student.archived_at)
    #   created_at    timestamptz, server_default=func.now()
    #   updated_at    timestamptz, server_default=func.now(), onupdate=func.now()
    # Look at apps/api/app/models/student.py for the exact Mapped/mapped_column
    # style already used in this codebase.

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
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
