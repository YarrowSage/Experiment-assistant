from hashlib import sha256

from fastapi.testclient import TestClient


def checked_json(response: object, expected_status: int) -> dict[str, object]:
    assert hasattr(response, "status_code")
    assert response.status_code == expected_status, response.text
    value = response.json()
    assert isinstance(value, dict)
    return value


def test_complete_phase1_research_record_flow(client: TestClient) -> None:
    project = checked_json(
        client.post(
            "/api/v1/projects",
            json={
                "title": "Phase 1 acceptance study",
                "description": "Synthetic end-to-end acceptance fixture",
                "status": "planning",
            },
        ),
        201,
    )
    project = checked_json(
        client.patch(
            f"/api/v1/projects/{project['id']}",
            json={
                "expected_revision": project["revision"],
                "title": "Phase 1 accepted study",
                "status": "active",
            },
        ),
        200,
    )

    protocol = checked_json(
        client.post(
            "/api/v1/protocols",
            json={
                "project_id": project["id"],
                "title": "Dose and observe",
                "purpose": "Verify immutable protocol execution",
            },
        ),
        201,
    )
    version_one = protocol["versions"][0]
    version_one = checked_json(
        client.post(
            f"/api/v1/protocol-versions/{version_one['id']}/steps",
            json={
                "expected_version_revision": version_one["revision"],
                "title": "Dose sample",
                "instruction": "Apply 20 mg/kg.",
                "planned_duration_seconds": 60,
                "timer_mode": "countdown",
                "required": True,
                "substeps": [
                    {
                        "title": "Confirm identity",
                        "instruction": "Check the sample label before dosing.",
                    }
                ],
            },
        ),
        200,
    )
    version_one = checked_json(
        client.post(
            f"/api/v1/protocol-versions/{version_one['id']}/publish",
            json={"expected_revision": version_one["revision"]},
        ),
        200,
    )

    protocol_free_run = checked_json(
        client.post(
            "/api/v1/experiment-runs",
            json={
                "project_id": project["id"],
                "title": "Protocol-free planning note",
                "status": "planned",
                "planned_start_at": "2026-08-20T08:00:00Z",
            },
        ),
        201,
    )
    assert protocol_free_run["protocol_version_id"] is None

    run = checked_json(
        client.post(
            "/api/v1/experiment-runs",
            json={
                "project_id": project["id"],
                "protocol_version_id": version_one["id"],
                "title": "Run against protocol v1",
                "description": "Planned and actual time must remain distinct",
                "status": "ready",
                "planned_start_at": "2026-08-20T09:00:00Z",
                "planned_end_at": "2026-08-20T10:00:00Z",
            },
        ),
        201,
    )

    refreshed_protocol = checked_json(client.get(f"/api/v1/protocols/{protocol['id']}"), 200)
    version_two = checked_json(
        client.post(
            f"/api/v1/protocol-versions/{version_one['id']}/new-version",
            json={
                "expected_protocol_revision": refreshed_protocol["revision"],
                "change_summary": "Use corrected dose for future runs",
            },
        ),
        200,
    )
    version_two = checked_json(
        client.patch(
            f"/api/v1/protocol-steps/{version_two['steps'][0]['id']}",
            json={
                "expected_version_revision": version_two["revision"],
                "title": "Dose sample",
                "instruction": "Apply 25 mg/kg.",
                "planned_duration_seconds": 60,
                "timer_mode": "countdown",
                "required": True,
                "substeps": [
                    {
                        "title": "Confirm identity",
                        "instruction": "Check the sample label before dosing.",
                    }
                ],
            },
        ),
        200,
    )
    version_two = checked_json(
        client.post(
            f"/api/v1/protocol-versions/{version_two['id']}/publish",
            json={"expected_revision": version_two["revision"]},
        ),
        200,
    )
    persisted_v1 = checked_json(
        client.get(f"/api/v1/protocol-versions/{version_one['id']}"), 200
    )
    assert persisted_v1["steps"][0]["instruction"] == "Apply 20 mg/kg."
    assert version_two["steps"][0]["instruction"] == "Apply 25 mg/kg."
    assert checked_json(client.get(f"/api/v1/experiment-runs/{run['id']}"), 200)[
        "protocol_version_id"
    ] == version_one["id"]

    execution = checked_json(
        client.post(
            f"/api/v1/experiment-runs/{run['id']}/execution/start",
            json={"expected_run_revision": run["revision"]},
        ),
        200,
    )
    assert execution["run"]["planned_start_at"] == run["planned_start_at"]
    assert execution["run"]["actual_start_at"] is not None
    assert execution["steps"][0]["instruction_snapshot"] == "Apply 20 mg/kg."
    step = execution["steps"][0]
    execution = checked_json(
        client.post(
            f"/api/v1/run-steps/{step['id']}/start",
            json={
                "expected_run_revision": execution["run"]["revision"],
                "expected_step_revision": step["revision"],
            },
        ),
        200,
    )
    active_step = execution["steps"][0]
    assert active_step["actual_start_at"] is not None
    assert active_step["duration_seconds"] >= 0

    note = checked_json(
        client.post(
            f"/api/v1/experiment-runs/{run['id']}/notes",
            json={
                "content": "Dose confirmed from the instrument log.",
                "run_step_record_id": active_step["id"],
            },
        ),
        201,
    )
    assert note["run_step_record_id"] == active_step["id"]

    attachments = [
        ("sample.png", "image/png", b"\x89PNG\r\n\x1a\nsynthetic-image"),
        ("instrument.pdf", "application/pdf", b"%PDF-1.7\nsynthetic-report"),
        ("measurements.csv", "text/csv", b"time,value\n0,22.3\n"),
    ]
    attachment_ids: list[str] = []
    for filename, media_type, content in attachments:
        attachment = checked_json(
            client.post(
                f"/api/v1/experiment-runs/{run['id']}/attachments",
                params={
                    "filename": filename,
                    "run_step_id": active_step["id"],
                    "description": "Synthetic Phase 1 acceptance evidence",
                },
                content=content,
                headers={"Content-Type": media_type},
            ),
            201,
        )
        assert attachment["media_type"] == media_type
        assert attachment["checksum_sha256"] == sha256(content).hexdigest()
        assert "storage_key" not in attachment
        attachment_ids.append(str(attachment["id"]))
    download = client.get(f"/api/v1/attachments/{attachment_ids[1]}/content")
    assert download.status_code == 200
    assert download.content == attachments[1][2]

    execution = checked_json(
        client.post(
            f"/api/v1/experiment-runs/{run['id']}/execution/pause",
            json={"expected_run_revision": execution["run"]["revision"]},
        ),
        200,
    )
    assert execution["run"]["status"] == "paused"
    execution = checked_json(
        client.post(
            f"/api/v1/experiment-runs/{run['id']}/execution/resume",
            json={"expected_run_revision": execution["run"]["revision"]},
        ),
        200,
    )
    assert execution["run"]["status"] == "in_progress"
    execution = checked_json(
        client.post(
            f"/api/v1/run-steps/{active_step['id']}/complete",
            json={
                "expected_run_revision": execution["run"]["revision"],
                "expected_step_revision": execution["steps"][0]["revision"],
            },
        ),
        200,
    )
    assert execution["steps"][0]["status"] == "completed"
    assert execution["run"]["status"] == "in_progress"
    completed = checked_json(
        client.post(
            f"/api/v1/experiment-runs/{run['id']}/complete",
            json={
                "expected_run_revision": execution["run"]["revision"],
                "completion_note": "Required execution and evidence reviewed.",
            },
        ),
        200,
    )["run"]
    assert completed["status"] == "completed"
    assert completed["actual_end_at"] is not None

    protected = client.patch(
        f"/api/v1/experiment-runs/{run['id']}",
        json={"expected_revision": completed["revision"], "title": "Silent overwrite"},
    )
    assert protected.status_code == 409
    assert protected.json()["detail"]["code"] == "completed_record_protected"
    amendment_result = checked_json(
        client.post(
            f"/api/v1/experiment-runs/{run['id']}/amendments",
            json={
                "target_type": "experiment_run",
                "target_id": run["id"],
                "target_field": "title",
                "corrected_value": "Corrected Phase 1 run",
                "reason": "Data entry error identified during review",
                "expected_target_revision": completed["revision"],
            },
        ),
        201,
    )
    amendment = amendment_result["amendment"]
    assert amendment["original_value"] == "Run against protocol v1"
    assert amendment["corrected_value"] == "Corrected Phase 1 run"
    assert amendment["reason"] == "Data entry error identified during review"
    assert amendment["created_at"] is not None
    assert amendment["resulting_revision"] == amendment["prior_revision"] + 1

    activity = client.get(f"/api/v1/experiment-runs/{run['id']}/activity")
    assert activity.status_code == 200, activity.text
    event_types = {event["event_type"] for event in activity.json()}
    assert {
        "EXPERIMENT_CREATED",
        "RUN_STARTED",
        "STEP_STARTED",
        "NOTE_ADDED",
        "ATTACHMENT_ADDED",
        "RUN_PAUSED",
        "RUN_RESUMED",
        "STEP_COMPLETED",
        "RUN_COMPLETED",
        "AMENDMENT_CREATED",
    }.issubset(event_types)

    stale_archive = client.post(
        f"/api/v1/projects/{project['id']}/archive",
        json={"expected_revision": 1},
    )
    assert stale_archive.status_code == 409
    archived_project = checked_json(
        client.post(
            f"/api/v1/projects/{project['id']}/archive",
            json={"expected_revision": project["revision"]},
        ),
        200,
    )
    assert archived_project["status"] == "archived"
    assert checked_json(client.get(f"/api/v1/experiment-runs/{run['id']}"), 200)["title"] == (
        "Corrected Phase 1 run"
    )
