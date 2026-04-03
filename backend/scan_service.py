"""Scan orchestration for persisted manual scans."""

from __future__ import annotations

from datetime import datetime, timezone

from riot_client import normalize_riot_id_fields
from scoring import score_repeat_player


class ScanService:
    """Coordinates Riot lookups, persistence, and repeat-player scoring."""

    def __init__(self, storage, riot_client):
        self.storage = storage
        self.riot_client = riot_client

    def run_manual_scan(self, game_name, tag_line, region, *, source="manual", match_count=100):
        tracked_puuid = self.riot_client.get_puuid_by_riot_id(game_name, tag_line, region)
        if not tracked_puuid:
            raise ValueError("Player not found")

        tracked_profile_id = self.storage.upsert_tracked_profile(
            tracked_puuid,
            game_name,
            tag_line,
            region,
        )
        tracked_profile = {
            "id": tracked_profile_id,
            "puuid": tracked_puuid,
            "gameName": game_name,
            "tagLine": tag_line,
            "region": region,
        }

        active_game = self.riot_client.get_active_game(tracked_puuid, region)
        if not active_game:
            scan = self._insert_scan(
                tracked_profile_id=tracked_profile_id,
                source=source,
                region=region,
                game_id=None,
                queue_type=None,
                status="not_in_game",
                encounter_count=0,
            )
            return {
                "trackedProfile": tracked_profile,
                "scan": scan,
                "currentGame": None,
                "repeatPlayers": [],
            }

        participants = self._normalize_participants(
            active_game.get("participants", []),
            tracked_puuid=tracked_puuid,
            tracked_game_name=game_name,
            tracked_tag_line=tag_line,
            region=region,
        )
        lobby_puuids = [participant["puuid"] for participant in participants]
        history = self.riot_client.analyze_match_history(
            tracked_puuid,
            lobby_puuids,
            region,
            match_count=match_count,
        )
        encounter_count = sum(
            len(player_history.get("matches", [])) for player_history in history.values()
        )

        scan = self._insert_scan(
            tracked_profile_id=tracked_profile_id,
            source=source,
            region=region,
            game_id=active_game.get("gameId"),
            queue_type=active_game.get("gameMode"),
            status="ok",
            encounter_count=encounter_count,
        )

        for participant in participants:
            self._persist_participant(scan["id"], participant, region)

        self._persist_encounters(tracked_profile_id, scan["id"], history)
        repeat_players = self._build_repeat_players(
            tracked_profile_id,
            participants,
            history,
        )

        current_game = {
            "gameId": active_game.get("gameId"),
            "gameMode": active_game.get("gameMode"),
            "gameStartTime": active_game.get("gameStartTime"),
            "participants": participants,
        }

        return {
            "trackedProfile": tracked_profile,
            "scan": scan,
            "currentGame": current_game,
            "repeatPlayers": repeat_players,
        }

    def _insert_scan(
        self,
        tracked_profile_id,
        source,
        region,
        game_id,
        queue_type,
        status,
        encounter_count,
    ):
        scan_id = self.storage.insert_scan(
            tracked_profile_id=tracked_profile_id,
            source=source,
            region=region,
            game_id=game_id,
            queue_type=queue_type,
            status=status,
            duration_seconds=0.0,
            encounter_count=encounter_count,
        )
        return {
            "id": scan_id,
            "trackedProfileId": tracked_profile_id,
            "source": source,
            "region": region,
            "gameId": game_id,
            "queueType": queue_type,
            "status": status,
            "durationSeconds": 0.0,
            "encounterCount": encounter_count,
        }

    def _normalize_participants(
        self,
        participants,
        tracked_puuid,
        tracked_game_name,
        tracked_tag_line,
        region,
    ):
        normalized = []
        tracked_team_id = None

        for participant in participants:
            identity = normalize_riot_id_fields(participant)
            game_name = identity["game_name"]
            tag_line = identity["tag_line"]
            riot_id = identity["riot_id"]

            if participant.get("puuid") == tracked_puuid:
                game_name = tracked_game_name
                tag_line = tracked_tag_line
                riot_id = f"{tracked_game_name}#{tracked_tag_line}"
                tracked_team_id = participant.get("teamId")

            normalized.append(
                {
                    "puuid": participant.get("puuid"),
                    "riotId": riot_id,
                    "gameName": game_name,
                    "tagLine": tag_line,
                    "championId": participant.get("championId"),
                    "teamId": participant.get("teamId"),
                    "relation": None,
                    "region": region,
                }
            )

        if tracked_team_id is None:
            tracked_player = next(
                (participant for participant in normalized if participant["puuid"] == tracked_puuid),
                None,
            )
            if tracked_player:
                tracked_team_id = tracked_player.get("teamId")

        for participant in normalized:
            if participant["puuid"] == tracked_puuid:
                participant["relation"] = "self"
            elif tracked_team_id is None or participant.get("teamId") is None:
                participant["relation"] = None
            elif participant["teamId"] == tracked_team_id:
                participant["relation"] = "ally"
            else:
                participant["relation"] = "enemy"

        return normalized

    def _persist_participant(self, scan_id, participant, region):
        resolution_status = "tracked" if participant["relation"] == "self" else "resolved"
        self.storage.upsert_player(
            puuid=participant["puuid"],
            game_name=participant["gameName"],
            tag_line=participant["tagLine"],
            region=region,
            resolution_status=resolution_status,
        )
        self.storage.insert_scan_participant(
            scan_id=scan_id,
            player_puuid=participant["puuid"],
            relation=participant["relation"],
            champion_id=participant["championId"],
            team_id=participant["teamId"],
        )

    def _persist_encounters(self, tracked_profile_id, scan_id, history):
        for player_puuid, player_history in history.items():
            for match in player_history.get("matches", []):
                self.storage.insert_encounter(
                    tracked_profile_id=tracked_profile_id,
                    player_puuid=player_puuid,
                    scan_id=scan_id,
                    match_id=match["matchId"],
                    played_at=self._timestamp_to_iso(match.get("timestamp")),
                    relation=self._normalize_encounter_relation(match.get("team")),
                    champion_id=match.get("targetChampId"),
                    queue_id=match.get("queueId"),
                    won=1 if match.get("win") else 0,
                )

    def _build_repeat_players(self, tracked_profile_id, participants, history):
        participant_map = {
            participant["puuid"]: participant
            for participant in participants
            if participant["relation"] != "self"
        }
        if not participant_map:
            return []

        repeat_players = []

        for player in self.storage.load_repeat_players(
            tracked_profile_id,
            list(participant_map),
        ):
            current_participant = participant_map.get(player["puuid"], {})
            player_history = history.get(player["puuid"], {})
            total_games = player["stats"]["total_encounters"]
            wins = sum(1 for encounter in player["encounters"] if encounter["won"])
            repeat_players.append(
                {
                    "puuid": player["puuid"],
                    "riotId": f"{player['gameName']}#{player['tagLine']}",
                    "gameName": player["gameName"],
                    "tagLine": player["tagLine"],
                    "region": player["region"],
                    "championId": current_participant.get("championId"),
                    "teamId": current_participant.get("teamId"),
                    "relation": current_participant.get("relation"),
                    "matches": player_history.get("matches", []),
                    "totalGames": total_games,
                    "wins": wins,
                    "losses": total_games - wins,
                    "risk": score_repeat_player(player["stats"]),
                    "note": player.get("note"),
                    "watchNote": player.get("note"),
                }
            )

        return sorted(
            repeat_players,
            key=lambda player: (-player["risk"]["score"], -player["totalGames"]),
        )

    @staticmethod
    def _normalize_encounter_relation(team_value):
        return "ally" if team_value == "with" else "enemy"

    @staticmethod
    def _timestamp_to_iso(timestamp_ms):
        if not timestamp_ms:
            return datetime.now(timezone.utc).isoformat()
        return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).isoformat()
