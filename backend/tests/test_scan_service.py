from riot_client import normalize_riot_id_fields
from scan_service import ScanService
from storage import Storage


class FakeRiotClient:
    def get_puuid_by_riot_id(self, game_name, tag_line, region):
        return "self-puuid"

    def get_active_game(self, puuid, region):
        return {
            "gameId": 101,
            "gameMode": "CLASSIC",
            "gameStartTime": 111,
            "participants": [
                {"puuid": "self-puuid", "riotId": "Streamer#NA1", "championId": 81, "teamId": 100},
                {"puuid": "enemy-puuid", "riotId": "Enemy#TAG", "championId": 157, "teamId": 200},
            ],
        }

    def analyze_match_history(self, user_puuid, lobby_puuids, region, match_count=100):
        return {
            "enemy-puuid": {
                "matches": [
                    {
                        "matchId": "MATCH-1",
                        "timestamp": 1710000000000,
                        "win": False,
                        "team": "against",
                        "playerChampId": 81,
                        "targetChampId": 157,
                    }
                ],
                "totalGames": 1,
                "wins": 0,
                "losses": 1,
            }
        }


def test_scan_service_persists_scan_and_returns_repeat_players(tmp_path):
    storage = Storage(tmp_path / "hibs.db")
    service = ScanService(storage=storage, riot_client=FakeRiotClient())

    result = service.run_manual_scan("Streamer", "NA1", "NA1")

    assert result["trackedProfile"]["puuid"] == "self-puuid"
    assert result["currentGame"]["gameId"] == 101
    assert result["repeatPlayers"][0]["puuid"] == "enemy-puuid"
    assert result["repeatPlayers"][0]["risk"]["reasons"]
    assert storage.count_encounters() == 1


def test_scan_service_records_not_in_game_scan(tmp_path):
    class NotInGameClient(FakeRiotClient):
        def get_active_game(self, puuid, region):
            return None

    storage = Storage(tmp_path / "hibs.db")
    service = ScanService(storage=storage, riot_client=NotInGameClient())

    result = service.run_manual_scan("Streamer", "NA1", "NA1")

    assert result["scan"]["status"] == "not_in_game"
    assert result["currentGame"] is None


def test_scan_service_raises_value_error_when_player_is_missing(tmp_path):
    class MissingPlayerClient(FakeRiotClient):
        def get_puuid_by_riot_id(self, game_name, tag_line, region):
            return None

    storage = Storage(tmp_path / "hibs.db")
    service = ScanService(storage=storage, riot_client=MissingPlayerClient())

    try:
        service.run_manual_scan("Streamer", "NA1", "NA1")
    except ValueError as error:
        assert str(error) == "Player not found"
    else:
        raise AssertionError("expected ValueError")


def test_scan_service_returns_memory_only_repeat_players(tmp_path):
    storage = Storage(tmp_path / "hibs.db")
    profile_id = storage.upsert_tracked_profile("self-puuid", "Streamer", "NA1", "NA1")
    storage.upsert_player("self-puuid", "Streamer", "NA1", "NA1", "tracked")
    storage.upsert_player("enemy-puuid", "Enemy", "TAG", "NA1", "resolved")
    prior_scan_id = storage.insert_scan(profile_id, "manual", "NA1", 100, "CLASSIC", "ok", 0.0, 1)
    storage.insert_scan_participant(prior_scan_id, "self-puuid", "self", 81, 100)
    storage.insert_scan_participant(prior_scan_id, "enemy-puuid", "enemy", 157, 200)
    storage.insert_encounter(
        profile_id,
        "enemy-puuid",
        prior_scan_id,
        "MATCH-1",
        "2026-03-16T00:00:00Z",
        "enemy",
        157,
        420,
        0,
    )

    class HistorylessRiotClient(FakeRiotClient):
        def analyze_match_history(self, user_puuid, lobby_puuids, region, match_count=100):
            return {}

    service = ScanService(storage=storage, riot_client=HistorylessRiotClient())

    result = service.run_manual_scan("Streamer", "NA1", "NA1")

    assert [player["puuid"] for player in result["repeatPlayers"]] == ["enemy-puuid"]
    assert result["repeatPlayers"][0]["totalGames"] == 1
    assert result["repeatPlayers"][0]["wins"] == 0
    assert result["repeatPlayers"][0]["losses"] == 1


def test_normalize_riot_id_fields_prefers_riot_id_over_legacy_summoner_name():
    identity = normalize_riot_id_fields({
        "riotId": "Enemy#TAG",
        "summonerName": "Legacy Summoner",
    })

    assert identity == {
        "game_name": "Enemy",
        "tag_line": "TAG",
        "riot_id": "Enemy#TAG",
    }

