from fastapi import APIRouter, Depends, Query
from app.database import get_db

router = APIRouter()


@router.get("/")
def list_teams(db=Depends(get_db)):
    """List all 20 PL teams with season summary."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT t.id, t.name,
                   tss.players_used, tss.avg_age, tss.avg_possession,
                   tss.goals, tss.assists, tss.yellow_cards, tss.red_cards,
                   tss.goals_per90
            FROM teams t
            LEFT JOIN team_season_stats tss ON tss.team_id = t.id
            ORDER BY tss.goals DESC NULLS LAST
        """)
        rows = cur.fetchall()
    return {"teams": [dict(r) for r in rows]}


@router.get("/table")
def league_table(db=Depends(get_db)):
    """Full Premier League 2024-25 table."""
    with db.cursor() as cur:
        cur.execute("""
            WITH match_results AS (
                SELECT home_team_id AS team_id, home_score AS scored, away_score AS conceded,
                       CASE WHEN home_score > away_score THEN 3
                            WHEN home_score = away_score THEN 1 ELSE 0 END AS pts
                FROM matches WHERE home_score IS NOT NULL
                UNION ALL
                SELECT away_team_id, away_score, home_score,
                       CASE WHEN away_score > home_score THEN 3
                            WHEN away_score = home_score THEN 1 ELSE 0 END
                FROM matches WHERE away_score IS NOT NULL
            )
            SELECT
                t.id, t.name AS team,
                COUNT(*) AS played,
                SUM(CASE WHEN pts=3 THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN pts=1 THEN 1 ELSE 0 END) AS draws,
                SUM(CASE WHEN pts=0 THEN 1 ELSE 0 END) AS losses,
                SUM(scored)   AS goals_for,
                SUM(conceded) AS goals_against,
                SUM(scored) - SUM(conceded) AS goal_diff,
                SUM(pts) AS points
            FROM match_results mr
            JOIN teams t ON t.id = mr.team_id
            GROUP BY t.id, t.name
            ORDER BY points DESC, goal_diff DESC
        """)
        rows = cur.fetchall()
    return {"table": [dict(r) for r in rows]}


@router.get("/{team_id}")
def get_team(team_id: int, db=Depends(get_db)):
    """Full team profile: stats + last 5 results."""
    with db.cursor() as cur:
        # Team info + season stats
        cur.execute("""
            SELECT t.id, t.name,
                   tss.players_used, tss.avg_age, tss.avg_possession,
                   tss.goals, tss.assists, tss.goals_per90,
                   tss.yellow_cards, tss.red_cards
            FROM teams t
            LEFT JOIN team_season_stats tss ON tss.team_id = t.id
            WHERE t.id = %s
        """, (team_id,))
        team = cur.fetchone()

        if not team:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Team not found")

        # Last 5 results
        cur.execute("""
            SELECT
                m.match_date, m.matchweek,
                ht.name AS home_team, m.home_score,
                at.name AS away_team, m.away_score,
                m.venue
            FROM matches m
            JOIN teams ht ON ht.id = m.home_team_id
            JOIN teams at ON at.id = m.away_team_id
            WHERE (m.home_team_id = %s OR m.away_team_id = %s)
              AND m.home_score IS NOT NULL
            ORDER BY m.match_date DESC
            LIMIT 5
        """, (team_id, team_id))
        recent = cur.fetchall()

        # Squad
        cur.execute("""
            SELECT p.name, p.position, p.age, p.nationality,
                   pss.goals, pss.assists, pss.minutes
            FROM players p
            LEFT JOIN player_season_stats pss ON pss.player_id = p.id
            WHERE p.team_id = %s
            ORDER BY pss.minutes DESC NULLS LAST
        """, (team_id,))
        squad = cur.fetchall()

    return {
        "team": dict(team),
        "recent_results": [dict(r) for r in recent],
        "squad": [dict(p) for p in squad],
    }


@router.get("/{team_id}/form")
def team_form(team_id: int, last_n: int = 5, db=Depends(get_db)):
    """Last N results as W/D/L form string."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT
                m.match_date,
                ht.name AS home_team, m.home_score,
                at.name AS away_team, m.away_score,
                CASE
                    WHEN m.home_team_id = %s AND m.home_score > m.away_score THEN 'W'
                    WHEN m.away_team_id = %s AND m.away_score > m.home_score THEN 'W'
                    WHEN m.home_score = m.away_score THEN 'D'
                    ELSE 'L'
                END AS result
            FROM matches m
            JOIN teams ht ON ht.id = m.home_team_id
            JOIN teams at ON at.id = m.away_team_id
            WHERE (m.home_team_id = %s OR m.away_team_id = %s)
              AND m.home_score IS NOT NULL
            ORDER BY m.match_date DESC
            LIMIT %s
        """, (team_id, team_id, team_id, team_id, last_n))
        rows = cur.fetchall()

    form_string = "".join(r["result"] for r in rows)
    return {"form": form_string, "matches": [dict(r) for r in rows]}
