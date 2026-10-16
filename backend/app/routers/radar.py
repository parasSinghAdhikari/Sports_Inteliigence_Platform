"""
Radar / Percentile endpoint for player comparison charts.

Returns per-90 metric values AND league percentiles (0-100) for each player
calculated against a cohort of eligible players (same season, min 900 minutes).

Position-aware metric sets:
  FW / ST : npG/90, G+A/90, Assists/90, Minutes, Goals, YellowCards
  MF      : Assists/90, npG/90, G+A/90, Minutes, Goals, YellowCards
  DF / GK : Assists/90, G+A/90, Minutes, YellowCards, npG/90, Goals

Percentile calculation:
  - Percentile of value X in array A = (# values in A < X) / (len(A) - 1) * 100
  - Ties broken by counting strictly lower values (rank ties share the same pct)
  - Yellow cards use LOWER = BETTER (inverted: pct = 100 - raw_pct)
  - Players with NULL stats treated as missing, excluded from cohort
  - Minimum cohort size = 10 players; if smaller, raw values returned but
    percentiles are null with an explanatory message
"""
from fastapi import APIRouter, Depends, Query
from app.database import get_db

router = APIRouter()

MIN_MINUTES = 900   # configurable minimum for full percentile calculation
MIN_COHORT  = 10    # minimum cohort size to compute valid percentiles


# Ordered metrics per position group.  Each entry:
#   (db_column, display_label, unit, lower_is_better)
POSITION_METRICS: dict[str, list[tuple]] = {
    "FW": [
        ("non_pen_goals_per90",         "npG / 90",       "/90",  False),
        ("goals_per90",                 "Goals / 90",     "/90",  False),
        ("assists_per90",               "Assists / 90",   "/90",  False),
        ("goal_contributions_per90",    "G+A / 90",       "/90",  False),
        ("non_pen_contributions_per90", "npG+A / 90",     "/90",  False),
        ("yellow_cards",                "Yellow Cards",   "",     True ),
    ],
    "MF": [
        ("assists_per90",               "Assists / 90",   "/90",  False),
        ("goal_contributions_per90",    "G+A / 90",       "/90",  False),
        ("non_pen_goals_per90",         "npG / 90",       "/90",  False),
        ("non_pen_contributions_per90", "npG+A / 90",     "/90",  False),
        ("goals_per90",                 "Goals / 90",     "/90",  False),
        ("yellow_cards",                "Yellow Cards",   "",     True ),
    ],
    "DF": [
        ("assists_per90",               "Assists / 90",   "/90",  False),
        ("goal_contributions_per90",    "G+A / 90",       "/90",  False),
        ("non_pen_goals_per90",         "npG / 90",       "/90",  False),
        ("non_pen_contributions_per90", "npG+A / 90",     "/90",  False),
        ("goals_per90",                 "Goals / 90",     "/90",  False),
        ("yellow_cards",                "Yellow Cards",   "",     True ),
    ],
}
# GK / unknown fall back to DF metrics
POSITION_METRICS["GK"] = POSITION_METRICS["DF"]


def _pct(value, cohort: list[float], lower_is_better: bool) -> float | None:
    """Percentile of value in cohort (strictly lower count method)."""
    if value is None or len(cohort) < 2:
        return None
    below = sum(1 for v in cohort if v < value)
    raw = round(below / (len(cohort) - 1) * 100)
    return round(100 - raw) if lower_is_better else raw


def _fetch_cohort(cur, position: str, min_mins: int) -> list[dict]:
    """Fetch all eligible players for the percentile cohort."""
    cur.execute("""
        SELECT p.id, p.name, p.position,
               pss.minutes,
               pss.goals_per90, pss.assists_per90,
               pss.goal_contributions_per90,
               pss.non_pen_goals_per90, pss.non_pen_contributions_per90,
               pss.yellow_cards
        FROM players p
        JOIN player_season_stats pss ON pss.player_id = p.id
        WHERE p.position = %s AND pss.minutes >= %s
    """, (position, min_mins))
    return [dict(r) for r in cur.fetchall()]


def _player_data(cur, player_id: int) -> dict | None:
    cur.execute("""
        SELECT p.id, p.name, t.name AS team, p.position, p.age,
               pss.minutes, pss.goals, pss.assists,
               pss.goals_per90, pss.assists_per90,
               pss.goal_contributions_per90,
               pss.non_pen_goals_per90, pss.non_pen_contributions_per90,
               pss.yellow_cards, pss.matches_played
        FROM players p
        JOIN teams t ON t.id = p.team_id
        JOIN player_season_stats pss ON pss.player_id = p.id
        WHERE p.id = %s
    """, (player_id,))
    row = cur.fetchone()
    return dict(row) if row else None


@router.get("/radar")
def player_radar(
    player1_id: int = Query(..., description="First player ID"),
    player2_id: int = Query(None,  description="Second player ID (optional)"),
    min_minutes: int = Query(MIN_MINUTES, ge=0, le=3420),
    db=Depends(get_db),
):
    """
    Return radar chart data for 1 or 2 players.

    Response shape:
    {
      "metrics": [{"key", "label", "unit", "lower_is_better"}, ...],
      "cohort":  {"position", "min_minutes", "size"},
      "warning": null | "string",
      "players": [
        {
          "id", "name", "team", "position", "age", "minutes",
          "stats": {"metric_key": {"value": float, "percentile": 0-100 | null}}
        },
        ...
      ]
    }
    """
    from fastapi import HTTPException

    with db.cursor() as cur:
        p1 = _player_data(cur, player1_id)
        if not p1:
            raise HTTPException(404, "Player 1 not found")

        p2 = _player_data(cur, player2_id) if player2_id else None
        if player2_id and not p2:
            raise HTTPException(404, "Player 2 not found")

        # Determine position group: if two players, use P1's position
        pos = p1["position"] or "MF"
        metrics = POSITION_METRICS.get(pos, POSITION_METRICS["MF"])

        # Build cohort from the same position group
        cohort = _fetch_cohort(cur, pos, min_minutes)

    # Warn if cohort is small
    warning = None
    if len(cohort) < MIN_COHORT:
        warning = (
            f"Only {len(cohort)} {pos} players have ≥{min_minutes} minutes "
            f"(minimum for reliable percentiles: {MIN_COHORT}). "
            "Percentiles may not be meaningful."
        )

    def _build_player_stats(player: dict) -> dict:
        result = {}
        for key, label, unit, lib in metrics:
            val = player.get(key)
            # Build cohort vector for this metric (exclude nulls)
            vec = [r[key] for r in cohort if r.get(key) is not None]
            pct = _pct(val, vec, lib) if val is not None else None
            result[key] = {
                "value":       round(float(val), 3) if val is not None else None,
                "percentile":  pct,
            }
        return result

    players_out = []
    for p in ([p1] if not p2 else [p1, p2]):
        players_out.append({
            "id":       p["id"],
            "name":     p["name"],
            "team":     p["team"],
            "position": p["position"],
            "age":      p["age"],
            "minutes":  p["minutes"],
            "goals":    p["goals"],
            "assists":  p["assists"],
            "stats":    _build_player_stats(p),
        })

    return {
        "metrics": [
            {"key": k, "label": l, "unit": u, "lower_is_better": lib}
            for k, l, u, lib in metrics
        ],
        "cohort": {
            "position":    pos,
            "min_minutes": min_minutes,
            "size":        len(cohort),
        },
        "season": "2024-25 Premier League",
        "warning": warning,
        "players": players_out,
    }
