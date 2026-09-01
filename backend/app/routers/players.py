from fastapi import APIRouter, Depends, Query
from app.database import get_db

router = APIRouter()


@router.get("/")
def list_players(
    limit: int = Query(20, le=600),
    offset: int = 0,
    search: str = Query(None),
    team: str = Query(None),
    position: str = Query(None),
    db=Depends(get_db),
):
    """List players with optional filters."""
    conditions = []
    params = []

    if search:
        conditions.append("p.name ILIKE %s")
        params.append(f"%{search}%")
    if team:
        conditions.append("t.name ILIKE %s")
        params.append(f"%{team}%")
    if position:
        conditions.append("p.position = %s")
        params.append(position.upper())

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    with db.cursor() as cur:
        cur.execute(f"""
            SELECT p.id, p.name, t.name AS team, p.position, p.age, p.nationality,
                   pss.goals, pss.assists, pss.minutes, pss.goals_per90,
                   pss.assists_per90, pss.goal_contributions_per90,
                   pss.goals_plus_assists
            FROM players p
            JOIN teams t ON t.id = p.team_id
            LEFT JOIN player_season_stats pss ON pss.player_id = p.id
            {where}
            ORDER BY pss.goals DESC NULLS LAST
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()

        cur.execute(f"""
            SELECT COUNT(*) FROM players p
            JOIN teams t ON t.id = p.team_id
            {where}
        """, params)
        total = cur.fetchone()["count"]

    return {"total": total, "players": [dict(r) for r in rows]}


@router.get("/{player_id}")
def get_player(player_id: int, db=Depends(get_db)):
    """Get a single player's full profile."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT p.id, p.name, t.name AS team, p.position, p.position_raw,
                   p.age, p.birth_year, p.nationality,
                   pss.matches_played, pss.starts, pss.minutes, pss.nineties,
                   pss.goals, pss.assists, pss.goals_plus_assists,
                   pss.non_pen_goals, pss.pen_goals, pss.pen_attempts,
                   pss.yellow_cards, pss.red_cards,
                   pss.goals_per90, pss.assists_per90,
                   pss.goal_contributions_per90, pss.non_pen_goals_per90
            FROM players p
            JOIN teams t ON t.id = p.team_id
            LEFT JOIN player_season_stats pss ON pss.player_id = p.id
            WHERE p.id = %s
        """, (player_id,))
        row = cur.fetchone()

    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Player not found")
    return dict(row)


@router.get("/compare/two")
def compare_players(
    player1: str = Query(...),
    player2: str = Query(...),
    db=Depends(get_db),
):
    """Compare two players by name."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT p.id, p.name, t.name AS team, p.position, p.age,
                   pss.goals, pss.assists, pss.minutes,
                   pss.goals_per90, pss.assists_per90,
                   pss.goal_contributions_per90, pss.non_pen_goals_per90,
                   pss.yellow_cards, pss.red_cards
            FROM players p
            JOIN teams t ON t.id = p.team_id
            LEFT JOIN player_season_stats pss ON pss.player_id = p.id
            WHERE p.name ILIKE %s OR p.name ILIKE %s
            ORDER BY pss.goals DESC NULLS LAST
        """, (f"%{player1}%", f"%{player2}%"))
        rows = cur.fetchall()
    return {"players": [dict(r) for r in rows[:2]]}
