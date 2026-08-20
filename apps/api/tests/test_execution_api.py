from fastapi.testclient import TestClient


def prepare_execution(client: TestClient) -> tuple[dict[str, object], dict[str, object]]:
    project_response = client.post(
        "/api/v1/projects", json={"title": "Execution Project", "status": "active"}
    )
    assert project_response.status_code == 201
    project = project_response.json()
    protocol_response = client.post(
        "/api/v1/protocols",
        json={"project_id": project["id"], "title": "Execution Protocol"},
    )
    assert protocol_response.status_code == 201
    version = protocol_response.json()["versions"][0]
    first_step = client.post(
        f"/api/v1/protocol-versions/{version['id']}/steps",
        json={
            "expected_version_revision": version["revision"],
            "title": "Incubate",
            "instruction": "Incubate for 60 seconds.",
            "planned_duration_seconds": 60,
            "timer_mode": "countdown",
            "required": True,
            "substeps": [{"title": "Check temperature", "instruction": "Confirm 37 °C."}],
        },
    )
    assert first_step.status_code == 200, first_step.text
    version = first_step.json()
    second_step = client.post(
        f"/api/v1/protocol-versions/{version['id']}/steps",
        json={
            "expected_version_revision": version["revision"],
            "title": "Read result",
            "instruction": "Read the plate.",
            "timer_mode": "count_up",
            "required": True,
        },
    )
    assert second_step.status_code == 200, second_step.text
    version = second_step.json()
    published_response = client.post(
        f"/api/v1/protocol-versions/{version['id']}/publish",
        json={"expected_revision": version["revision"]},
    )
    assert published_response.status_code == 200, published_response.text
    published = published_response.json()
    run_response = client.post(
        "/api/v1/experiment-runs",
        json={
            "project_id": project["id"],
            "protocol_version_id": published["id"],
            "title": "Execution Run",
            "status": "ready",
            "planned_start_at": "2026-08-20T08:00:00Z",
            "planned_end_at": "2026-08-20T09:00:00Z",
        },
    )
    assert run_response.status_code == 201, run_response.text
    return run_response.json(), published


def test_start_materializes_stable_ordered_execution_records(client: TestClient) -> None:
    run, published = prepare_execution(client)
    started_response = client.post(
        f"/api/v1/experiment-runs/{run['id']}/execution/start",
        json={"expected_run_revision": run["revision"]},
    )
    assert started_response.status_code == 200, started_response.text
    execution = started_response.json()
    assert execution["run"]["status"] == "in_progress"
    assert execution["run"]["actual_start_at"] is not None
    assert execution["run"]["planned_start_at"] == run["planned_start_at"]
    assert execution["run"]["planned_end_at"] == run["planned_end_at"]
    assert [step["position"] for step in execution["steps"]] == [1, 2]
    assert execution["steps"][0]["instruction_snapshot"] == "Incubate for 60 seconds."
    assert execution["steps"][0]["source_protocol_version_id"] == published["id"]
    assert execution["steps"][0]["substeps"][0]["title_snapshot"] == "Check temperature"

    reloaded = client.get(f"/api/v1/experiment-runs/{run['id']}/execution")
    assert reloaded.status_code == 200
    assert reloaded.json()["steps"] == execution["steps"]


def test_protocol_free_planning_requires_published_version_before_start(
    client: TestClient,
) -> None:
    existing_run, published = prepare_execution(client)
    planned_response = client.post(
        "/api/v1/experiment-runs",
        json={
            "project_id": existing_run["project_id"],
            "protocol_version_id": None,
            "title": "Protocol-free Planning Run",
            "status": "planned",
        },
    )
    assert planned_response.status_code == 201, planned_response.text
    planned = planned_response.json()
    assert planned["protocol_version_id"] is None

    rejected = client.post(
        f"/api/v1/experiment-runs/{planned['id']}/execution/start",
        json={"expected_run_revision": planned["revision"]},
    )
    assert rejected.status_code == 409
    assert rejected.json()["detail"]["code"] == "execution_state_conflict"
    assert "published Protocol Version" in rejected.json()["detail"]["message"]
    assert "Assign a Protocol" in rejected.json()["detail"]["message"]

    assigned_response = client.patch(
        f"/api/v1/experiment-runs/{planned['id']}",
        json={
            "expected_revision": planned["revision"],
            "protocol_version_id": published["id"],
        },
    )
    assert assigned_response.status_code == 200, assigned_response.text
    assigned = assigned_response.json()
    assert assigned["protocol_version_id"] == published["id"]

    started_response = client.post(
        f"/api/v1/experiment-runs/{planned['id']}/execution/start",
        json={"expected_run_revision": assigned["revision"]},
    )
    assert started_response.status_code == 200, started_response.text
    started = started_response.json()
    assert started["run"]["status"] == "in_progress"
    assert [step["source_protocol_version_id"] for step in started["steps"]] == [
        published["id"],
        published["id"],
    ]


def test_step_timer_uses_persisted_anchors_and_never_completes_run(client: TestClient) -> None:
    run, _ = prepare_execution(client)
    execution = client.post(
        f"/api/v1/experiment-runs/{run['id']}/execution/start",
        json={"expected_run_revision": run["revision"]},
    ).json()
    first = execution["steps"][0]
    started_step_response = client.post(
        f"/api/v1/run-steps/{first['id']}/start",
        json={
            "expected_run_revision": execution["run"]["revision"],
            "expected_step_revision": first["revision"],
        },
    )
    assert started_step_response.status_code == 200, started_step_response.text
    active = started_step_response.json()
    active_step = active["steps"][0]
    assert active_step["status"] == "active"
    assert active_step["actual_start_at"] is not None
    assert active_step["duration_seconds"] >= 0

    reloaded = client.get(f"/api/v1/experiment-runs/{run['id']}/execution").json()
    assert reloaded["steps"][0]["actual_start_at"] == active_step["actual_start_at"]
    completed_response = client.post(
        f"/api/v1/run-steps/{active_step['id']}/complete",
        json={
            "expected_run_revision": reloaded["run"]["revision"],
            "expected_step_revision": reloaded["steps"][0]["revision"],
        },
    )
    assert completed_response.status_code == 200, completed_response.text
    completed = completed_response.json()
    assert completed["steps"][0]["status"] == "completed"
    assert completed["steps"][0]["actual_end_at"] is not None

    second = completed["steps"][1]
    second_started = client.post(
        f"/api/v1/run-steps/{second['id']}/start",
        json={
            "expected_run_revision": completed["run"]["revision"],
            "expected_step_revision": second["revision"],
        },
    ).json()
    second = second_started["steps"][1]
    all_steps_complete = client.post(
        f"/api/v1/run-steps/{second['id']}/complete",
        json={
            "expected_run_revision": second_started["run"]["revision"],
            "expected_step_revision": second["revision"],
        },
    ).json()
    assert [step["status"] for step in all_steps_complete["steps"]] == [
        "completed",
        "completed",
    ]
    assert all_steps_complete["run"]["status"] == "in_progress"
    assert all_steps_complete["run"]["actual_end_at"] is None
    assert all_steps_complete["run"]["completed_at"] is None


def test_pause_and_resume_preserve_execution_timestamp_anchors(client: TestClient) -> None:
    run, _ = prepare_execution(client)
    started = client.post(
        f"/api/v1/experiment-runs/{run['id']}/execution/start",
        json={"expected_run_revision": run["revision"]},
    ).json()
    first = started["steps"][0]
    active = client.post(
        f"/api/v1/run-steps/{first['id']}/start",
        json={
            "expected_run_revision": started["run"]["revision"],
            "expected_step_revision": first["revision"],
        },
    ).json()
    anchor = active["steps"][0]["actual_start_at"]
    paused_response = client.post(
        f"/api/v1/experiment-runs/{run['id']}/execution/pause",
        json={"expected_run_revision": active["run"]["revision"]},
    )
    assert paused_response.status_code == 200, paused_response.text
    paused = paused_response.json()
    assert paused["run"]["status"] == "paused"
    assert paused["steps"][0]["actual_start_at"] == anchor
    blocked = client.post(
        f"/api/v1/run-steps/{first['id']}/complete",
        json={
            "expected_run_revision": paused["run"]["revision"],
            "expected_step_revision": paused["steps"][0]["revision"],
        },
    )
    assert blocked.status_code == 409
    resumed = client.post(
        f"/api/v1/experiment-runs/{run['id']}/execution/resume",
        json={"expected_run_revision": paused["run"]["revision"]},
    ).json()
    assert resumed["run"]["status"] == "in_progress"
    assert resumed["steps"][0]["actual_start_at"] == anchor
