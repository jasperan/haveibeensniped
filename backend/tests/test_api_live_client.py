from app_factory import create_app
from storage import Storage


class FakeLiveClient:
    def get_status(self):
        return {
            "connected": True,
            "inGame": True,
            "activePlayer": {
                "riotId": "Streamer#NA1",
                "gameName": "Streamer",
                "tagLine": "NA1",
            },
            "participantCount": 2,
            "gameMode": "CLASSIC",
            "mapName": "Map11",
            "sessionFingerprint": "abc123",
        }


def test_live_client_status_matches_saved_tracked_profile(tmp_path):
    storage = Storage(tmp_path / "hibs.db")
    profile_id = storage.upsert_tracked_profile("self-puuid", "Streamer", "NA1", "NA1")
    app = create_app(
        {
            "TESTING": True,
            "RIOT_API_KEY": "test-key",
            "DATABASE_PATH": str(tmp_path / "hibs.db"),
            "CORS_ORIGINS": ["http://localhost:4000"],
        },
        riot_client=object(),
        storage=storage,
        live_client=FakeLiveClient(),
    )

    response = app.test_client().get("/api/live-client/status")
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["connected"] is True
    assert payload["matchedProfile"]["id"] == profile_id
    assert payload["matchedProfile"]["region"] == "NA1"
    assert payload["canAutoScan"] is True


def test_live_client_status_matches_saved_profile_case_insensitively(tmp_path):
    storage = Storage(tmp_path / "hibs.db")
    storage.upsert_tracked_profile("self-puuid", "stReaMer", "na1", "NA1")
    app = create_app(
        {
            "TESTING": True,
            "RIOT_API_KEY": "test-key",
            "DATABASE_PATH": str(tmp_path / "hibs.db"),
            "CORS_ORIGINS": ["http://localhost:4000"],
        },
        riot_client=object(),
        storage=storage,
        live_client=FakeLiveClient(),
    )

    payload = app.test_client().get("/api/live-client/status").get_json()

    assert payload["matchedProfile"]["gameName"] == "stReaMer"
    assert payload["matchedProfile"]["tagLine"] == "na1"
    assert payload["canAutoScan"] is True


def test_live_client_status_returns_disconnected_cleanly(tmp_path):
    class OfflineLiveClient:
        def get_status(self):
            return {
                "connected": False,
                "inGame": False,
                "activePlayer": None,
                "participantCount": 0,
                "gameMode": None,
                "mapName": None,
                "sessionFingerprint": None,
            }

    storage = Storage(tmp_path / "hibs.db")
    app = create_app(
        {
            "TESTING": True,
            "RIOT_API_KEY": "test-key",
            "DATABASE_PATH": str(tmp_path / "hibs.db"),
            "CORS_ORIGINS": ["http://localhost:4000"],
        },
        riot_client=object(),
        storage=storage,
        live_client=OfflineLiveClient(),
    )

    payload = app.test_client().get("/api/live-client/status").get_json()

    assert payload["connected"] is False
    assert payload["matchedProfile"] is None
    assert payload["canAutoScan"] is False
