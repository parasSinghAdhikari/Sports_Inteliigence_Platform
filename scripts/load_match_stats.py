"""
M10 — Load match stats into PostgreSQL.

Reads data/processed/match_stats.parquet (produced by extract_match_stats.py)
and populates the match_stats table.

Join strategy:
  FBref match-stats rows do not carry a game_id; they carry `team`, `date` and
  `venue`. In the PL each team plays exactly one match per match-day, so the
  composite key (match_date, team_name) uniquely identifies the match.

Run AFTER extract_match_stats.py.
"""
import sys
import logging
from pathlib import Path

import pandas as pd
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
import os

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

ROOT     = Path(__file__).resolve().parent.parent
PROC_DIR = ROOT / "data" / "processed"

load_dotenv(ROOT / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    log.error("DATABASE_URL not set in .env")
    sys.exit(1)

DDL_MATCH_STATS = """
CREATE TABLE IF NOT EXISTS match_stats (
    id              SERIAL PRIMARY KEY,
    match_id        INTEGER REFERENCES matches(id),
    team_id         INTEGER REFERENCES teams(id),
    venue           VARCHAR(10),        -- 'Home' or 'Away'
    result          VARCHAR(5),         -- 'W', 'D', 'L'
    goals_for       INTEGER,
    goals_against   INTEGER,
    shots           INTEGER,
    shots_on_target INTEGER,
    fouls           INTEGER,
    yellow_cards    INTEGER,
    red_cards       INTEGER,
    pen_attempts    INTEGER,
    UNIQUE(match_id, team_id)
);

CREATE INDEX IF NOT EXISTS ix_ms_match  ON match_stats(match_id);
CREATE INDEX IF NOT EXISTS ix_ms_team   ON match_stats(team_id);
"""


def clean_int(v):
    """Coerce a value to int or None."""
    if v is None:
        return None
    if isinstance(v, float) and pd.isna(v):
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def norm_name(v):
    """Normalise a team name string for map lookup."""
    if v is None:
        return None
    s = str(v).strip()
    return s if s and s.lower() != "nan" else None


def norm_date(v):
    """Return 'YYYY-MM-DD' or None."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    return str(v)[:10]


def main():
    log.info("=" * 60)
    log.info("M10 — Loading match stats into Neon")
    log.info("=" * 60)

    stats_path = PROC_DIR / "match_stats.parquet"
    if not stats_path.exists():
        log.error("match_stats.parquet not found. Run extract_match_stats.py first.")
        sys.exit(1)

    df = pd.read_parquet(stats_path)
    log.info("  Loaded parquet: %d rows, cols: %s", len(df), df.columns.tolist())

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Create table
    log.info("Creating match_stats table...")
    cur.execute(DDL_MATCH_STATS)
    log.info("  Table ready.")

    # team name -> team_id
    cur.execute("SELECT id, name FROM teams")
    team_map = {row[1]: row[0] for row in cur.fetchall()}
    log.info("  team_map: %d teams", len(team_map))

    # (match_date_iso, team_name) -> match_id
    cur.execute("""
    SELECT m.id, to_char(m.match_date, 'YYYY-MM-DD') AS mdate,
           ht.name AS home, ht.id AS home_id,
           at.name AS away, at.id AS away_id
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    WHERE m.match_date IS NOT NULL
    """)
    home_lookup = {}   # (date, away_name) -> (match_id, home_team_id)  — use when THIS row's venue == Home
    away_lookup = {}   # (date, home_name) -> (match_id, away_team_id)  — use when THIS row's venue == Away
    for mid, mdate, home, home_id, away, away_id in cur.fetchall():
        if not mdate:
            continue
        home_lookup[(mdate, away)] = (mid, home_id)
        away_lookup[(mdate, home)] = (mid, away_id)

    # Build records
    records = []
    skipped_no_match = 0
    skipped_no_team = 0
    bad_date = 0

    for _, row in df.iterrows():
        opponent = norm_name(row.get("opponent"))
        venue    = norm_name(row.get("venue"))
        date_iso = norm_date(row.get("date"))
        if not opponent or not venue or not date_iso:
            skipped_no_team += 1
            continue

        hit = (home_lookup if venue.lower() == "home" else away_lookup).get((date_iso, opponent))
        if not hit:
            skipped_no_match += 1
            continue
        match_id, team_id = hit

        records.append((
        match_id, team_id, venue[:10], norm_name(row.get("result"))[:5],
            clean_int(row.get("goals_for")), clean_int(row.get("goals_against")),
            clean_int(row.get("shots")), clean_int(row.get("shots_on_target")),
            clean_int(row.get("fouls")), clean_int(row.get("yellow_cards")),
            clean_int(row.get("red_cards")), clean_int(row.get("pen_attempts")),
            ))

    log.info("  Built %d records (no_team=%d, bad_date=%d, no_match=%d)",
             len(records), skipped_no_team, bad_date, skipped_no_match)

    if records:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO match_stats (
                match_id, team_id, venue, result,
                goals_for, goals_against, shots, shots_on_target,
                fouls, yellow_cards, red_cards, pen_attempts
            ) VALUES %s
            ON CONFLICT (match_id, team_id) DO UPDATE SET
                shots           = EXCLUDED.shots,
                shots_on_target = EXCLUDED.shots_on_target,
                fouls           = EXCLUDED.fouls
            """,
            records,
            page_size=200,
        )

    # Verify
    cur.execute("SELECT COUNT(*) FROM match_stats")
    count = cur.fetchone()[0]
    log.info("  match_stats rows in DB: %d", count)

    if count > 0:
        cur.execute("""
            SELECT t.name, AVG(ms.shots) as avg_shots, AVG(ms.shots_on_target) as avg_sot
            FROM match_stats ms
            JOIN teams t ON t.id = ms.team_id
            GROUP BY t.name
            ORDER BY avg_shots DESC
            LIMIT 5
        """)
        log.info("\n  Top 5 by avg shots per match:")
        for r in cur.fetchall():
            log.info("    %-22s  %.1f shots  %.1f SoT", r[0], r[1] or 0, r[2] or 0)

    conn.close()
    log.info("\nDONE.")


if __name__ == "__main__":
    main()