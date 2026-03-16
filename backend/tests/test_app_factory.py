from app_factory import create_app


def test_health_endpoint_works_with_injected_config(tmp_path):
    app = create_app({
        "TESTING": True,
        "RIOT_API_KEY": "test-key",
        "DATABASE_PATH": str(tmp_path / "test.db"),
        "CORS_ORIGINS": ["http://localhost:4000"],
    }, riot_client=object(), storage=object())

    client = app.test_client()
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "healthy"


def test_root_endpoint_lists_scan_endpoint(tmp_path):
    app = create_app({
        "TESTING": True,
        "RIOT_API_KEY": "test-key",
        "DATABASE_PATH": str(tmp_path / "test.db"),
        "CORS_ORIGINS": ["http://localhost:4000"],
    }, riot_client=object(), storage=object())

    client = app.test_client()
    payload = client.get("/").get_json()

    assert payload["service"] == "Have I Been Sniped - Backend API"
    assert "scan" in payload["endpoints"]
