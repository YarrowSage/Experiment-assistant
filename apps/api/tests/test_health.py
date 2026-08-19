from fastapi.testclient import TestClient


def test_health_reports_service_without_database_details(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "Experiment Assistant API",
        "version": "0.1.0",
    }


def test_readiness_verifies_database_connection(client: TestClient) -> None:
    response = client.get("/api/v1/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ready"}
