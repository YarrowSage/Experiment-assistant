from fastapi.testclient import TestClient


def prepare_completable_run(client: TestClient) -> dict[str, object]:
    project = client.post(
        "/api/v1/projects", json={"title": "Completion Project", "status": "active"}
    ).json()
    protocol = client.post(
        "/api/v1/protocols",
        json={"project_id": project["id"], "title": "Completion Protocol"},
    ).json()
    version = protocol["versions"][0]
    required = client.post(
        f"/api/v1/protocol-versions/{version['id']}/steps",
        json={
            "expected_version_revision": version["revision"],
            "title": "Required measurement",
            "instruction": "Measure the sample.",
            "required": True,
        },
    ).json()
    optional = client.post(
        f"/api/v1/protocol-versions/{version['id']}/steps",
        json={
            "expected_version_revision": required["revision"],
            "title": "Optional image",
            "instruction": "Capture an image if useful.",
            "required": False,
        },
    ).json()
    published = client.post(
        f"/api/v1/protocol-versions/{version['id']}/publish",
        json={"expected_revision": optional["revision"]},
    ).json()
    run = client.post(
        "/api/v1/experiment-runs",
        json={
            "project_id": project["id"],
            "protocol_version_id": published["id"],
            "title": "Completion Run",
            "status": "ready",
        },
    ).json()
    return client.post(
        f"/api/v1/experiment-runs/{run['id']}/execution/start",
        json={"expected_run_revision": run["revision"]},
    ).json()


def complete_first_step(client: TestClient, execution: dict[str, object]) -> dict[str, object]:
    run = execution["run"]
    first = execution["steps"][0]
    started = client.post(
        f"/api/v1/run-steps/{first['id']}/start",
        json={
            "expected_run_revision": run["revision"],
            "expected_step_revision": first["revision"],
        },
    ).json()
    active = started["steps"][0]
    return client.post(
        f"/api/v1/run-steps/{active['id']}/complete",
        json={
            "expected_run_revision": started["run"]["revision"],
            "expected_step_revision": active["revision"],
        },
    ).json()


def test_explicit_completion_allows_optional_pending_and_records_timestamps(
    client: TestClient,
) -> None:
    execution = prepare_completable_run(client)
    after_required = complete_first_step(client, execution)
    assert after_required["run"]["status"] == "in_progress"
    assert after_required["steps"][1]["status"] == "pending"
    completed_response = client.post(
        f"/api/v1/experiment-runs/{after_required['run']['id']}/complete",
        json={
            "expected_run_revision": after_required["run"]["revision"],
            "completion_note": "Required work reviewed.",
        },
    )
    assert completed_response.status_code == 200, completed_response.text
    completed = completed_response.json()
    assert completed["run"]["status"] == "completed"
    assert completed["run"]["actual_end_at"] is not None
    assert completed["run"]["completed_at"] is not None
    assert completed["run"]["completion_note"] == "Required work reviewed."
    assert completed["steps"][1]["status"] == "pending"


def test_incomplete_required_step_needs_explicit_acknowledgement(client: TestClient) -> None:
    execution = prepare_completable_run(client)
    run = execution["run"]
    rejected = client.post(
        f"/api/v1/experiment-runs/{run['id']}/complete",
        json={"expected_run_revision": run["revision"]},
    )
    assert rejected.status_code == 409
    assert rejected.json()["detail"]["code"] == "required_steps_incomplete"
    confirmed = client.post(
        f"/api/v1/experiment-runs/{run['id']}/complete",
        json={
            "expected_run_revision": run["revision"],
            "acknowledge_incomplete_required_steps": True,
        },
    )
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["run"]["status"] == "completed"


def test_completed_normal_edit_is_blocked_and_amendment_preserves_history(
    client: TestClient,
) -> None:
    execution = prepare_completable_run(client)
    run = execution["run"]
    step = execution["steps"][0]
    note = client.post(
        f"/api/v1/experiment-runs/{run['id']}/notes",
        json={"content": "Observation before completion"},
    ).json()
    completed = client.post(
        f"/api/v1/experiment-runs/{run['id']}/complete",
        json={
            "expected_run_revision": run["revision"],
            "acknowledge_incomplete_required_steps": True,
        },
    ).json()["run"]
    normal_edit = client.patch(
        f"/api/v1/experiment-runs/{run['id']}",
        json={"expected_revision": completed["revision"], "title": "Silent overwrite"},
    )
    assert normal_edit.status_code == 409
    assert normal_edit.json()["detail"]["code"] == "completed_record_protected"
    note_edit = client.patch(
        f"/api/v1/notes/{note['id']}",
        json={
            "expected_revision": note["revision"],
            "content": "Silent note overwrite",
        },
    )
    assert note_edit.status_code == 409
    assert note_edit.json()["detail"]["code"] == "completed_record_protected"

    amendment_response = client.post(
        f"/api/v1/experiment-runs/{run['id']}/amendments",
        json={
            "target_type": "experiment_run",
            "target_id": run["id"],
            "target_field": "title",
            "corrected_value": "Corrected Completion Run",
            "reason": "Data entry error in the run name",
            "expected_target_revision": completed["revision"],
        },
    )
    assert amendment_response.status_code == 201, amendment_response.text
    result = amendment_response.json()
    amendment = result["amendment"]
    assert amendment["original_value"] == "Completion Run"
    assert amendment["corrected_value"] == "Corrected Completion Run"
    assert amendment["reason"] == "Data entry error in the run name"
    assert amendment["prior_revision"] == completed["revision"]
    assert amendment["resulting_revision"] == completed["revision"] + 1
    assert result["execution"]["run"]["title"] == "Corrected Completion Run"
    assert result["activity"]["event_type"] == "AMENDMENT_CREATED"

    step_amendment_response = client.post(
        f"/api/v1/experiment-runs/{run['id']}/amendments",
        json={
            "target_type": "run_step_record",
            "target_id": step["id"],
            "target_field": "actual_start_at",
            "corrected_value": "2026-08-19T09:30:00+00:00",
            "reason": "Recovered timestamp from instrument log",
            "expected_target_revision": step["revision"],
        },
    )
    assert step_amendment_response.status_code == 201, step_amendment_response.text
    step_result = step_amendment_response.json()
    assert step_result["amendment"]["target_type"] == "run_step_record"
    assert step_result["amendment"]["target_id"] == step["id"]
    assert step_result["amendment"]["original_value"] is None
    assert step_result["execution"]["steps"][0]["actual_start_at"] == "2026-08-19T09:30:00Z"

    history = client.get(f"/api/v1/experiment-runs/{run['id']}/amendments")
    assert history.status_code == 200
    assert len(history.json()) == 2
    assert history.json()[0]["original_value"] is None
    assert history.json()[1]["original_value"] == "Completion Run"
    persisted = client.get(f"/api/v1/experiment-runs/{run['id']}").json()
    assert persisted["title"] == "Corrected Completion Run"
