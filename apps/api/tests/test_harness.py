"""Temporary checks that the fixtures themselves work.

Deleted in Task 3 once real feature tests exercise the same fixtures. These
assert on the harness, not on application behavior.
"""

from collections.abc import Callable
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.student import Student


def test_harness_boots_and_authenticates(client: TestClient) -> None:
    response = client.get("/api/students")

    assert response.status_code == 200
    assert response.json() == []


def test_factory_persists_a_student(
    db_session: Session,
    make_student: Callable[..., Student],
) -> None:
    student = make_student(first_name="Alex")

    assert student.id is not None
    assert student.first_name == "Alex"
    assert db_session.scalar(select(func.count()).select_from(Student)) == 1


def test_first_test_leaves_a_student_behind(
    db_session: Session,
    make_student: Callable[..., Student],
) -> None:
    make_student()

    assert db_session.scalar(select(func.count()).select_from(Student)) == 1


def test_second_test_sees_a_clean_database(db_session: Session) -> None:
    """Fails if the previous test's commit leaked past the outer rollback."""
    assert db_session.scalar(select(func.count()).select_from(Student)) == 0


def test_factory_accepts_archived_at_override(
    make_student: Callable[..., Student],
) -> None:
    """Task 2 added the column; the factory takes it through **overrides."""
    archived = make_student(archived_at=datetime(2026, 1, 1, tzinfo=UTC))
    active = make_student()

    assert archived.archived_at == datetime(2026, 1, 1, tzinfo=UTC)
    assert active.archived_at is None


def test_client_and_factory_share_one_session(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    """The API must see rows the factory wrote, or every later test is a lie."""
    make_student(first_name="Visible")

    response = client.get("/api/students")

    assert response.status_code == 200
    assert [student["first_name"] for student in response.json()] == ["Visible"]
