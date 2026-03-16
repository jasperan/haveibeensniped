"""Pure repeat-player risk scoring."""

from __future__ import annotations


TIERS = {
    "background": (0, 24),
    "repeat": (25, 49),
    "watch": (50, 74),
    "high-attention": (75, 100),
}


def _tier_for_score(score: int) -> str:
    for tier, (minimum, maximum) in TIERS.items():
        if minimum <= score <= maximum:
            return tier
    raise ValueError(f"No tier configured for score {score}")


def score_repeat_player(stats: dict) -> dict:
    score = 0
    score += min(stats["total_encounters"], 5) * 8
    score += min(stats["encounters_last_30d"], 4) * 6
    score += min(stats["distinct_days_last_30d"], 4) * 5
    score += min(stats["consecutive_scan_hits"], 3) * 8

    enemy_bonus = max(stats["enemy_ratio"] - 0.5, 0) / 0.5 * 15
    ally_penalty = max(stats["ally_ratio"] - 0.6, 0) / 0.4 * 12

    score += round(enemy_bonus)
    score -= round(ally_penalty)

    if stats["encounters_last_7d"] >= 3:
        score += 10
    if stats["total_encounters"] < 2:
        score = min(score, 35)
    if stats["ally_ratio"] >= 0.75 and stats["enemy_ratio"] <= 0.25:
        score = min(score, 49)

    score = max(0, min(score, 100))

    return {
        "score": score,
        "tier": _tier_for_score(score),
        "reasons": build_reasons(stats, score),
    }


def build_reasons(stats: dict, score: int) -> list[str]:
    reasons = []

    if stats["total_encounters"] >= 3:
        reasons.append(f"{stats['total_encounters']} total encounters on record")
    elif stats["total_encounters"] == 1:
        reasons.append("only one recorded encounter so far")

    if stats["distinct_days_last_30d"] >= 3:
        reasons.append(
            f"seen across {stats['distinct_days_last_30d']} distinct days in the last 30 days"
        )

    if stats["consecutive_scan_hits"] >= 2:
        reasons.append(
            f"appeared in {stats['consecutive_scan_hits']} consecutive scans"
        )

    if stats["encounters_last_7d"] >= 3:
        reasons.append("3 or more encounters landed in the last 7 days")

    if stats["enemy_ratio"] > 0.5:
        reasons.append(
            f"{round(stats['enemy_ratio'] * 100)}% of recent encounters were on the enemy side"
        )

    if stats["ally_ratio"] >= 0.75 and stats["enemy_ratio"] <= 0.25:
        reasons.append("mostly ally-side history lowers the repeat-player risk")
    elif stats["ally_ratio"] > 0.6:
        reasons.append("ally-heavy history trims the score")

    if not reasons:
        reasons.append(f"overall score settled at {score} from a limited encounter history")

    return reasons
