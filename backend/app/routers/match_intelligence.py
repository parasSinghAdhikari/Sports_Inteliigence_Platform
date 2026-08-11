"""
M10 — Match Intelligence API endpoints.

Provides per-match stats (shots, SoT, fouls, cards),
home/away splits per team, head-to-head records,
and season form/trend data.
"""
from fastapi import APIRouter, Depends, Query
import psycopg2
from app.database import get_db

router = APIRouter()

# Consistent message returned when the match_stats table hasn't been loaded yet
# (created by scripts/load_match_stats.py). Avoids 500 errors on missing table.
NO_MATCH_STATS_MSG = "Run extract_match_stats.py + load_match_stats.py first"


@router.get("/match/{game_id}")
def match_detail(game_id: str, db=Depends(get_db)):
    """Full match detail including shots, cards, fouls for both teams."""
    with db.cursor() as cur:
        # Base match info
        cur.execute("""
            SELECT m.id, m.matchweek, m.match_date, m.venue, m.referee, m.attendance,
                   ht.id AS home_id, ht.name AS home_team,
                   m.home_score,
                   at.id AS away_id, at.name AS away_team,
                   m.away_score, m.game_id
            FROM matches m
            JOIN teams ht ON ht.id = m.home_team_id
            JOIN teams at ON at.id = m.away_team_id
            WHERE m.game_id = %s
        """, (game_id,))
        match = cur.fetchone()
        if not match:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Match not found")
        match = dict(match)

        # Team stats for this match
        try:
            cur.execute("""
                SELECT t.name AS team, ms.venue, ms.result,
                       ms.shots, ms.shots_on_target,
                       ms.goals_for, ms.goals_against,
                       ms.fouls, ms.yellow_cards, ms.red_cards, ms.pen_attempts
                FROM match_stats ms
                JOIN teams t ON t.id = ms.team_id
                WHERE ms.match_id = %s
                ORDER BY ms.venue
            """, (match["id"],))
            stats = [dict(r) for r in cur.fetchall()]
        except psycopg2.errors.UndefinedTable:
            return {"match": match, "team_stats": [], "message": NO_MATCH_STATS_MSG}

    return {"match": match, "team_stats": stats}


@router.get("/team/{team_id}/home-away")
def home_away_split(team_id: int, db=Depends(get_db)):
    """Home vs Away performance split for a team."""
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT
                    ms.venue,
                    COUNT(*)                                        AS games,
                    SUM(CASE WHEN ms.result = 'W' THEN 1 ELSE 0 END)  AS wins,
                    SUM(CASE WHEN ms.result = 'D' THEN 1 ELSE 0 END)  AS draws,
                    SUM(CASE WHEN ms.result = 'L' THEN 1 ELSE 0 END)  AS losses,
                    SUM(ms.goals_for)                               AS goals_for,
                    SUM(ms.goals_against)                           AS goals_against,
                    ROUND(AVG(ms.shots)::numeric, 1)                AS avg_shots,
                    ROUND(AVG(ms.shots_on_target)::numeric, 1)      AS avg_sot,
                    ROUND(AVG(ms.fouls)::numeric, 1)                AS avg_fouls
                FROM match_stats ms
                WHERE ms.team_id = %s
                GROUP BY ms.venue
                ORDER BY ms.venue
            """, (team_id,))
            rows = cur.fetchall()

            cur.execute("SELECT name FROM teams WHERE id = %s", (team_id,))
            team = cur.fetchone()
    except psycopg2.errors.UndefinedTable:
        return {"team": None, "splits": [], "message": NO_MATCH_STATS_MSG}

    return {
        "team": dict(team) if team else None,
        "splits": [dict(r) for r in rows],
    }


@router.get("/head-to-head")
def head_to_head(
    team1: str = Query(..., description="Team name (partial match)"),
    team2: str = Query(..., description="Team name (partial match)"),
    db=Depends(get_db),
):
    """Head-to-head record between two teams with per-match stats."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT m.matchweek, m.match_date,
                   ht.name AS home_team, m.home_score,
                   at.name AS away_team, m.away_score,
                   m.game_id
            FROM matches m
            JOIN teams ht ON ht.id = m.home_team_id
            JOIN teams at ON at.id = m.away_team_id
            WHERE (ht.name ILIKE %s AND at.name ILIKE %s)
               OR (ht.name ILIKE %s AND at.name ILIKE %s)
            ORDER BY m.match_date DESC
        """, (f"%{team1}%", f"%{team2}%", f"%{team2}%", f"%{team1}%"))
        matches = [dict(r) for r in cur.fetchall()]

    # Compute record
    t1_wins = t2_wins = draws = 0
    for m in matches:
        t1_home = team1.lower() in m["home_team"].lower()
        if m["home_score"] is None:
            continue
        if m["home_score"] > m["away_score"]:
            if t1_home: t1_wins += 1
            else: t2_wins += 1
        elif m["away_score"] > m["home_score"]:
            if t1_home: t2_wins += 1
            else: t1_wins += 1
        else:
            draws += 1

    return {
        "teams": [team1, team2],
        "record": {"team1_wins": t1_wins, "draws": draws, "team2_wins": t2_wins},
        "matches": matches,
    }


@router.get("/team/{team_id}/shooting")
def team_shooting_stats(team_id: int, db=Depends(get_db)):
    """Per-match shooting stats for a team across the season."""
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT m.matchweek, m.match_date,
                       opp.name AS opponent,
                       ms.venue, ms.result,
                       ms.shots, ms.shots_on_target,
                       ms.goals_for, ms.goals_against,
                       ms.fouls, ms.yellow_cards
                FROM match_stats ms
                JOIN matches m ON m.id = ms.match_id
                JOIN teams opp ON opp.id = (
                    CASE WHEN m.home_team_id = %s THEN m.away_team_id ELSE m.home_team_id END
                )
                WHERE ms.team_id = %s AND m.match_date IS NOT NULL
                ORDER BY m.match_date
            """, (team_id, team_id))
            rows = [dict(r) for r in cur.fetchall()]

            # Season averages
            cur.execute("""
                SELECT
                    ROUND(AVG(shots)::numeric, 1)           AS avg_shots,
                    ROUND(AVG(shots_on_target)::numeric, 1) AS avg_sot,
                    ROUND(AVG(fouls)::numeric, 1)           AS avg_fouls,
                    SUM(yellow_cards)                       AS total_yellows,
                    SUM(red_cards)                          AS total_reds
                FROM match_stats WHERE team_id = %s
            """, (team_id,))
            avgs = dict(cur.fetchone())

            cur.execute("SELECT name FROM teams WHERE id = %s", (team_id,))
            team = dict(cur.fetchone())
    except psycopg2.errors.UndefinedTable:
        return {
            "team": None,
            "season_averages": {},
            "matches": [],
            "message": NO_MATCH_STATS_MSG,
        }

    return {"team": team, "season_averages": avgs, "matches": rows}


@router.get("/league/shooting-leaders")
def shooting_leaders(db=Depends(get_db)):
    """Teams ranked by average shots per match this season."""
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT
                    t.id, t.name AS team,
                    COUNT(ms.id)                                    AS matches,
                    ROUND(AVG(ms.shots)::numeric, 1)                AS avg_shots,
                    ROUND(AVG(ms.shots_on_target)::numeric, 1)      AS avg_sot,
                    SUM(ms.goals_for)                               AS goals,
                    ROUND(
                        100.0 * SUM(ms.shots_on_target) /
                        NULLIF(SUM(ms.shots), 0)
                    , 1)                                            AS sot_pct,
                    ROUND(
                        1.0 * SUM(ms.goals_for) /
                        NULLIF(SUM(ms.shots_on_target), 0)
                    , 3)                                            AS conversion_rate
                FROM match_stats ms
                JOIN teams t ON t.id = ms.team_id
                GROUP BY t.id, t.name
                ORDER BY avg_shots DESC
            """)
            rows = [dict(r) for r in cur.fetchall()]
        return {"teams": rows}
    except Exception:
        # match_stats table not yet created — return empty
        return {"teams": [], "message": NO_MATCH_STATS_MSG}
