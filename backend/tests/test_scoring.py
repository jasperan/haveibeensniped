from scoring import score_repeat_player


def test_one_off_encounter_stays_low():
    result = score_repeat_player({
        "total_encounters": 1,
        "encounters_last_30d": 1,
        "distinct_days_last_30d": 1,
        "encounters_last_7d": 1,
        "consecutive_scan_hits": 0,
        "enemy_ratio": 0.5,
        "ally_ratio": 0.5,
    })

    assert result["score"] <= 35
    assert result["tier"] in {"background", "repeat"}


def test_repeated_enemy_encounters_reach_watch_tier():
    result = score_repeat_player({
        "total_encounters": 4,
        "encounters_last_30d": 4,
        "distinct_days_last_30d": 3,
        "encounters_last_7d": 3,
        "consecutive_scan_hits": 2,
        "enemy_ratio": 0.75,
        "ally_ratio": 0.25,
    })

    assert result["score"] >= 50
    assert result["tier"] in {"watch", "high-attention"}
    assert result["reasons"]


def test_ally_heavy_pattern_gets_penalized():
    result = score_repeat_player({
        "total_encounters": 4,
        "encounters_last_30d": 4,
        "distinct_days_last_30d": 3,
        "encounters_last_7d": 3,
        "consecutive_scan_hits": 2,
        "enemy_ratio": 0.2,
        "ally_ratio": 0.8,
    })

    assert result["score"] < 50
