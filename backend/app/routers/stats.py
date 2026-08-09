from fastapi import APIRouter, Depends, Query
from app.database import get_db

router = APIRouter()


@router.get("/top-scorers")
def top_scorers(limit: int = Query(10, le=50), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("""
            SELECT p.id, p.name, t.name AS team, p.position, p.age,
                   pss.goals, pss.assists, pss.minutes, pss.goals_per90
            FROM player_season_stats pss
            JOIN players p ON p.id = pss.player_id
            JOIN teams   t ON t.id = p.team_id
            ORDER BY pss.goals DESC, pss.goals_per90 DESC
            LIMIT %s
        """, (limit,))
        rows = cur.fetchall()
    return {"top_scorers": [dict(r) for r in rows]}


@router.get("/top-assists")
def top_assists(limit: int = Query(10, le=50), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("""
            SELECT p.id, p.name, t.name AS team, p.position, p.age,
                   pss.assists, pss.goals, pss.minutes, pss.assists_per90
            FROM player_season_stats pss
            JOIN players p ON p.id = pss.player_id
            JOIN teams   t ON t.id = p.team_id
            ORDER BY pss.assists DESC, pss.assists_per90 DESC
            LIMIT %s
        """, (limit,))
        rows = cur.fetchall()
    return {"top_assists": [dict(r) for r in rows]}


@router.get("/top-contributors")
def top_contributors(limit: int = Query(10, le=50), db=Depends(get_db)):
    """Top goal contributors (G+A per 90)."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT p.id, p.name, t.name AS team, p.position,
                   pss.goals, pss.assists, pss.goals_plus_assists,
                   pss.goal_contributions_per90, pss.minutes
            FROM player_season_stats pss
            JOIN players p ON p.id = pss.player_id
            JOIN teams   t ON t.id = p.team_id
            WHERE pss.minutes >= 900
            ORDER BY pss.goal_contributions_per90 DESC
            LIMIT %s
        """, (limit,))
        rows = cur.fetchall()
    return {"top_contributors": [dict(r) for r in rows]}
