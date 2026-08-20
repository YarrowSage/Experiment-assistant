from fastapi.testclient import TestClient


def create_project(client: TestClient, title: str = "Protocol Project") -> dict[str, object]:
    response = client.post("/api/v1/projects", json={"title": title, "status": "active"})
    assert response.status_code == 201, response.text
    return response.json()


def create_protocol(
    client: TestClient, project_id: object, title: str = "CCK-8 Protocol"
) -> dict[str, object]:
    response = client.post(
        "/api/v1/protocols",
        json={
            "project_id": project_id,
            "title": title,
            "description": "Cell viability procedure",
            "purpose": "Measure viability",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def add_step(
    client: TestClient,
    version_id: object,
    revision: object,
    *,
    title: str,
    instruction: str,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/protocol-versions/{version_id}/steps",
        json={
            "expected_version_revision": revision,
            "title": title,
            "instruction": instruction,
            "planned_duration_seconds": 300,
            "timer_mode": "countdown",
            "required": True,
            "substeps": [{"title": "Check material", "instruction": "Confirm reagent identity."}],
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_protocol_starts_with_editable_draft_and_ordered_steps(client: TestClient) -> None:
    project = create_project(client)
    protocol = create_protocol(client, project["id"])
    assert protocol["status"] == "active"
    assert protocol["revision"] == 1
    version = protocol["versions"][0]
    assert version["version_number"] == 1
    assert version["status"] == "draft"

    version = add_step(
        client,
        version["id"],
        version["revision"],
        title="Add reagent",
        instruction="Add 10 µL reagent.",
    )
    assert version["revision"] == 2
    assert version["steps"][0]["position"] == 1
    assert version["steps"][0]["substeps"][0]["position"] == 1

    version = add_step(
        client,
        version["id"],
        version["revision"],
        title="Incubate",
        instruction="Incubate for 2 hours.",
    )
    second_step = version["steps"][1]
    moved = client.post(
        f"/api/v1/protocol-steps/{second_step['id']}/move",
        json={"expected_version_revision": version["revision"], "direction": "up"},
    )
    assert moved.status_code == 200, moved.text
    assert [step["title"] for step in moved.json()["steps"]] == ["Incubate", "Add reagent"]
    moved_version = moved.json()
    removed = client.delete(
        f"/api/v1/protocol-steps/{moved_version['steps'][0]['id']}",
        params={"expected_version_revision": moved_version["revision"]},
    )
    assert removed.status_code == 200, removed.text
    assert [(step["position"], step["title"]) for step in removed.json()["steps"]] == [
        (1, "Add reagent")
    ]


def test_published_version_and_steps_are_immutable(client: TestClient) -> None:
    project = create_project(client)
    protocol = create_protocol(client, project["id"])
    version = add_step(
        client,
        protocol["versions"][0]["id"],
        1,
        title="Read plate",
        instruction="Measure absorbance at 450 nm.",
    )
    published_response = client.post(
        f"/api/v1/protocol-versions/{version['id']}/publish",
        json={"expected_revision": version["revision"]},
    )
    assert published_response.status_code == 200, published_response.text
    published = published_response.json()
    assert published["status"] == "published"
    assert published["published_at"] is not None

    version_edit = client.patch(
        f"/api/v1/protocol-versions/{published['id']}",
        json={"expected_revision": published["revision"], "purpose": "Silent mutation"},
    )
    assert version_edit.status_code == 409
    assert version_edit.json()["detail"]["code"] == "protocol_state_conflict"
    step = published["steps"][0]
    step_edit = client.patch(
        f"/api/v1/protocol-steps/{step['id']}",
        json={
            "expected_version_revision": published["revision"],
            "title": step["title"],
            "instruction": "Changed historical instruction",
        },
    )
    assert step_edit.status_code == 409
    unchanged = client.get(f"/api/v1/protocol-versions/{published['id']}").json()
    assert unchanged["steps"][0]["instruction"] == "Measure absorbance at 450 nm."


def test_new_version_preserves_run_link_and_original_instructions(client: TestClient) -> None:
    project = create_project(client)
    protocol = create_protocol(client, project["id"])
    version_one = add_step(
        client,
        protocol["versions"][0]["id"],
        1,
        title="Dose",
        instruction="Use 20 mg/kg.",
    )
    version_one = client.post(
        f"/api/v1/protocol-versions/{version_one['id']}/publish",
        json={"expected_revision": version_one["revision"]},
    ).json()

    run_response = client.post(
        "/api/v1/experiment-runs",
        json={
            "project_id": project["id"],
            "protocol_version_id": version_one["id"],
            "title": "Run using V1",
            "status": "ready",
        },
    )
    assert run_response.status_code == 201, run_response.text
    run = run_response.json()

    refreshed_protocol = client.get(f"/api/v1/protocols/{protocol['id']}").json()
    version_two_response = client.post(
        f"/api/v1/protocol-versions/{version_one['id']}/new-version",
        json={
            "expected_protocol_revision": refreshed_protocol["revision"],
            "change_summary": "Correct planned dose for future runs",
        },
    )
    assert version_two_response.status_code == 200, version_two_response.text
    version_two = version_two_response.json()
    assert version_two["version_number"] == 2
    assert version_two["based_on_version_id"] == version_one["id"]
    assert version_two["steps"][0]["stable_key"] == version_one["steps"][0]["stable_key"]

    duplicate_draft = client.post(
        f"/api/v1/protocol-versions/{version_one['id']}/new-version",
        json={
            "expected_protocol_revision": refreshed_protocol["revision"],
            "change_summary": "Conflicting draft",
        },
    )
    assert duplicate_draft.status_code == 409

    changed_v2 = client.patch(
        f"/api/v1/protocol-steps/{version_two['steps'][0]['id']}",
        json={
            "expected_version_revision": version_two["revision"],
            "title": "Dose",
            "instruction": "Use 25 mg/kg.",
        },
    )
    assert changed_v2.status_code == 200, changed_v2.text
    published_v2 = client.post(
        f"/api/v1/protocol-versions/{version_two['id']}/publish",
        json={"expected_revision": changed_v2.json()["revision"]},
    )
    assert published_v2.status_code == 200, published_v2.text

    updated_run = client.patch(
        f"/api/v1/experiment-runs/{run['id']}",
        json={
            "expected_revision": run["revision"],
            "protocol_version_id": version_one["id"],
            "title": "Run using superseded V1",
        },
    )
    assert updated_run.status_code == 200, updated_run.text
    assert updated_run.json()["protocol_version_id"] == version_one["id"]

    persisted_run = client.get(f"/api/v1/experiment-runs/{run['id']}").json()
    persisted_v1 = client.get(f"/api/v1/protocol-versions/{version_one['id']}").json()
    assert persisted_run["protocol_version_id"] == version_one["id"]
    assert persisted_v1["steps"][0]["instruction"] == "Use 20 mg/kg."
    assert changed_v2.json()["steps"][0]["instruction"] == "Use 25 mg/kg."


def test_run_rejects_draft_or_cross_project_protocol_version(client: TestClient) -> None:
    project = create_project(client, "First")
    other_project = create_project(client, "Second")
    protocol = create_protocol(client, project["id"])
    draft_id = protocol["versions"][0]["id"]

    draft_response = client.post(
        "/api/v1/experiment-runs",
        json={
            "project_id": project["id"],
            "protocol_version_id": draft_id,
            "title": "Invalid draft link",
        },
    )
    assert draft_response.status_code == 409

    version = add_step(
        client,
        draft_id,
        1,
        title="Step",
        instruction="Perform the step.",
    )
    published = client.post(
        f"/api/v1/protocol-versions/{draft_id}/publish",
        json={"expected_revision": version["revision"]},
    ).json()
    cross_project = client.post(
        "/api/v1/experiment-runs",
        json={
            "project_id": other_project["id"],
            "protocol_version_id": published["id"],
            "title": "Wrong Project",
        },
    )
    assert cross_project.status_code == 409
