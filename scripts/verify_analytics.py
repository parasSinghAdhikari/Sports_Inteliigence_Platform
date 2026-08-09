"""Verify all analytics SQL queries against the live Neon database."""
import psycopg2, os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

# ── Top 10 Scorers ────────────────────────────────────────────────────────────
print("=" * 55)
print("TOP 10 SCORERS")
print("=" * 55)
cur.execute("""
    SELECT p.name, t.name, pss.goals, pss.assists, pss.goals_per90
    FROM player_season_stats pss
    JOIN players p ON p.id = pss.player_id
    JOIN teams   t ON t.id = p.team_id
    ORDER BY pss.goals DESC LIMIT 10
""")
for i, r in enumerate(cur.fetchall(), 1):
    print(f"  {i:2d}. {r[0]:<25} ({r[1]:<18}) {r[2]:2d}G {r[3]:2d}A  {r[4]:.2f}/90")

# ── Top 10 Assist Providers ───────────────────────────────────────────────────
print()
print("=" * 55)
print("TOP 10 ASSIST PROVIDERS")
print("=" * 55)
cur.execute("""
    SELECT p.name, t.name, pss.assists, pss.goals, pss.assists_per90
    FROM player_season_stats pss
    JOIN players p ON p.id = pss.player_id
    JOIN teams   t ON t.id = p.team_id
    ORDER BY pss.assists DESC LIMIT 10
""")
for i, r in enumerate(cur.fetchall(), 1):
    print(f"  {i:2d}. {r[0]:<25} ({r[1]:<18}) {r[2]:2d}A {r[3]:2d}G  {r[4]:.2f}/90")

# ── League Table ──────────────────────────────────────────────────────────────
print()
print("=" * 55)
print("PREMIER LEAGUE TABLE 2024-25")
print("=" * 55)
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
    SELECT t.name,
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
""")
header = f"  {'#':>3}  {'Team':<20} {'P':>2}  {'W':>2} {'D':>2} {'L':>2}  {'GF':>3} {'GA':>3} {'GD':>4}  {'Pts':>3}"
print(header)
print("  " + "-" * 53)
for i, r in enumerate(cur.fetchall(), 1):
    gd_str = f"{r[7]:+d}"
    print(f"  {i:>3}. {r[0]:<20} {r[1]:>2}  {r[2]:>2} {r[3]:>2} {r[4]:>2}  {r[5]:>3} {r[6]:>3} {gd_str:>4}  {r[8]:>3}")

# ── Player Comparison ─────────────────────────────────────────────────────────
print()
print("=" * 55)
print("PLAYER COMPARISON: Salah vs Haaland")
print("=" * 55)
cur.execute("""
    SELECT p.name, t.name, pss.goals, pss.assists, pss.minutes,
           pss.goals_per90, pss.assists_per90, pss.goal_contributions_per90
    FROM player_season_stats pss
    JOIN players p ON p.id = pss.player_id
    JOIN teams   t ON t.id = p.team_id
    WHERE p.name IN ('Mohamed Salah', 'Erling Haaland')
    ORDER BY pss.goals DESC
""")
for r in cur.fetchall():
    print(f"  {r[0]:<22} | {r[1]:<18} | {r[2]}G {r[3]}A | {r[4]}min | {r[5]:.2f}G/90 | {r[7]:.2f} G+A/90")

conn.close()
print()
print("M4 COMPLETE - all SQL analytics verified on live Neon DB")
