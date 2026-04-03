from app_factory import create_app
from demo_data import DemoLiveClient, DemoRiotClient
from scan_service import ScanService
from storage import Storage


def build_app(tmp_path):
    storage = Storage(tmp_path / "hibs.db")
    app = create_app(
        {
            "TESTING": True,
            "RIOT_API_KEY": None,
            "DATABASE_PATH": str(tmp_path / "hibs.db"),
            "CORS_ORIGINS": ["http://localhost:4000"],
            "DEMO_MODE": True,
            "API_CONFIGURED": False,
        },
        riot_client=None,
        storage=storage,
        live_client=DemoLiveClient(),
        demo_scan_service=ScanService(storage=storage, riot_client=DemoRiotClient()),
    )
    return app, storage


def test_status_endpoint_reports_demo_mode(tmp_path):
    app, _storage = build_app(tmp_path)
    response = app.test_client().get("/api/status")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "running"
    assert payload["demoMode"] is True
    assert payload["apiConfigured"] is False


def test_demo_scan_populates_memory_and_overview(tmp_path):
    app, _storage = build_app(tmp_path)
    client = app.test_client()

    scan_response = client.post("/api/demo/scan")
    scan_payload = scan_response.get_json()

    assert scan_response.status_code == 200
    assert scan_payload["scan"]["source"] == "demo"
    assert scan_payload["currentGame"]["participants"]
    assert len(scan_payload["repeatPlayers"]) >= 3
    assert scan_payload["repeatPlayers"][0]["watchNote"] is None

    overview_response = client.get(
        f"/api/tracked-profiles/{scan_payload['trackedProfile']['id']}/memory"
    )
    overview = overview_response.get_json()

    assert overview_response.status_code == 200
    assert overview["aggregate"]["totalScans"] == 1
    assert overview["aggregate"]["totalEncounters"] >= 3
    assert overview["topRepeatPlayers"]
    assert overview["topRepeatPlayers"][0]["risk"]["tier"]
    assert overview["recentScans"][0]["status"] == "ok"
    assert overview["recentScans"][0]["source"] == "demo"


def test_watch_note_round_trip_and_clear_works(tmp_path):
    app, _storage = build_app(tmp_path)
    client = app.test_client()
    scan_payload = client.post("/api/demo/scan").get_json()
    tracked_profile_id = scan_payload["trackedProfile"]["id"]
    player_puuid = scan_payload["repeatPlayers"][0]["puuid"]

    save_response = client.put(
        f"/api/tracked-profiles/{tracked_profile_id}/players/{player_puuid}/note",
        json={"note": "Shows up in back-to-back demo lobbies"},
    )
    assert save_response.status_code == 200
    assert save_response.get_json()["note"] == "Shows up in back-to-back demo lobbies"

    overview = client.get(f"/api/tracked-profiles/{tracked_profile_id}/memory").get_json()
    matching_player = next(player for player in overview["topRepeatPlayers"] if player["puuid"] == player_puuid)
    assert matching_player["note"] == "Shows up in back-to-back demo lobbies"
    assert overview["aggregate"]["notedPlayers"] == 1

    clear_response = client.put(
        f"/api/tracked-profiles/{tracked_profile_id}/players/{player_puuid}/note",
        json={"note": "   "},
    )
    assert clear_response.status_code == 200
    assert clear_response.get_json()["note"] is None

    cleared_overview = client.get(f"/api/tracked-profiles/{tracked_profile_id}/memory").get_json()
    cleared_player = next(player for player in cleared_overview["topRepeatPlayers"] if player["puuid"] == player_puuid)
    assert cleared_player["note"] is None
    assert cleared_overview["aggregate"]["notedPlayers"] == 0


def test_watch_note_returns_not_found_for_unknown_player(tmp_path):
    app, _storage = build_app(tmp_path)
    client = app.test_client()
    scan_payload = client.post("/api/demo/scan").get_json()
    tracked_profile_id = scan_payload["trackedProfile"]["id"]

    response = client.put(
        f"/api/tracked-profiles/{tracked_profile_id}/players/missing-player/note",
        json={"note": "hello"},
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "Player not found"


def test_demo_mode_live_status_disables_auto_scan(tmp_path):
    app, _storage = build_app(tmp_path)

    payload = app.test_client().get("/api/live-client/status").get_json()

    assert payload["connected"] is True
    assert payload["inGame"] is True
    assert payload["canAutoScan"] is False
