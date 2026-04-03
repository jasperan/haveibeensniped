import sqlite3

from storage import Storage


def test_initialize_creates_core_tables(tmp_path):
    storage = Storage(tmp_path / "hibs.db")
    tables = storage.list_tables()

    assert "tracked_profiles" in tables
    assert "players" in tables
    assert "scans" in tables
    assert "scan_participants" in tables
    assert "encounters" in tables
    assert "watch_notes" in tables


def test_upsert_tracked_profile_is_idempotent(tmp_path):
    storage = Storage(tmp_path / "hibs.db")

    first_id = storage.upsert_tracked_profile(
        puuid="p1", game_name="Streamer", tag_line="NA1", region="NA1"
    )
    second_id = storage.upsert_tracked_profile(
        puuid="p1", game_name="Streamer", tag_line="NA1", region="NA1"
    )

    assert first_id == second_id


def test_insert_encounter_dedupes_same_match(tmp_path):
    storage = Storage(tmp_path / "hibs.db")
    profile_id = storage.upsert_tracked_profile("self", "Streamer", "NA1", "NA1")
    storage.upsert_player("target", "Enemy", "TAG", "NA1", "resolved")
    scan_id = storage.insert_scan(profile_id, "manual", "NA1", 123, "CLASSIC", "ok", 1.0, 0)

    storage.insert_encounter(profile_id, "target", scan_id, "MATCH-1", "2026-03-16T00:00:00Z", "enemy", 81, 157, 1)
    storage.insert_encounter(profile_id, "target", scan_id, "MATCH-1", "2026-03-16T00:00:00Z", "enemy", 81, 157, 1)

    assert storage.count_encounters() == 1


def test_initialize_migrates_scans_table_for_not_in_game_rows(tmp_path):
    db_path = tmp_path / "hibs.db"

    with sqlite3.connect(db_path) as connection:
        connection.execute(
            """
            CREATE TABLE tracked_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                puuid TEXT NOT NULL UNIQUE,
                game_name TEXT NOT NULL,
                tag_line TEXT NOT NULL,
                region TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE scans (
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
            """
        )
        connection.execute(
            "INSERT INTO tracked_profiles (puuid, game_name, tag_line, region) VALUES (?, ?, ?, ?)",
            ("self", "Streamer", "NA1", "NA1"),
        )
        connection.execute(
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
            (1, "manual", "NA1", 123, "CLASSIC", "ok", 0.5, 1),
        )

    storage = Storage(db_path)
    scan_id = storage.insert_scan(1, "manual", "NA1", None, None, "not_in_game", 0.0, 0)

    with sqlite3.connect(db_path) as connection:
        rows = connection.execute(
            "SELECT game_id, queue_type, status FROM scans ORDER BY id"
        ).fetchall()

    assert len(rows) == 2
    assert rows[0] == (123, "CLASSIC", "ok")
    assert rows[1] == (None, None, "not_in_game")


def test_watch_note_round_trip_and_summary(tmp_path):
    storage = Storage(tmp_path / "hibs.db")
    profile_id = storage.upsert_tracked_profile("self", "Streamer", "NA1", "NA1")
    storage.upsert_player("target", "Enemy", "TAG", "NA1", "resolved")
    scan_id = storage.insert_scan(profile_id, "manual", "NA1", 123, "CLASSIC", "ok", 1.0, 1)
    storage.insert_scan_participant(scan_id, "target", "enemy", 81, 200)
    storage.insert_encounter(profile_id, "target", scan_id, "MATCH-1", "2026-03-16T00:00:00Z", "enemy", 81, 157, 1)

    assert storage.get_watch_note(profile_id, "target") is None

    storage.upsert_watch_note(profile_id, "target", "keep an eye on this account")
    assert storage.get_watch_note(profile_id, "target") == "keep an eye on this account"

    summary = storage.get_memory_summary()
    assert summary["stats"]["watchNoteCount"] == 1
    assert summary["topRepeatPlayers"][0]["note"] == "keep an eye on this account"
    assert summary["topRepeatPlayers"][0]["watchNote"] == "keep an eye on this account"

    overview = storage.load_memory_overview(profile_id)
    assert overview["topRepeatPlayers"][0]["risk"]["tier"] in {"background", "repeat", "watch", "high-attention"}
    assert overview["topRepeatPlayers"][0]["watchNote"] == "keep an eye on this account"
