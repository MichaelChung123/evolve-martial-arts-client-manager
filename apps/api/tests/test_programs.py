"""CRUD and archive/restore behavior for programs."""

from collections.abc import Callable
from datetime import UTC, datetime

from app.models.program import Program
from fastapi.testclient import TestClient

ARCHIVED_ON = datetime(2026, 1, 1, tzinfo=UTC)
MISSING_PROGRAM_ID = 999999


def test_create_program_returns_the_program(client: TestClient) -> None:
    # TODO(you): POST /api/programs with a name (and optionally a
    # description). Assert the response status code and that the response
    # body echoes the name back.
    response = client.post("/api/programs", json={"name": "Test Name"})

    assert response.status_code == 201
    assert response.json()["name"] == "Test Name"


def test_creating_a_program_without_a_name_is_rejected(client: TestClient) -> None:
    # TODO(you): POST /api/programs with an empty JSON body. What status
    # code should a missing required field produce?

    response = client.post("/api/programs")

    assert response.status_code == 422


def test_list_programs_defaults_to_active(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): create one active and one archived program, then GET
    # /api/programs with no query params. Assert only the active one comes
    # back.
    make_program()
    make_program(archived_at=ARCHIVED_ON)

    response = client.get("/api/programs")

    assert (len(response.json())) == 1


def test_list_programs_can_include_archived(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): same setup as above, but GET /api/programs?status=all.
    # Assert both programs come back.
    make_program()
    make_program(archived_at=ARCHIVED_ON)

    response = client.get("/api/programs?status=all")

    assert (len(response.json())) == 2


def test_get_unknown_program_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/programs/{MISSING_PROGRAM_ID}")

    assert response.status_code == 404


def test_update_program_changes_the_name(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): PATCH a program's name and assert the response reflects
    # the change.
    NEW_NAME = "Test Name 2"
    program = make_program(name="Test Name")
    response = client.patch(f"/api/programs/{program.id}", json={"name": NEW_NAME})
    assert response.json()["name"] == NEW_NAME


def test_archive_sets_the_timestamp(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): mirror test_archive_sets_the_timestamp in
    # test_students_archive.py, adapted for /api/programs.
    program = make_program()

    response = client.post(f"/api/programs/{program.id}/archive")

    assert response.status_code == 200 and response.json()["archived_at"] is not None


def test_rearchiving_preserves_the_original_timestamp(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    # TODO(you): a program archived at ARCHIVED_ON, then archived again via
    # the API — the timestamp must not change. Why does this rule exist?
    program = make_program(archived_at=ARCHIVED_ON)

    original = client.get(f"/api/programs/{program.id}")
    original_achived_at = original.json()["archived_at"]

    response = client.post(f"/api/programs/{program.id}/archive")

    assert (
        response.status_code == 200
        and response.json()["archived_at"] == original_achived_at
    )


def test_restore_clears_the_timestamp(
    client: TestClient,
    make_program: Callable[..., Program],
) -> None:
    program = make_program(archived_at=ARCHIVED_ON)

    response = client.post(f"/api/programs/{program.id}/restore")

    assert response.json()["archived_at"] is None


def test_archive_unknown_program_returns_404(client: TestClient) -> None:
    response = client.post(f"/api/programs/{MISSING_PROGRAM_ID}/archive")

    assert response.status_code == 404
