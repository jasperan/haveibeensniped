from app_factory import create_app


class FakeScanService:
    def run_manual_scan(self, game_name, tag_line, region):
        return {
            "trackedProfile": {
                "id": 1,
                "puuid": "self",
                "gameName": game_name,
                "tagLine": tag_line,
                "region": region,
            },
            "scan": {
                "id": 10,
                "status": "ok",
                "source": "manual",
                "confidence": 1.0,
                "unresolvedCount": 0,
            },
            "currentGame": {
                "gameId": 101,
                "gameMode": "CLASSIC",
                "gameStartTime": 111,
                "participants": [],
            },
            "repeatPlayers": [],
        }


def build_app(tmp_path, scan_service):
    return create_app({
        "TESTING": True,
        "RIOT_API_KEY": "test-key",  # pragma: allowlist secret
        "DATABASE_PATH": str(tmp_path / "test.db"),
        "CORS_ORIGINS": ["http://localhost:4000"],
    }, riot_client=object(), storage=object(), scan_service=scan_service)


def test_scan_endpoint_returns_full_payload(tmp_path):
    client = build_app(tmp_path, FakeScanService()).test_client()
    response = client.post("/api/scan", json={
        "gameName": "Streamer",
        "tagLine": "NA1",
        "region": "NA1",
    })

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["trackedProfile"]["puuid"] == "self"
    assert payload["scan"]["status"] == "ok"
    assert "repeatPlayers" in payload


def test_scan_endpoint_validates_required_fields(tmp_path):
    client = build_app(tmp_path, FakeScanService()).test_client()
    response = client.post("/api/scan", json={"gameName": "Streamer"})

    assert response.status_code == 400
    assert response.get_json()["error"] == "Missing gameName, tagLine, or region"


def test_scan_endpoint_returns_not_found_for_value_errors(tmp_path):
    class MissingPlayerScanService:
        def run_manual_scan(self, game_name, tag_line, region):
            raise ValueError("Player not found")

    client = build_app(tmp_path, MissingPlayerScanService()).test_client()
    response = client.post("/api/scan", json={
        "gameName": "Streamer",
        "tagLine": "NA1",
        "region": "NA1",
    })

    assert response.status_code == 404
    assert response.get_json()["error"] == "Player not found"


def test_scan_endpoint_returns_internal_server_error_on_unexpected_errors(tmp_path):
    class BrokenScanService:
        def run_manual_scan(self, game_name, tag_line, region):
            raise RuntimeError("boom")

    client = build_app(tmp_path, BrokenScanService()).test_client()
    response = client.post("/api/scan", json={
        "gameName": "Streamer",
        "tagLine": "NA1",
        "region": "NA1",
    })

    assert response.status_code == 500
    assert response.get_json()["error"] == "Internal server error"


def test_scan_endpoint_requires_configured_riot_client(tmp_path):
    app = create_app({
        "TESTING": True,
        "RIOT_API_KEY": None,
        "DATABASE_PATH": str(tmp_path / "test.db"),
        "CORS_ORIGINS": ["http://localhost:4000"],
    }, riot_client=None, storage=object(), scan_service=None)

    response = app.test_client().post("/api/scan", json={
        "gameName": "Streamer",
        "tagLine": "NA1",
        "region": "NA1",
    })

    assert response.status_code == 503
    assert "Riot API is not configured" in response.get_json()["error"]
