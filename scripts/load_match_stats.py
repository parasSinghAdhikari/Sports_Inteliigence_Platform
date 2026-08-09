"""
M10 — Load match stats into PostgreSQL.

Reads data/processed/match_stats.parquet and populates the match_stats table.
Links each row to the existing matches table via game_id.

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

ROOT        = Path(__file__).resolve().parent.parent
PROC_DIR    = ROOT / "data" / "processed"

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

def clean(v):
    if v is None:
        return None
    if isinstance(v, float) and pd.isna(v):
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


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
    cur  = conn.cursor()

    # Create table
    log.info("Creating match_stats table...")
    cur.execute(DDL_MATCH_STATS)
    conn.commit()
    log.info("  Table ready.")

    # Build lookup maps
    cur.execute("SELECT id, game_id FROM matches WHERE game_id IS NOT NULL")
    match_map = {row[1]: row[0] for row in cur.fetchall()}

    cur.execute("SELECT id, name FROM teams")
    team_map = {row[1]: row[0] for row in cur.fetchall()}

    log.info("  match_map: %d entries, team_map: %d entries", len(match_map), len(team_map))

    # Build records
    records = []
    skipped = 0

    for _, row in df.iterrows():
        # game key is the index 'game' or a column
        game_key = str(row.get("game", "")).split(" ")[-1] if "game" in df.columns else None

        # Try to match by game_id (8-char hex in schedule)
        match_id = None
        if game_key:
            for gid, mid in match_map.items():
                if gid and game_key and gid in game_key:
                    match_id = mid
                    break

        team_name = row.get("team")
        team_id   = team_map.get(team_name) if team_name else None

        if not match_id or not team_id:
            skipped += 1
            continue

        records.append((
            match_id, team_id,
            str(row.get("venue", ""))[:10] if row.get("venue") else None,
            str(row.get("result", ""))[:5] if row.get("result") else None,
            clean(row.get("goals_for")),
            clean(row.get("goals_against")),
            clean(row.get("shots")),
            clean(row.get("shots_on_target")),
            clean(row.get("fouls")),
            clean(row.get("yellow_cards")),
            clean(row.get("red_cards")),
            clean(row.get("pen_attempts")),
        ))

    log.info("  Built %d records (skipped %d)", len(records), skipped)

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
        conn.commit()

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
