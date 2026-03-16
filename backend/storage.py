"""SQLite storage for local encounter memory."""

from __future__ import annotations

import sqlite3
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable


SCHEMA_STATEMENTS: Iterable[str] = (
    """
    CREATE TABLE IF NOT EXISTS tracked_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        puuid TEXT NOT NULL UNIQUE,
        game_name TEXT NOT NULL,
        tag_line TEXT NOT NULL,
        region TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        puuid TEXT NOT NULL UNIQUE,
        game_name TEXT NOT NULL,
        tag_line TEXT NOT NULL,
        region TEXT NOT NULL,
        resolution_status TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracked_profile_id INTEGER NOT NULL,
        source TEXT NOT NULL,
        region TEXT NOT NULL,
        game_id INTEGER,
        queue_type TEXT,
        status TEXT NOT NULL,
        duration_seconds REAL NOT NULL,
        encounter_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tracked_profile_id) REFERENCES tracked_profiles (id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS scan_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id INTEGER NOT NULL,
        player_puuid TEXT NOT NULL,
        relation TEXT,
        champion_id INTEGER,
        team_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (scan_id, player_puuid),
        FOREIGN KEY (scan_id) REFERENCES scans (id) ON DELETE CASCADE,
        FOREIGN KEY (player_puuid) REFERENCES players (puuid) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS encounters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracked_profile_id INTEGER NOT NULL,
        player_puuid TEXT NOT NULL,
        scan_id INTEGER NOT NULL,
        match_id TEXT NOT NULL,
        played_at TEXT NOT NULL,
        relation TEXT NOT NULL,
        champion_id INTEGER,
        queue_id INTEGER,
        won INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (tracked_profile_id, player_puuid, match_id),
        FOREIGN KEY (tracked_profile_id) REFERENCES tracked_profiles (id) ON DELETE CASCADE,
        FOREIGN KEY (player_puuid) REFERENCES players (puuid) ON DELETE CASCADE,
        FOREIGN KEY (scan_id) REFERENCES scans (id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS watch_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracked_profile_id INTEGER NOT NULL,
        player_puuid TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (tracked_profile_id, player_puuid),
        FOREIGN KEY (tracked_profile_id) REFERENCES tracked_profiles (id) ON DELETE CASCADE,
        FOREIGN KEY (player_puuid) REFERENCES players (puuid) ON DELETE CASCADE
    )
    """,
)


class Storage:
    """Small SQLite wrapper for local scan memory."""

    def __init__(self, database_path):
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _initialize_schema(self) -> None:
        with self._connect() as connection:
            for statement in SCHEMA_STATEMENTS:
                connection.execute(statement)
            self._migrate_scans_table(connection)

    def _migrate_scans_table(self, connection: sqlite3.Connection) -> None:
        columns = {
            row["name"]: row
            for row in connection.execute("PRAGMA table_info(scans)").fetchall()
        }
        if not columns:
            return
        if not columns["game_id"]["notnull"] and not columns["queue_type"]["notnull"]:
            return

        connection.commit()
        connection.execute("PRAGMA foreign_keys = OFF")
        try:
            connection.execute("DROP TABLE IF EXISTS scans__new")
            connection.execute(
                """
                CREATE TABLE scans__new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tracked_profile_id INTEGER NOT NULL,
                    source TEXT NOT NULL,
                    region TEXT NOT NULL,
                    game_id INTEGER,
                    queue_type TEXT,
                    status TEXT NOT NULL,
                    duration_seconds REAL NOT NULL,
                    encounter_count INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tracked_profile_id) REFERENCES tracked_profiles (id) ON DELETE CASCADE
                )
                """
            )
            connection.execute(
                """
                INSERT INTO scans__new (
                    id,
                    tracked_profile_id,
                    source,
                    region,
                    game_id,
                    queue_type,
                    status,
                    duration_seconds,
                    encounter_count,
                    created_at
                )
                SELECT
                    id,
                    tracked_profile_id,
                    source,
                    region,
                    game_id,
                    queue_type,
                    status,
                    duration_seconds,
                    encounter_count,
                    created_at
                FROM scans
                """
            )
            connection.execute("DROP TABLE scans")
            connection.execute("ALTER TABLE scans__new RENAME TO scans")
            connection.commit()
        finally:
            connection.execute("PRAGMA foreign_keys = ON")

    def _select_id(self, table: str, **filters) -> int:
        where_clause = " AND ".join(f"{column} = ?" for column in filters)
        values = tuple(filters.values())

        with self._connect() as connection:
            row = connection.execute(
                f"SELECT id FROM {table} WHERE {where_clause}",
                values,
            ).fetchone()
        return int(row[0])

    def list_tables(self) -> list[str]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
                """
            ).fetchall()
        return [row[0] for row in rows]

    def upsert_tracked_profile(self, puuid, game_name, tag_line, region) -> int:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO tracked_profiles (puuid, game_name, tag_line, region)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(puuid) DO UPDATE SET
                    game_name = excluded.game_name,
                    tag_line = excluded.tag_line,
                    region = excluded.region,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (puuid, game_name, tag_line, region),
            )
        return self._select_id("tracked_profiles", puuid=puuid)

    def get_tracked_profile_by_riot_id(self, game_name, tag_line) -> dict | None:
        if not game_name or not tag_line:
            return None

        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT id, puuid, game_name, tag_line, region
                FROM tracked_profiles
                WHERE game_name = ? AND tag_line = ?
                ORDER BY updated_at DESC, id DESC
                LIMIT 1
                """,
                (game_name, tag_line),
            ).fetchone()

        if row is None:
            return None

        return {
            "id": int(row["id"]),
            "puuid": row["puuid"],
            "gameName": row["game_name"],
            "tagLine": row["tag_line"],
            "region": row["region"],
        }

    def upsert_player(self, puuid, game_name, tag_line, region, resolution_status) -> int:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO players (puuid, game_name, tag_line, region, resolution_status)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(puuid) DO UPDATE SET
                    game_name = excluded.game_name,
                    tag_line = excluded.tag_line,
                    region = excluded.region,
                    resolution_status = excluded.resolution_status,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (puuid, game_name, tag_line, region, resolution_status),
            )
        return self._select_id("players", puuid=puuid)

    def insert_scan(
        self,
        tracked_profile_id,
        source,
        region,
        game_id,
        queue_type,
        status,
        duration_seconds,
        encounter_count,
    ) -> int:
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO scans (
                    tracked_profile_id,
                    source,
                    region,
                    game_id,
                    queue_type,
                    status,
                    duration_seconds,
                    encounter_count
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    tracked_profile_id,
                    source,
                    region,
                    game_id,
                    queue_type,
                    status,
                    duration_seconds,
                    encounter_count,
                ),
            )
            return int(cursor.lastrowid)

    def insert_scan_participant(
        self,
        scan_id,
        player_puuid,
        relation=None,
        champion_id=None,
        team_id=None,
    ) -> int:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO scan_participants (
                    scan_id,
                    player_puuid,
                    relation,
                    champion_id,
                    team_id
                )
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(scan_id, player_puuid) DO UPDATE SET
                    relation = excluded.relation,
                    champion_id = excluded.champion_id,
                    team_id = excluded.team_id
                """,
                (scan_id, player_puuid, relation, champion_id, team_id),
            )
        return self._select_id(
            "scan_participants",
            scan_id=scan_id,
            player_puuid=player_puuid,
        )

    def insert_encounter(
        self,
        tracked_profile_id,
        player_puuid,
        scan_id,
        match_id,
        played_at,
        relation,
        champion_id,
        queue_id,
        won,
    ) -> int:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO encounters (
                    tracked_profile_id,
                    player_puuid,
                    scan_id,
                    match_id,
                    played_at,
                    relation,
                    champion_id,
                    queue_id,
                    won
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(tracked_profile_id, player_puuid, match_id) DO UPDATE SET
                    scan_id = excluded.scan_id,
                    played_at = excluded.played_at,
                    relation = excluded.relation,
                    champion_id = excluded.champion_id,
                    queue_id = excluded.queue_id,
                    won = excluded.won
                """,
                (
                    tracked_profile_id,
                    player_puuid,
                    scan_id,
                    match_id,
                    played_at,
                    relation,
                    champion_id,
                    queue_id,
                    won,
                ),
            )
        return self._select_id(
            "encounters",
            tracked_profile_id=tracked_profile_id,
            player_puuid=player_puuid,
            match_id=match_id,
        )

    def load_repeat_players(self, tracked_profile_id, player_puuids=None) -> list[dict]:
        if player_puuids is not None and not player_puuids:
            return []

        encounter_filter = ""
        params = [tracked_profile_id]
        if player_puuids:
            placeholders = ", ".join("?" for _ in player_puuids)
            encounter_filter = f" AND e.player_puuid IN ({placeholders})"
            params.extend(player_puuids)

        with self._connect() as connection:
            encounter_rows = connection.execute(
                f"""
                SELECT
                    e.player_puuid,
                    e.match_id,
                    e.played_at,
                    e.relation,
                    e.champion_id,
                    e.queue_id,
                    e.won,
                    p.game_name,
                    p.tag_line,
                    p.region,
                    p.resolution_status
                FROM encounters e
                JOIN players p ON p.puuid = e.player_puuid
                WHERE e.tracked_profile_id = ?{encounter_filter}
                ORDER BY e.player_puuid, e.played_at DESC, e.id DESC
                """,
                params,
            ).fetchall()

            if not encounter_rows:
                return []

            scan_rows = connection.execute(
                """
                SELECT id
                FROM scans
                WHERE tracked_profile_id = ?
                ORDER BY id DESC
                """,
                (tracked_profile_id,),
            ).fetchall()
            ordered_scan_ids = [int(row["id"]) for row in scan_rows]

            scan_hit_filter = ""
            scan_hit_params = [tracked_profile_id]
            if player_puuids:
                placeholders = ", ".join("?" for _ in player_puuids)
                scan_hit_filter = f" AND sp.player_puuid IN ({placeholders})"
                scan_hit_params.extend(player_puuids)

            hit_rows = connection.execute(
                f"""
                SELECT DISTINCT sp.player_puuid, sp.scan_id
                FROM scan_participants sp
                JOIN scans s ON s.id = sp.scan_id
                WHERE s.tracked_profile_id = ?{scan_hit_filter}
                ORDER BY sp.scan_id DESC
                """,
                scan_hit_params,
            ).fetchall()

        players: dict[str, dict] = {}
        for row in encounter_rows:
            player = players.setdefault(
                row["player_puuid"],
                {
                    "puuid": row["player_puuid"],
                    "gameName": row["game_name"],
                    "tagLine": row["tag_line"],
                    "region": row["region"],
                    "resolutionStatus": row["resolution_status"],
                    "encounters": [],
                },
            )
            player["encounters"].append(
                {
                    "matchId": row["match_id"],
                    "playedAt": row["played_at"],
                    "relation": row["relation"],
                    "championId": row["champion_id"],
                    "queueId": row["queue_id"],
                    "won": bool(row["won"]),
                }
            )

        scan_hits = defaultdict(set)
        for row in hit_rows:
            scan_hits[row["player_puuid"]].add(int(row["scan_id"]))

        repeat_players = []
        for player in players.values():
            player["stats"] = self._build_repeat_player_stats(
                player["encounters"],
                ordered_scan_ids,
                scan_hits.get(player["puuid"], set()),
            )
            repeat_players.append(player)

        repeat_players.sort(
            key=lambda player: (
                -player["stats"]["total_encounters"],
                player["gameName"].lower(),
                player["tagLine"].lower(),
            )
        )
        return repeat_players

    def count_encounters(self) -> int:
        with self._connect() as connection:
            row = connection.execute("SELECT COUNT(*) FROM encounters").fetchone()
        return int(row[0])

    @staticmethod
    def _build_repeat_player_stats(encounters, ordered_scan_ids, hit_scan_ids) -> dict:
        total_encounters = len(encounters)
        now = datetime.now(timezone.utc)
        last_30_days = now - timedelta(days=30)
        last_7_days = now - timedelta(days=7)

        played_at_values = [
            Storage._parse_timestamp(encounter["playedAt"])
            for encounter in encounters
        ]

        encounters_last_30d = [played_at for played_at in played_at_values if played_at >= last_30_days]
        encounters_last_7d = [played_at for played_at in played_at_values if played_at >= last_7_days]
        distinct_days_last_30d = {played_at.date().isoformat() for played_at in encounters_last_30d}

        enemy_count = sum(1 for encounter in encounters if encounter["relation"] == "enemy")
        ally_count = sum(1 for encounter in encounters if encounter["relation"] == "ally")

        return {
            "total_encounters": total_encounters,
            "encounters_last_30d": len(encounters_last_30d),
            "distinct_days_last_30d": len(distinct_days_last_30d),
            "encounters_last_7d": len(encounters_last_7d),
            "consecutive_scan_hits": Storage._count_consecutive_scan_hits(ordered_scan_ids, hit_scan_ids),
            "enemy_ratio": enemy_count / total_encounters if total_encounters else 0.0,
            "ally_ratio": ally_count / total_encounters if total_encounters else 0.0,
        }

    @staticmethod
    def _count_consecutive_scan_hits(ordered_scan_ids, hit_scan_ids) -> int:
        consecutive = 0
        for scan_id in ordered_scan_ids:
            if scan_id in hit_scan_ids:
                consecutive += 1
                continue
            if consecutive:
                break
            return 0
        return consecutive

    @staticmethod
    def _parse_timestamp(value: str) -> datetime:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
