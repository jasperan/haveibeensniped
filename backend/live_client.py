import hashlib
from typing import Any, Dict, Iterable, Optional

import requests

from riot_client import normalize_riot_id_fields


class LiveClient:
    BASE_URL = "https://127.0.0.1:2999/liveclientdata/allgamedata"

    def __init__(self, session=None):
        self.session = session or requests.Session()

    def get_status(self) -> Dict[str, Any]:
        try:
            response = self.session.get(self.BASE_URL, timeout=2, verify=False)
        except OSError:
            return self._disconnected()
        except requests.RequestException:
            return self._disconnected()

        if response.status_code != 200:
            return self._disconnected()

        try:
            payload = response.json() or {}
        except ValueError:
            return self._disconnected()

        if not isinstance(payload, dict):
            payload = {}

        active_player = self._normalize_active_player(payload.get("activePlayer") or {})
        all_players = payload.get("allPlayers") or payload.get("playerlist") or []
        game_data = payload.get("gameData") or payload.get("gameStats") or {}

        return {
            "connected": True,
            "inGame": True,
            "activePlayer": active_player,
            "participantCount": len(all_players),
            "gameMode": game_data.get("gameMode"),
            "mapName": game_data.get("mapName"),
            "sessionFingerprint": self._build_fingerprint(active_player, all_players, game_data),
        }

    def _disconnected(self) -> Dict[str, Any]:
        return {
            "connected": False,
            "inGame": False,
            "activePlayer": None,
            "participantCount": 0,
            "gameMode": None,
            "mapName": None,
            "sessionFingerprint": None,
        }

    def _normalize_active_player(self, participant: Dict[str, Any]) -> Dict[str, str]:
        normalized = normalize_riot_id_fields(self._with_riot_id_shim(participant))
        return {
            "riotId": normalized["riot_id"],
            "gameName": normalized["game_name"],
            "tagLine": normalized["tag_line"],
        }

    def _build_fingerprint(
        self,
        active_player: Dict[str, str],
        all_players: Iterable[Dict[str, Any]],
        game_data: Dict[str, Any],
    ) -> Optional[str]:
        riot_ids = sorted({
            normalize_riot_id_fields(self._with_riot_id_shim(player)).get("riot_id")
            for player in all_players or []
            if isinstance(player, dict)
        })

        components = [
            active_player.get("riotId") or "",
            *riot_ids,
            str(game_data.get("gameMode") or ""),
            str(game_data.get("mapName") or ""),
        ]
        fingerprint_source = "|".join(components)

        if not fingerprint_source.replace("|", ""):
            return None

        return hashlib.sha256(fingerprint_source.encode("utf-8")).hexdigest()

    def _with_riot_id_shim(self, participant: Dict[str, Any]) -> Dict[str, Any]:
        normalized_participant = dict(participant or {})
        summoner_name = str(normalized_participant.get("summonerName") or "").strip()

        if not normalized_participant.get("riotId") and "#" in summoner_name:
            normalized_participant["riotId"] = summoner_name

        return normalized_participant
