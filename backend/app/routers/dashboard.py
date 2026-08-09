from fastapi import APIRouter, Depends
from app.database import get_db

router = APIRouter()


@router.get("/")
def dashboard_summary(db=Depends(get_db)):
    """
    Single endpoint that powers the dashboard page.
    Returns: top scorers, top assists, league table (top 6), recent results.
    """
    with db.cursor() as cur:

        # Top 5 scorers
        cur.execute("""
            SELECT p.id, p.name, t.name AS team, p.position,
                   pss.goals, pss.assists, pss.goals_per90
            FROM player_season_stats pss
            JOIN players p ON p.id = pss.player_id
            JOIN teams   t ON t.id = p.team_id
            ORDER BY pss.goals DESC LIMIT 5
        """)
        top_scorers = [dict(r) for r in cur.fetchall()]

        # Top 5 assist providers
        cur.execute("""
            SELECT p.id, p.name, t.name AS team, p.position,
                   pss.assists, pss.goals, pss.assists_per90
            FROM player_season_stats pss
            JOIN players p ON p.id = pss.player_id
            JOIN teams   t ON t.id = p.team_id
            ORDER BY pss.assists DESC LIMIT 5
        """)
        top_assists = [dict(r) for r in cur.fetchall()]

        # League table top 6
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
            SELECT t.id, t.name AS team,
                   COUNT(*) AS played,
                   SUM(CASE WHEN pts=3 THEN 1 ELSE 0 END) AS wins,
                   SUM(CASE WHEN pts=1 THEN 1 ELSE 0 END) AS draws,
                   SUM(CASE WHEN pts=0 THEN 1 ELSE 0 END) AS losses,
                   SUM(scored) AS gf, SUM(conceded) AS ga,
                   SUM(scored) - SUM(conceded) AS gd,
                   SUM(pts) AS points
            FROM match_results mr
            JOIN teams t ON t.id = mr.team_id
            GROUP BY t.id, t.name
            ORDER BY points DESC, gd DESC
            LIMIT 6
        """)
        table_top6 = [dict(r) for r in cur.fetchall()]

        # 10 most recent results
        cur.execute("""
            SELECT m.matchweek, m.match_date,
                   ht.name AS home_team, m.home_score,
                   at.name AS away_team, m.away_score
            FROM matches m
            JOIN teams ht ON ht.id = m.home_team_id
            JOIN teams at ON at.id = m.away_team_id
            WHERE m.home_score IS NOT NULL
            ORDER BY m.match_date DESC
            LIMIT 10
        """)
        recent_results = [dict(r) for r in cur.fetchall()]

        # Season summary stats
        cur.execute("""
            SELECT
                COUNT(*) AS total_matches,
                SUM(home_score + away_score) AS total_goals,
                ROUND(AVG(home_score + away_score)::numeric, 2) AS avg_goals_per_match,
                MAX(home_score + away_score) AS highest_scoring_match
            FROM matches
            WHERE home_score IS NOT NULL
        """)
        summary = dict(cur.fetchone())

    return {
        "season": "2024-25",
        "competition": "Premier League",
        "summary": summary,
        "top_scorers": top_scorers,
        "top_assists": top_assists,
        "table_top6": table_top6,
        "recent_results": recent_results,
    }
