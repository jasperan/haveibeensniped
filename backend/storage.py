"""SQLite storage for local encounter memory."""

from __future__ import annotations

import sqlite3
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
        game_id INTEGER NOT NULL,
        queue_type TEXT NOT NULL,
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
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _initialize_schema(self) -> None:
        with self._connect() as connection:
            for statement in SCHEMA_STATEMENTS:
                connection.execute(statement)

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

    def count_encounters(self) -> int:
        with self._connect() as connection:
            row = connection.execute("SELECT COUNT(*) FROM encounters").fetchone()
        return int(row[0])
