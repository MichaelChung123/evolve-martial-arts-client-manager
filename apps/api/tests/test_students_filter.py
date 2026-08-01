"""Behavior of the `status` filter on GET /api/students.

Arrangement and the request are set up for you. Write the assertions where the
TODO(you) markers are, run them, and confirm they fail before implementing.
"""

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

    # TODO(you): assert only the active student comes back.
    # Question: assert on the whole payload, or just the names? Which
    # one fails for the right reason when someone later adds a field?
    assert len(response.json()) > 0
    assert all(student["archived_at"] is None for student in response.json())


def test_status_archived_returns_only_archived(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(first_name="Active")
    make_student(first_name="Archived", archived_at=ARCHIVED_ON)

    response = client.get("/api/students", params={"status": "archived"})

    # TODO(you): assert only the archived student comes back.
    assert len(response.json()) > 0
    assert all(student["archived_at"] is not None for student in response.json())


def test_status_all_returns_both(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(first_name="Active")
    make_student(first_name="Archived", archived_at=ARCHIVED_ON)

    response = client.get("/api/students", params={"status": "all"})

    # TODO(you): assert both come back.
    assert len(response.json()) == 2


def test_invalid_status_is_rejected(client: TestClient) -> None:
    response = client.get("/api/students", params={"status": "bogus"})

    # TODO(you): which status code does FastAPI return for an invalid
    # enum query parameter -- 400 or 422? Assert the one you expect,
    # then let the run tell you whether you were right.
    assert response.status_code == 422


def test_pagination_composes_with_the_filter(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    # Ordering is by last_name, so the archived student sorts FIRST and would
    # land inside the first page. That is what separates the two
    # implementations: filtering before paginating returns Active0 and Active1,
    # while paginating before filtering returns Aardvark and Active0, then
    # drops Aardvark and yields only Active0.
    make_student(last_name="Aardvark", archived_at=ARCHIVED_ON)

    for index in range(3):
        make_student(last_name=f"Active{index}")

    response = client.get("/api/students", params={"limit": 2})

    # TODO(you): assert the limit applies to active students only.
    # Question: if the implementation filtered *after* paginating,
    # what would this return instead? Make the assertion catch that.
    assert len(response.json()) == 2
    assert all(student["last_name"].startswith("Active") for student in response.json())


def test_response_exposes_archived_at(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(first_name="Archived", archived_at=ARCHIVED_ON)

    response = client.get("/api/students", params={"status": "archived"})

    # TODO(you): assert archived_at is present and non-null in the payload.
    assert response.json()[0]["archived_at"] is not None


def test_active_student_reports_null_archived_at(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(first_name="Active")

    response = client.get("/api/students")

    # TODO(you): assert archived_at is present and null. The field must
    # appear for active students too, or the frontend cannot tell
    # "not archived" from "field missing".
    assert response.json()[0]["archived_at"] is None
