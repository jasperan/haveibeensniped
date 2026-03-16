from live_client import LiveClient


class FakeResponse:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []

    def get(self, url, timeout=None, verify=None):
        self.calls.append((url, timeout, verify))
        return self.responses.pop(0)


DISCONNECTED = {
    "connected": False,
    "inGame": False,
    "activePlayer": None,
    "participantCount": 0,
    "gameMode": None,
    "mapName": None,
    "sessionFingerprint": None,
}


def test_live_client_returns_connection_state_and_local_identity():
    session = FakeSession([
        FakeResponse(200, {
            "activePlayer": {
                "riotId": "Streamer#NA1",
                "summonerName": "Streamer#NA1",
            },
            "allPlayers": [
                {"riotId": "Streamer#NA1", "team": "ORDER", "championName": "Ezreal"},
                {"riotId": "Enemy#TAG", "team": "CHAOS", "championName": "Yasuo"},
            ],
            "gameData": {"gameMode": "CLASSIC", "mapName": "Map11"},
        })
    ])

    client = LiveClient(session=session)
    status = client.get_status()

    assert status["connected"] is True
    assert status["inGame"] is True
    assert status["activePlayer"]["gameName"] == "Streamer"
    assert status["participantCount"] == 2
    assert status["sessionFingerprint"]
    assert session.calls == [(LiveClient.BASE_URL, 2, False)]


def test_live_client_reports_disconnected_when_local_api_is_unreachable():
    class BrokenSession:
        def get(self, url, timeout=None, verify=None):
            raise OSError("connection refused")

    client = LiveClient(session=BrokenSession())
    status = client.get_status()

    assert status == DISCONNECTED


def test_live_client_rejects_malformed_success_payloads():
    client = LiveClient(session=FakeSession([
        FakeResponse(200, []),
    ]))
    assert client.get_status() == DISCONNECTED

    client = LiveClient(session=FakeSession([
        FakeResponse(200, {"activePlayer": "not-a-dict", "allPlayers": [], "gameData": {}}),
    ]))
    assert client.get_status() == DISCONNECTED

    client = LiveClient(session=FakeSession([
        FakeResponse(200, {"activePlayer": {}, "allPlayers": [], "gameData": {}}),
    ]))
    assert client.get_status() == DISCONNECTED


def test_live_client_uses_playerlist_and_gamestats_fallbacks():
    client = LiveClient(session=FakeSession([
        FakeResponse(200, {
            "activePlayer": {"summonerName": "Streamer#NA1"},
            "playerlist": [
                {"summonerName": "Enemy#TAG"},
                {"summonerName": "Streamer#NA1"},
            ],
            "gameStats": {"gameMode": "ARAM", "mapName": "Map12"},
        }),
    ]))

    status = client.get_status()

    assert status["connected"] is True
    assert status["activePlayer"]["riotId"] == "Streamer#NA1"
    assert status["participantCount"] == 2
    assert status["gameMode"] == "ARAM"
    assert status["mapName"] == "Map12"


def test_live_client_session_fingerprint_is_stable_across_player_order_changes():
    left = LiveClient(session=FakeSession([
        FakeResponse(200, {
            "activePlayer": {"riotId": "Streamer#NA1"},
            "allPlayers": [
                {"riotId": "Streamer#NA1"},
                {"riotId": "Enemy#TAG"},
                {"riotId": "Friend#TAG"},
            ],
            "gameData": {"gameMode": "CLASSIC", "mapName": "Map11"},
        }),
    ])).get_status()

    right = LiveClient(session=FakeSession([
        FakeResponse(200, {
            "activePlayer": {"riotId": "Streamer#NA1"},
            "allPlayers": [
                {"riotId": "Friend#TAG"},
                {"riotId": "Streamer#NA1"},
                {"riotId": "Enemy#TAG"},
            ],
            "gameData": {"gameMode": "CLASSIC", "mapName": "Map11"},
        }),
    ])).get_status()

    assert left["sessionFingerprint"] == right["sessionFingerprint"]
