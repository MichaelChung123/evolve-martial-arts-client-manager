"""Archive and restore transitions on students."""

from collections.abc import Callable
from datetime import UTC, datetime

from app.models.student import Student
from fastapi.testclient import TestClient

ARCHIVED_ON = datetime(2026, 1, 1, tzinfo=UTC)
MISSING_STUDENT_ID = 999999


def test_archive_sets_the_timestamp(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    student = make_student()

    response = client.post(f"/api/students/{student.id}/archive")

    assert response.status_code == 200 and response.json()["archived_at"] is not None


def test_archived_student_leaves_the_default_list(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    student = make_student(first_name="Departing")
    client.post(f"/api/students/{student.id}/archive")

    response = client.get("/api/students")

    assert all(student["first_name"] != "Departing" for student in response.json())


def test_rearchiving_preserves_the_original_timestamp(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    student = make_student(archived_at=ARCHIVED_ON)
    original = client.get(f"/api/students/{student.id}").json()["archived_at"]

    response = client.post(f"/api/students/{student.id}/archive")

    # This is the audit-trail rule from the spec: a double-click must not
    # rewrite history. No other test in this file can catch that.
    assert response.status_code == 200 and response.json()["archived_at"] == original


def test_restore_clears_the_timestamp(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    student = make_student(archived_at=ARCHIVED_ON)

    response = client.post(f"/api/students/{student.id}/restore")

    assert response.status_code == 200 and response.json()["archived_at"] is None


def test_restored_student_returns_to_the_default_list(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    student = make_student(first_name="Returning", archived_at=ARCHIVED_ON)
    client.post(f"/api/students/{student.id}/restore")

    response = client.get("/api/students")

    assert any(student["first_name"] == "Returning" for student in response.json())


def test_restoring_an_active_student_is_a_no_op(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    student = make_student()

    response = client.post(f"/api/students/{student.id}/restore")

    assert response.status_code == 200 and response.json()["archived_at"] is None


def test_archive_unknown_student_returns_404(client: TestClient) -> None:
    response = client.post(f"/api/students/{MISSING_STUDENT_ID}/archive")

    assert response.status_code == 404


def test_restore_unknown_student_returns_404(client: TestClient) -> None:
    response = client.post(f"/api/students/{MISSING_STUDENT_ID}/restore")

    assert response.status_code == 404


def test_archived_student_is_still_retrievable_by_id(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    student = make_student(archived_at=ARCHIVED_ON)

    response = client.get(f"/api/students/{student.id}")

    # it does not make them unreachable.
    assert response.status_code == 200


def test_duplicate_email_conflicts_even_when_the_holder_is_archived(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    make_student(email="returning@example.com", archived_at=ARCHIVED_ON)

    response = client.post(
        "/api/students",
        json={
            "first_name": "Returning",
            "last_name": "Student",
            "email": "returning@example.com",
        },
    )

    assert (
        response.status_code == 409
        and response.json()["detail"]
        == "A student with this email already exists. It is archived."
    )


def test_delete_endpoint_is_gone(
    client: TestClient,
    make_student: Callable[..., Student],
) -> None:
    student = make_student()

    response = client.delete(f"/api/students/{student.id}")

    assert response.status_code == 405
