"""
Similar Player Engine + Scout Score

M8: Given a player_id, find the N most similar players using
    cosine similarity on normalized per-90 stats.

M9: Scout Score — a composite 0-100 metric that weights:
    - Goal contribution rate (G+A/90)
    - Efficiency vs raw output
    - Age (peak years 23-28 = bonus)
    - Minutes played (fitness proxy)
"""
from fastapi import APIRouter, Depends, Query
from app.database import get_db
import math

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

STAT_WEIGHTS = {
    "goals_per90":                 0.30,
    "assists_per90":               0.20,
    "goal_contributions_per90":    0.25,
    "non_pen_goals_per90":         0.15,
    "non_pen_contributions_per90": 0.10,
}

def _scout_score(row: dict) -> float:
    """
    Composite Scout Score 0-100.

    Formula:
      base  = weighted sum of per-90 rates (capped at realistic maxima)
      bonus = age bonus for players in peak years (23-28)
      mins  = minutes-played confidence multiplier (≥ 900 min = full weight)
    """
    # Weighted per-90 contribution
    base = 0.0
    caps = {
        "goals_per90":                 1.5,
        "assists_per90":               1.0,
        "goal_contributions_per90":    2.0,
        "non_pen_goals_per90":         1.5,
        "non_pen_contributions_per90": 2.0,
    }
    for stat, weight in STAT_WEIGHTS.items():
        val = row.get(stat) or 0.0
        cap = caps[stat]
        base += weight * min(float(val) / cap, 1.0)

    # Age bonus: players aged 23-28 get up to +0.1 multiplier
    age = row.get("age") or 26
    if 23 <= age <= 28:
        age_mult = 1.0 + (1 - abs(age - 25.5) / 5.0) * 0.10
    else:
        age_mult = max(0.75, 1.0 - abs(age - 25.5) * 0.02)

    # Minutes confidence: full score needs >= 900 min
    mins = row.get("minutes") or 0
    conf = min(float(mins) / 900.0, 1.0)

    score = base * age_mult * conf * 100
    return round(min(score, 100.0), 1)


def _cosine_sim(a: dict, b: dict, keys: list[str]) -> float:
    """Cosine similarity between two stat vectors."""
    dot = sum((a.get(k) or 0.0) * (b.get(k) or 0.0) for k in keys)
    mag_a = math.sqrt(sum((a.get(k) or 0.0) ** 2 for k in keys))
    mag_b = math.sqrt(sum((b.get(k) or 0.0) ** 2 for k in keys))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


SIM_KEYS = [
    "goals_per90", "assists_per90", "goal_contributions_per90",
    "non_pen_goals_per90", "non_pen_contributions_per90",
]

FULL_QUERY = """
    SELECT
        p.id, p.name, t.name AS team, p.position, p.age,
        pss.goals, pss.assists, pss.minutes,
        pss.goals_per90, pss.assists_per90,
        pss.goal_contributions_per90,
        pss.non_pen_goals_per90, pss.non_pen_contributions_per90,
        pss.yellow_cards, pss.red_cards,
        pss.matches_played, pss.goals_plus_assists
    FROM players p
    JOIN teams t ON t.id = p.team_id
    LEFT JOIN player_season_stats pss ON pss.player_id = p.id
"""


# ── M8: Similar Players ────────────────────────────────────────────────────────

@router.get("/{player_id}/similar")
def similar_players(
    player_id: int,
    n: int = Query(6, le=20),
    same_position: bool = True,
    db=Depends(get_db),
):
    """
    Find the N most similar players to a given player using
    cosine similarity on per-90 attacking stats.
    """
    with db.cursor() as cur:
        # Fetch target player
        cur.execute(FULL_QUERY + " WHERE p.id = %s", (player_id,))
        target = cur.fetchone()
        if not target:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Player not found")

        target = dict(target)

        # Fetch all others
        if same_position and target.get("position"):
            cur.execute(FULL_QUERY + " WHERE p.position = %s AND p.id != %s",
                        (target["position"], player_id))
        else:
            cur.execute(FULL_QUERY + " WHERE p.id != %s", (player_id,))

        pool = [dict(r) for r in cur.fetchall()]

    # Score similarity
    scored = []
    for p in pool:
        sim = _cosine_sim(target, p, SIM_KEYS)
        scored.append({**p, "similarity": round(sim * 100, 1)})

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    top = scored[:n]

    return {
        "player": target,
        "similar": top,
    }


# ── M9: Scout Score ────────────────────────────────────────────────────────────

@router.get("/scout-score")
def scout_score_rankings(
    limit: int = Query(20, le=100),
    position: str = Query(None),
    min_minutes: int = Query(500),
    max_age: int = Query(32),
    db=Depends(get_db),
):
    """
    Return players ranked by Scout Score — a composite 0-100 metric
    combining per-90 rates, age, and minutes played.

    Useful for scouting young/emerging talent.
    """
    with db.cursor() as cur:
        conditions = ["pss.minutes >= %s", "p.age <= %s"]
        params = [min_minutes, max_age]

        if position:
            conditions.append("p.position = %s")
            params.append(position.upper())

        where = "WHERE " + " AND ".join(conditions)

        cur.execute(FULL_QUERY + where, params)
        rows = [dict(r) for r in cur.fetchall()]

    # Compute scout score for each player
    scored = []
    for r in rows:
        score = _scout_score(r)
        scored.append({**r, "scout_score": score})

    scored.sort(key=lambda x: x["scout_score"], reverse=True)
    return {
        "filters": {
            "position": position,
            "min_minutes": min_minutes,
            "max_age": max_age,
        },
        "players": scored[:limit],
    }


@router.get("/{player_id}/scout-report")
def player_scout_report(player_id: int, db=Depends(get_db)):
    """Full scouting report for a single player including score breakdown."""
    with db.cursor() as cur:
        cur.execute(FULL_QUERY + " WHERE p.id = %s", (player_id,))
        row = cur.fetchone()

    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Player not found")

    p = dict(row)
    score = _scout_score(p)

    # Percentile-like breakdown (raw scores per component)
    breakdown = {}
    caps = {
        "goals_per90":                 1.5,
        "assists_per90":               1.0,
        "goal_contributions_per90":    2.0,
        "non_pen_goals_per90":         1.5,
        "non_pen_contributions_per90": 2.0,
    }
    for stat, weight in STAT_WEIGHTS.items():
        val = float(p.get(stat) or 0.0)
        cap = caps[stat]
        breakdown[stat] = {
            "value":      round(val, 3),
            "weight":     weight,
            "score":      round(min(val / cap, 1.0) * weight * 100, 1),
        }

    return {
        "player": p,
        "scout_score": score,
        "breakdown": breakdown,
    }
