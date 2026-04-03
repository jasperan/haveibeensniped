"""Demo-mode backend providers for local end-to-end walkthroughs."""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone


DEMO_RIOT_ID = "Streamer#NA1"
DEMO_PUUID = "demo-self-puuid"


def _timestamp_days_ago(days_ago: int, hour: int = 18, minute: int = 30) -> int:
    moment = datetime.now(timezone.utc) - timedelta(days=days_ago)
    normalized = moment.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return int(normalized.timestamp() * 1000)


def _match(
    match_id: str,
    days_ago: int,
    win: bool,
    team: str,
    player_champ_id: int,
    target_champ_id: int,
    queue_id: int = 420,
) -> dict:
    return {
        "matchId": match_id,
        "timestamp": _timestamp_days_ago(days_ago),
        "win": win,
        "team": team,
        "playerChampId": player_champ_id,
        "targetChampId": target_champ_id,
        "queueId": queue_id,
    }


DEMO_PARTICIPANTS = [
    {"puuid": DEMO_PUUID, "riotId": DEMO_RIOT_ID, "championId": 81, "teamId": 100},
    {"puuid": "demo-ally-1", "riotId": "PocketYuumi#CAT", "championId": 412, "teamId": 100},
    {"puuid": "demo-ally-2", "riotId": "LaneBuddy#MID", "championId": 3, "teamId": 100},
    {"puuid": "demo-ally-3", "riotId": "WaveManager#TOP", "championId": 64, "teamId": 100},
    {"puuid": "demo-ally-4", "riotId": "ObjectivePing#JG", "championId": 236, "teamId": 100},
    {"puuid": "demo-enemy-1", "riotId": "FogOfWar#GANK", "championId": 157, "teamId": 200},
    {"puuid": "demo-enemy-2", "riotId": "MapHackMaybe#LOL", "championId": 202, "teamId": 200},
    {"puuid": "demo-enemy-3", "riotId": "SideLaneGhost#TP", "championId": 222, "teamId": 200},
    {"puuid": "demo-enemy-4", "riotId": "FlashTracker#CD", "championId": 81, "teamId": 200},
    {"puuid": "demo-enemy-5", "riotId": "LateInvader#RED", "championId": 412, "teamId": 200},
]


DEMO_HISTORY = {
    "demo-enemy-1": {
        "matches": [
            _match("DEMO-MATCH-001", 2, False, "against", 81, 157),
            _match("DEMO-MATCH-002", 5, True, "against", 236, 157),
            _match("DEMO-MATCH-003", 8, False, "against", 81, 157),
            _match("DEMO-MATCH-004", 13, True, "against", 222, 157),
        ],
    },
    "demo-enemy-2": {
        "matches": [
            _match("DEMO-MATCH-005", 1, False, "against", 81, 202),
            _match("DEMO-MATCH-006", 7, False, "against", 81, 202),
            _match("DEMO-MATCH-007", 17, True, "against", 202, 202),
        ],
    },
    "demo-ally-1": {
        "matches": [
            _match("DEMO-MATCH-008", 3, True, "with", 81, 412),
            _match("DEMO-MATCH-009", 11, True, "with", 81, 412),
        ],
    },
    "demo-ally-2": {
        "matches": [
            _match("DEMO-MATCH-010", 6, True, "with", 81, 3),
        ],
    },
}

for value in DEMO_HISTORY.values():
    matches = value["matches"]
    total_games = len(matches)
    wins = sum(1 for match in matches if match["win"])
    value["totalGames"] = total_games
    value["wins"] = wins
    value["losses"] = total_games - wins


def demo_session_fingerprint() -> str:
    participants = sorted(player["riotId"] for player in DEMO_PARTICIPANTS)
    source = "|".join([DEMO_RIOT_ID, *participants, "CLASSIC", "Summoner's Rift"])
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


class DemoRiotClient:
    """Riot-client shaped provider that returns deterministic demo data."""

    def get_puuid_by_riot_id(self, game_name: str, tag_line: str, region: str) -> str | None:
        if not game_name or not tag_line or not region:
            return None
        return DEMO_PUUID

    def get_active_game(self, puuid: str, region: str) -> dict | None:
        if puuid != DEMO_PUUID:
            return None
        return {
            "gameId": 9001001,
            "gameMode": "CLASSIC",
            "gameStartTime": _timestamp_days_ago(0, hour=19, minute=15),
            "participants": [dict(player) for player in DEMO_PARTICIPANTS],
        }

    def analyze_match_history(self, user_puuid: str, lobby_puuids: list[str], region: str, match_count: int = 100) -> dict:
        if user_puuid != DEMO_PUUID:
            return {}
        return {
            puuid: {
                **history,
                "matches": history["matches"][:match_count],
            }
            for puuid, history in DEMO_HISTORY.items()
            if puuid in lobby_puuids
        }


class DemoLiveClient:
    """Local live-client shaped provider for demo mode."""

    def get_status(self) -> dict:
        return {
            "connected": True,
            "inGame": True,
            "activePlayer": {
                "riotId": DEMO_RIOT_ID,
                "gameName": "Streamer",
                "tagLine": "NA1",
            },
            "participantCount": len(DEMO_PARTICIPANTS),
            "gameMode": "CLASSIC",
            "mapName": "Summoner's Rift",
            "sessionFingerprint": demo_session_fingerprint(),
        }
