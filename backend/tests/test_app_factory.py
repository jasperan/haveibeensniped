from app_factory import create_app


def build_app(tmp_path):
    return create_app({
        "TESTING": True,
        "RIOT_API_KEY": "test-key",
        "DATABASE_PATH": str(tmp_path / "test.db"),
        "CORS_ORIGINS": ["http://localhost:4000"],
    }, riot_client=object(), storage=object())


def test_health_endpoint_works_with_injected_config(tmp_path):
    client = build_app(tmp_path).test_client()
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "healthy"


def test_root_endpoint_lists_only_task_1_metadata(tmp_path):
    client = build_app(tmp_path).test_client()
    payload = client.get("/").get_json()

    assert payload["service"] == "Have I Been Sniped - Backend API"
    assert payload["status"] == "running"
    assert payload["version"] == "1.0.0"
    assert set(payload["endpoints"]) == {"health", "scan"}
    assert payload["endpoints"]["health"]["path"] == "/health"
    assert payload["endpoints"]["scan"]["path"] == "/api/scan"
    assert "documentation" not in payload


def test_task_2_routes_are_not_registered(tmp_path):
    client = build_app(tmp_path).test_client()

    assert client.post("/api/check-game", json={}).status_code == 404
    assert client.post("/api/analyze-snipes", json={}).status_code == 404
