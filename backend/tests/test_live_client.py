from live_client import LiveClient


class FakeResponse:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []

    def get(self, url, timeout=None, verify=None):
        self.calls.append((url, timeout, verify))
        return self.responses.pop(0)


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


def test_live_client_reports_disconnected_when_local_api_is_unreachable():
    class BrokenSession:
        def get(self, url, timeout=None, verify=None):
            raise OSError("connection refused")

    client = LiveClient(session=BrokenSession())
    status = client.get_status()

    assert status == {
        "connected": False,
        "inGame": False,
        "activePlayer": None,
        "participantCount": 0,
        "gameMode": None,
        "mapName": None,
        "sessionFingerprint": None,
    }
