from hashlib import sha256
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app.evidence.models import FileAttachment


def prepare_run_with_step(client: TestClient, title: str = "Evidence Run") -> dict[str, object]:
    project = client.post(
        "/api/v1/projects", json={"title": f"{title} Project", "status": "active"}
    ).json()
    protocol = client.post(
        "/api/v1/protocols",
        json={"project_id": project["id"], "title": f"{title} Protocol"},
    ).json()
    version = protocol["versions"][0]
    version = client.post(
        f"/api/v1/protocol-versions/{version['id']}/steps",
        json={
            "expected_version_revision": version["revision"],
            "title": "Capture evidence",
            "instruction": "Record the observation.",
            "timer_mode": "none",
            "required": True,
        },
    ).json()
    published = client.post(
        f"/api/v1/protocol-versions/{version['id']}/publish",
        json={"expected_revision": version["revision"]},
    ).json()
    run = client.post(
        "/api/v1/experiment-runs",
        json={
            "project_id": project["id"],
            "protocol_version_id": published["id"],
            "title": title,
            "status": "ready",
        },
    ).json()
    return client.post(
        f"/api/v1/experiment-runs/{run['id']}/execution/start",
        json={"expected_run_revision": run["revision"]},
    ).json()


def test_notes_use_explicit_run_and_step_contexts(client: TestClient) -> None:
    execution = prepare_run_with_step(client)
    run = execution["run"]
    step = execution["steps"][0]
    run_note_response = client.post(
        f"/api/v1/experiment-runs/{run['id']}/notes",
        json={"content": "Overall observation"},
    )
    assert run_note_response.status_code == 201, run_note_response.text
    step_note_response = client.post(
        f"/api/v1/experiment-runs/{run['id']}/notes",
        json={"content": "Step-specific observation", "run_step_record_id": step["id"]},
    )
    assert step_note_response.status_code == 201, step_note_response.text
    step_note = step_note_response.json()
    assert step_note["experiment_run_id"] == run["id"]
    assert step_note["run_step_record_id"] == step["id"]

    all_notes = client.get(f"/api/v1/experiment-runs/{run['id']}/notes").json()
    assert {note["content"] for note in all_notes} == {
        "Overall observation",
        "Step-specific observation",
    }
    step_notes = client.get(
        f"/api/v1/experiment-runs/{run['id']}/notes",
        params={"run_step_id": step["id"]},
    ).json()
    assert [note["content"] for note in step_notes] == ["Step-specific observation"]

    updated = client.patch(
        f"/api/v1/notes/{step_note['id']}",
        json={"expected_revision": step_note["revision"], "content": "Corrected observation"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["revision"] == 2


def test_workspace_recent_activity_returns_only_persisted_events(client: TestClient) -> None:
    execution = prepare_run_with_step(client, "Recent Activity")
    run = execution["run"]
    client.post(
        f"/api/v1/experiment-runs/{run['id']}/notes",
        json={"content": "A real recent observation"},
    )

    response = client.get("/api/v1/activity", params={"limit": 3})
    assert response.status_code == 200, response.text
    activity = response.json()
    assert len(activity) == 3
    assert activity[0]["event_type"] == "NOTE_ADDED"
    assert activity[0]["experiment_run_id"] == run["id"]
    assert all(event["message"] for event in activity)


def test_attachment_metadata_checksum_download_and_path_privacy(
    client: TestClient, test_engine: Engine
) -> None:
    execution = prepare_run_with_step(client)
    run = execution["run"]
    step = execution["steps"][0]
    content = b"%PDF-1.7\nscientific evidence\n"
    upload = client.post(
        f"/api/v1/experiment-runs/{run['id']}/attachments",
        params={
            "filename": r"E:\private\microscope result.pdf",
            "run_step_id": step["id"],
            "description": "Instrument export",
        },
        content=content,
        headers={"Content-Type": "application/pdf"},
    )
    assert upload.status_code == 201, upload.text
    attachment = upload.json()
    assert attachment["original_filename"] == "microscope result.pdf"
    assert attachment["media_type"] == "application/pdf"
    assert attachment["size_bytes"] == len(content)
    assert attachment["checksum_sha256"] == sha256(content).hexdigest()
    assert attachment["state"] == "available"
    assert attachment["storage_provider"] == "local"
    assert "storage_key" not in attachment
    assert "E:\\" not in upload.text
    assert "Lab Assistant" not in upload.text
    assert attachment["download_url"] == f"/attachments/{attachment['id']}/content"
    with Session(test_engine) as session:
        stored_metadata = session.scalar(
            select(FileAttachment).where(FileAttachment.id == UUID(attachment["id"]))
        )
        assert stored_metadata is not None
        assert stored_metadata.storage_key.startswith("attachments/")
        assert "E:\\" not in stored_metadata.storage_key

    listed = client.get(f"/api/v1/experiment-runs/{run['id']}/attachments").json()
    assert listed[0]["run_step_record_id"] == step["id"]
    download = client.get(f"/api/v1/attachments/{attachment['id']}/content")
    assert download.status_code == 200
    assert download.content == content
    assert download.headers["content-type"] == "application/pdf"


def test_activity_log_contains_meaningful_domain_events_only(client: TestClient) -> None:
    execution = prepare_run_with_step(client)
    run = execution["run"]
    step = execution["steps"][0]
    active = client.post(
        f"/api/v1/run-steps/{step['id']}/start",
        json={
            "expected_run_revision": run["revision"],
            "expected_step_revision": step["revision"],
        },
    ).json()
    active_step = active["steps"][0]
    client.post(
        f"/api/v1/run-steps/{step['id']}/complete",
        json={
            "expected_run_revision": active["run"]["revision"],
            "expected_step_revision": active_step["revision"],
        },
    )
    client.post(f"/api/v1/experiment-runs/{run['id']}/notes", json={"content": "Activity note"})
    attachment_response = client.post(
        f"/api/v1/experiment-runs/{run['id']}/attachments",
        params={"filename": "observation.txt"},
        content=b"observation",
        headers={"Content-Type": "text/plain"},
    )
    assert attachment_response.status_code == 201
    activity_response = client.get(f"/api/v1/experiment-runs/{run['id']}/activity")
    assert activity_response.status_code == 200
    event_types = {event["event_type"] for event in activity_response.json()}
    assert {
        "EXPERIMENT_CREATED",
        "RUN_STARTED",
        "STEP_STARTED",
        "STEP_COMPLETED",
        "NOTE_ADDED",
        "ATTACHMENT_ADDED",
    }.issubset(event_types)
