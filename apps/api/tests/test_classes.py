"""CRUD, schedule, and archive/restore behavior for classes."""

from collections.abc import Callable
from datetime import UTC, datetime

from app.models.class_ import Class
from app.models.program import Program
from fastapi.testclient import TestClient

MISSING_CLASS_ID = 999999
ARCHIVED_ON = datetime(2026, 1, 1, tzinfo=UTC)


def test_create_class_returns_the_class_with_its_schedule(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): POST /api/classes with a program_id, name, and a schedule
    # of { weekdays: [1, 3], start_time: "17:00:00", end_time: "18:00:00" }.
    # Assert the response echoes the schedule back.
    response = client.post(
        "/api/classes",
        json={
            "program_id": make_program().id,
            "name": "Test Class",
            "schedule": {
                "weekdays": [1, 3],
                "start_time": "17:00:00",
                "end_time": "18:00:00",
            },
        },
    )

    assert response.status_code == 201
    assert response.json()["schedule"]["weekdays"] == [1, 3]


def test_creating_a_class_with_no_weekdays_is_rejected(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): POST /api/classes with schedule.weekdays = []. What status
    # code should this produce, and where is that rule enforced?
    response = client.post(
        "/api/classes",
        json={
            "program_id": make_program().id,
            "name": "Test Class",
            "schedule": {
                "weekdays": [],
                "start_time": "17:00:00",
                "end_time": "18:00:00",
            },
        },
    )

    assert response.status_code == 422


def test_creating_a_class_where_end_time_precedes_start_time_is_rejected(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): POST /api/classes with schedule.end_time < schedule.start_time.
    # What status code should this produce, and where is that rule enforced?
    response = client.post(
        "/api/classes",
        json={
            "program_id": make_program().id,
            "name": "Test Class",
            "schedule": {
                "weekdays": [1, 3],
                "start_time": "18:00:00",
                "end_time": "17:00:00",
            },
        },
    )

    assert response.status_code == 422


def test_list_classes_defaults_to_active(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    # TODO(you): create one active and one archived class, GET /api/classes
    # with no query params, assert only the active one comes back.
    make_class()
    make_class(archived_at=ARCHIVED_ON)
    response = client.get("/api/classes")
    assert (len(response.json())) == 1


def test_list_classes_can_filter_by_program(
    client: TestClient,
    make_class: Callable[..., Class],
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): create classes under two different programs, GET
    # /api/classes?program_id=<one of them>, assert only that program's
    # class comes back.
    program1 = make_program()
    program2 = make_program()
    make_class(program_id=program1.id)
    make_class(program_id=program2.id)
    response = client.get(f"/api/classes?program_id={program1.id}")
    assert (len(response.json())) == 1
    assert response.json()[0]["program_id"] == program1.id


def test_get_unknown_class_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/classes/{MISSING_CLASS_ID}")

    assert response.status_code == 404


def test_update_class_replaces_the_schedule(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    # TODO(you): PATCH a class's schedule to a different set of weekdays.
    # Assert the response's schedule reflects only the new weekdays (the
    # old ones are gone, not merged in).
    class_ = make_class()
    response = client.patch(
        f"/api/classes/{class_.id}",
        json={
            "schedule": {
                "weekdays": [0, 2, 4],
                "start_time": "17:00:00",
                "end_time": "18:00:00",
            },
        },
    )
    assert response.status_code == 200
    assert response.json()["schedule"]["weekdays"] == [0, 2, 4]


def test_archive_sets_the_timestamp(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    class_ = make_class()
    response = client.post(f"/api/classes/{class_.id}/archive")
    assert response.status_code == 200
    assert response.json()["archived_at"] is not None


def test_restore_clears_the_timestamp(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    class_ = make_class(archived_at=ARCHIVED_ON)
    response = client.post(f"/api/classes/{class_.id}/restore")
    assert response.status_code == 200
    assert response.json()["archived_at"] is None


def test_archiving_a_program_does_not_archive_its_classes(
    client: TestClient,
    make_class: Callable[..., Class],
) -> None:
    # TODO(you): archive the program that owns a class (POST
    # /api/programs/{id}/archive), then GET the class. Assert it is still
    # active. This is the explicit no-cascade rule from the spec.
    class_ = make_class()
    response = client.post(f"/api/programs/{class_.program_id}/archive")
    assert response.status_code == 200
    response = client.get(f"/api/classes/{class_.id}")
    assert response.status_code == 200
    assert response.json()["archived_at"] is None
