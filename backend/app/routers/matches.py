from fastapi import APIRouter, Depends, Query
from app.database import get_db

router = APIRouter()


@router.get("/")
def list_matches(
    matchweek: int = Query(None),
    team: str = Query(None),
    limit: int = Query(10, le=38),
    offset: int = 0,
    db=Depends(get_db),
):
    """List matches with optional week/team filters."""
    conditions = []
    params = []

    if matchweek:
        conditions.append("m.matchweek = %s")
        params.append(matchweek)
    if team:
        conditions.append("(ht.name ILIKE %s OR at.name ILIKE %s)")
        params.extend([f"%{team}%", f"%{team}%"])

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    with db.cursor() as cur:
        cur.execute(f"""
            SELECT m.id, m.matchweek, m.match_date,
                   ht.name AS home_team, m.home_score,
                   at.name AS away_team, m.away_score,
                   m.venue, m.attendance, m.referee, m.game_id
            FROM matches m
            JOIN teams ht ON ht.id = m.home_team_id
            JOIN teams at ON at.id = m.away_team_id
            {where}
            ORDER BY m.match_date DESC, m.matchweek DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()
    return {"matches": [dict(r) for r in rows]}


@router.get("/recent")
def recent_matches(limit: int = 10, db=Depends(get_db)):
    """Most recently played matches."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT m.id, m.matchweek, m.match_date,
                   ht.name AS home_team, m.home_score,
                   at.name AS away_team, m.away_score,
                   m.venue, m.game_id
            FROM matches m
            JOIN teams ht ON ht.id = m.home_team_id
            JOIN teams at ON at.id = m.away_team_id
            WHERE m.home_score IS NOT NULL
            ORDER BY m.match_date DESC
            LIMIT %s
        """, (min(limit, 380),))
        rows = cur.fetchall()
    return {"matches": [dict(r) for r in rows]}
