from datetime import datetime
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.workspaces.domain import DEFAULT_WORKSPACE_ID


def create_project(client: TestClient, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {"title": "Cell viability study"}
    payload.update(overrides)
    response = client.post("/api/v1/projects", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_read_and_uuid_utc_conventions(client: TestClient) -> None:
    created = create_project(
        client,
        title="  Cell viability study  ",
        description="  Pilot project  ",
        objective="Compare treatment response",
        start_date="2026-08-19",
        end_date="2026-08-20",
        tags=[" CCK-8 ", "cck-8", " Cells "],
    )

    assert UUID(str(created["id"]))
    assert UUID(str(created["workspace_id"])) == DEFAULT_WORKSPACE_ID
    assert created["title"] == "Cell viability study"
    assert created["tags"] == ["CCK-8", "Cells"]
    assert created["status"] == "planning"
    assert created["revision"] == 1
    assert datetime.fromisoformat(str(created["created_at"])).utcoffset() is not None

    response = client.get(f"/api/v1/projects/{created['id']}")
    assert response.status_code == 200
    assert response.json() == created


def test_list_search_status_and_archive_filters(client: TestClient) -> None:
    planning = create_project(client, title="Planning project")
    active = create_project(client, title="Active microscopy", status="active")
    archive_response = client.post(
        f"/api/v1/projects/{planning['id']}/archive",
        json={"expected_revision": planning["revision"]},
    )
    assert archive_response.status_code == 200

    current_response = client.get("/api/v1/projects")
    assert current_response.status_code == 200
    assert [item["id"] for item in current_response.json()["items"]] == [active["id"]]

    archived_response = client.get("/api/v1/projects", params={"archived": "true"})
    assert archived_response.status_code == 200
    assert archived_response.json()["items"][0]["status"] == "archived"

    status_response = client.get("/api/v1/projects", params={"status": "active"})
    assert status_response.json()["total"] == 1
    search_response = client.get("/api/v1/projects", params={"search": "MICRO"})
    assert search_response.json()["items"][0]["id"] == active["id"]


def test_update_increments_revision_and_stale_update_is_rejected(client: TestClient) -> None:
    project = create_project(client)
    response = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={
            "expected_revision": project["revision"],
            "title": "Updated study",
            "status": "active",
        },
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Updated study"
    assert updated["revision"] == 2

    stale_response = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"expected_revision": 1, "title": "Silent overwrite"},
    )
    assert stale_response.status_code == 409
    assert stale_response.json()["detail"]["code"] == "project_revision_conflict"
    assert client.get(f"/api/v1/projects/{project['id']}").json()["title"] == "Updated study"


def test_archive_persists_and_requires_expected_revision(client: TestClient) -> None:
    project = create_project(client, status="active")
    response = client.post(
        f"/api/v1/projects/{project['id']}/archive",
        json={"expected_revision": 1},
    )
    assert response.status_code == 200
    archived = response.json()
    assert archived["status"] == "archived"
    assert archived["revision"] == 2
    assert client.get(f"/api/v1/projects/{project['id']}").json()["status"] == "archived"

    stale_response = client.post(
        f"/api/v1/projects/{project['id']}/archive",
        json={"expected_revision": 1},
    )
    assert stale_response.status_code == 409
    assert stale_response.json()["detail"]["code"] == "project_revision_conflict"


def test_validation_not_found_lifecycle_and_no_hard_delete(client: TestClient) -> None:
    assert client.post("/api/v1/projects", json={"title": "   "}).status_code == 422
    assert (
        client.post(
            "/api/v1/projects",
            json={"title": "Invalid dates", "start_date": "2026-08-20", "end_date": "2026-08-19"},
        ).status_code
        == 422
    )

    completed = create_project(client, title="Completed project", status="completed")
    lifecycle_response = client.patch(
        f"/api/v1/projects/{completed['id']}",
        json={"expected_revision": 1, "status": "active"},
    )
    assert lifecycle_response.status_code == 409
    assert lifecycle_response.json()["detail"]["code"] == "project_state_conflict"

    invalid_patch = client.patch(
        f"/api/v1/projects/{completed['id']}",
        json={"expected_revision": 1, "tags": None},
    )
    assert invalid_patch.status_code == 422

    missing_id = uuid4()
    assert client.get(f"/api/v1/projects/{missing_id}").status_code == 404
    assert client.delete(f"/api/v1/projects/{completed['id']}").status_code == 405
