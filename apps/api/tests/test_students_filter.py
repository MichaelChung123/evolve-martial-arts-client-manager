from collections.abc import Callable
from datetime import UTC, datetime

from app.models.student import Student
from fastapi.testclient import TestClient

ARCHIVED_ON = datetime(2026, 1, 1, tzinfo=UTC)


def test_default_excludes_archived_students(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(first_name="Active")
    make_student(first_name="Archived", archived_at=ARCHIVED_ON)

    response = client.get("/api/students")

    assert len(response.json()) > 0
    assert all(student["archived_at"] is None for student in response.json())


def test_status_archived_returns_only_archived(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(first_name="Active")
    make_student(first_name="Archived", archived_at=ARCHIVED_ON)

    response = client.get("/api/students", params={"status": "archived"})

    assert len(response.json()) > 0
    assert all(student["archived_at"] is not None for student in response.json())


def test_status_all_returns_both(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(first_name="Active")
    make_student(first_name="Archived", archived_at=ARCHIVED_ON)

    response = client.get("/api/students", params={"status": "all"})

    assert len(response.json()) == 2


def test_invalid_status_is_rejected(client: TestClient) -> None:
    response = client.get("/api/students", params={"status": "bogus"})

    assert response.status_code == 422


def test_pagination_composes_with_the_filter(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(last_name="Aardvark", archived_at=ARCHIVED_ON)

    for index in range(3):
        make_student(last_name=f"Active{index}")

    response = client.get("/api/students", params={"limit": 2})

    assert len(response.json()) == 2
    assert all(student["last_name"].startswith("Active") for student in response.json())


def test_response_exposes_archived_at(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(first_name="Archived", archived_at=ARCHIVED_ON)

    response = client.get("/api/students", params={"status": "archived"})

    assert response.json()[0]["archived_at"] is not None


def test_active_student_reports_null_archived_at(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(first_name="Active")

    response = client.get("/api/students")

    assert response.json()[0]["archived_at"] is None
