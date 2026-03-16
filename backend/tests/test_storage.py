from storage import Storage
from utils import load_runtime_config


def test_initialize_creates_core_tables(tmp_path):
    storage = Storage(tmp_path / "hibs.db")
    tables = storage.list_tables()

    assert "tracked_profiles" in tables
    assert "players" in tables
    assert "scans" in tables
    assert "scan_participants" in tables
    assert "encounters" in tables


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


def test_load_runtime_config_resolves_database_path(tmp_path):
    config_path = tmp_path / "config.yaml"
    config_path.write_text(
        'riot_api_key: "test-key"\ndatabase_path: "data/haveibeensniped.db"\n',
        encoding="utf-8",
    )

    config = load_runtime_config(config_path)

    assert config["DATABASE_PATH"] == str(tmp_path / "data" / "haveibeensniped.db")
