from datetime import datetime
from uuid import UUID, uuid4

from fastapi.testclient import TestClient


def create_project(client: TestClient, title: str = "Experiment Project") -> dict[str, object]:
    response = client.post("/api/v1/projects", json={"title": title})
    assert response.status_code == 201, response.text
    return response.json()


def create_run(
    client: TestClient,
    project_id: object,
    **overrides: object,
) -> dict[str, object]:
    payload: dict[str, object] = {"project_id": project_id, "title": "Pilot Experiment"}
    payload.update(overrides)
    response = client.post("/api/v1/experiment-runs", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_read_and_time_boundaries(client: TestClient) -> None:
    project = create_project(client)
    created = create_run(
        client,
        project["id"],
        title="  Pilot Experiment  ",
        purpose="  Verify response  ",
        status="planned",
        planned_start_at="2026-08-20T09:00:00+08:00",
        planned_end_at="2026-08-20T11:00:00+08:00",
    )

    assert UUID(str(created["id"]))
    assert created["project_id"] == project["id"]
    assert created["title"] == "Pilot Experiment"
    assert created["purpose"] == "Verify response"
    assert created["status"] == "planned"
    assert created["actual_start_at"] is None
    assert created["actual_end_at"] is None
    assert datetime.fromisoformat(str(created["planned_start_at"])).utcoffset() is not None
    assert client.get(f"/api/v1/experiment-runs/{created['id']}").json() == created


def test_list_supports_project_search_status_and_archive(client: TestClient) -> None:
    first_project = create_project(client, "First Project")
    second_project = create_project(client, "Second Project")
    first = create_run(client, first_project["id"], title="Microscopy Pilot", status="ready")
    create_run(client, second_project["id"], title="Separate Study", status="draft")

    project_response = client.get(
        "/api/v1/experiment-runs", params={"project_id": first_project["id"]}
    )
    assert project_response.json()["total"] == 1
    assert project_response.json()["items"][0]["id"] == first["id"]
    assert client.get("/api/v1/experiment-runs", params={"search": "MICRO"}).json()["total"] == 1
    assert client.get("/api/v1/experiment-runs", params={"status": "ready"}).json()["total"] == 1

    archived = client.post(
        f"/api/v1/experiment-runs/{first['id']}/archive",
        json={"expected_revision": first["revision"]},
    )
    assert archived.status_code == 200
    assert archived.json()["status"] == "archived"
    assert (
        client.get("/api/v1/experiment-runs", params={"archived": "true"}).json()["items"][0]["id"]
        == first["id"]
    )


def test_update_uses_revision_and_never_overwrites_actual_time(client: TestClient) -> None:
    project = create_project(client)
    run = create_run(
        client,
        project["id"],
        planned_start_at="2026-08-20T09:00:00Z",
        planned_end_at="2026-08-20T10:00:00Z",
    )
    updated_response = client.patch(
        f"/api/v1/experiment-runs/{run['id']}",
        json={
            "expected_revision": run["revision"],
            "status": "planned",
            "planned_start_at": "2026-08-21T09:00:00Z",
            "planned_end_at": "2026-08-21T10:00:00Z",
        },
    )
    assert updated_response.status_code == 200, updated_response.text
    updated = updated_response.json()
    assert updated["revision"] == 2
    assert updated["planned_start_at"].startswith("2026-08-21")
    assert updated["actual_start_at"] is None
    assert updated["actual_end_at"] is None

    stale = client.patch(
        f"/api/v1/experiment-runs/{run['id']}",
        json={"expected_revision": 1, "title": "Silent overwrite"},
    )
    assert stale.status_code == 409
    assert stale.json()["detail"]["code"] == "experiment_run_revision_conflict"


def test_validation_parent_boundary_and_no_hard_delete(client: TestClient) -> None:
    project = create_project(client)
    assert (
        client.post(
            "/api/v1/experiment-runs",
            json={"project_id": project["id"], "title": "   "},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/experiment-runs",
            json={
                "project_id": project["id"],
                "title": "Invalid range",
                "planned_start_at": "2026-08-21T10:00:00Z",
                "planned_end_at": "2026-08-21T09:00:00Z",
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/experiment-runs",
            json={"project_id": str(uuid4()), "title": "Orphan"},
        ).status_code
        == 409
    )
    run = create_run(client, project["id"], status="ready")
    invalid_transition = client.patch(
        f"/api/v1/experiment-runs/{run['id']}",
        json={"expected_revision": 1, "status": "completed"},
    )
    assert invalid_transition.status_code == 409
    assert client.delete(f"/api/v1/experiment-runs/{run['id']}").status_code == 405
