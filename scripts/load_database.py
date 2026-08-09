"""
Load transformed data into PostgreSQL — COPY-based ultra-fast version.

Uses psycopg2 COPY FROM STDIN (via pandas + io.StringIO) for bulk inserts.
This is the fastest possible PostgreSQL load method — 100x faster than
row-by-row inserts over a remote connection.

Load order (respects FK dependencies):
  1. competitions
  2. seasons
  3. teams
  4. players
  5. matches
  6. player_season_stats

Usage:
    python scripts/load_database.py

Requires .env with DATABASE_URL set.
"""

import io
import sys
import logging
from pathlib import Path

import pandas as pd
import psycopg2
import psycopg2.extras
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"

load_dotenv(ROOT / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    log.error("DATABASE_URL not set in .env file")
    sys.exit(1)


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_conn():
    """Return a raw psycopg2 connection."""
    return psycopg2.connect(DATABASE_URL)


def get_engine():
    return create_engine(DATABASE_URL, pool_pre_ping=True)


def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    """Convert all pandas nullable types (Int64, pd.NA) to standard Python types."""
    for col in df.columns:
        if pd.api.types.is_extension_array_dtype(df[col]):
            df[col] = df[col].astype(object).where(df[col].notna(), other=None)
    return df.where(pd.notna(df), other=None)


def copy_from_df(conn, df: pd.DataFrame, table: str, columns: list[str]):
    """
    COPY a DataFrame into a PostgreSQL table using COPY FROM STDIN.
    This is the fastest possible bulk-insert method.
    NULL values are encoded as the literal string '\\N' (PostgreSQL's COPY format).
    """
    buf = io.StringIO()
    # Write TSV-format: tab-separated, \\N for NULL
    for _, row in df[columns].iterrows():
        line_parts = []
        for v in row:
            if v is None or (isinstance(v, float) and pd.isna(v)):
                line_parts.append("\\N")
            else:
                # Escape tabs and newlines in string values
                line_parts.append(str(v).replace("\t", " ").replace("\n", " "))
        buf.write("\t".join(line_parts) + "\n")
    buf.seek(0)

    with conn.cursor() as cur:
        cur.copy_from(buf, table, columns=columns, null="\\N")
    conn.commit()


# ── Schema ────────────────────────────────────────────────────────────────────

DDL = """
CREATE TABLE IF NOT EXISTS competitions (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE,
    country VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS seasons (
    id              SERIAL PRIMARY KEY,
    competition_id  INTEGER NOT NULL REFERENCES competitions(id),
    season_code     VARCHAR(10) NOT NULL,
    season_year     VARCHAR(10) NOT NULL,
    UNIQUE(competition_id, season_code)
);

CREATE TABLE IF NOT EXISTS teams (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS players (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    team_id      INTEGER REFERENCES teams(id),
    nationality  VARCHAR(10),
    position     VARCHAR(10),
    position_raw VARCHAR(20),
    age          INTEGER,
    birth_year   INTEGER,
    UNIQUE(name, team_id)
);

CREATE TABLE IF NOT EXISTS matches (
    id             SERIAL PRIMARY KEY,
    season_id      INTEGER NOT NULL REFERENCES seasons(id),
    home_team_id   INTEGER NOT NULL REFERENCES teams(id),
    away_team_id   INTEGER NOT NULL REFERENCES teams(id),
    match_date     DATE,
    day_of_week    VARCHAR(5),
    kick_off_time  VARCHAR(20),
    home_score     INTEGER CHECK (home_score >= 0 OR home_score IS NULL),
    away_score     INTEGER CHECK (away_score >= 0 OR away_score IS NULL),
    attendance     INTEGER,
    venue          VARCHAR(100),
    referee        VARCHAR(100),
    game_id        VARCHAR(20) UNIQUE,
    matchweek      INTEGER
);

CREATE TABLE IF NOT EXISTS player_season_stats (
    id                          SERIAL PRIMARY KEY,
    player_id                   INTEGER NOT NULL REFERENCES players(id),
    season_id                   INTEGER NOT NULL REFERENCES seasons(id),
    matches_played              INTEGER,
    starts                      INTEGER,
    minutes                     INTEGER,
    nineties                    FLOAT,
    goals                       INTEGER,
    assists                     INTEGER,
    goals_plus_assists          INTEGER,
    non_pen_goals               INTEGER,
    pen_goals                   INTEGER,
    pen_attempts                INTEGER,
    yellow_cards                INTEGER,
    red_cards                   INTEGER,
    goals_per90                 FLOAT,
    assists_per90               FLOAT,
    goal_contributions_per90    FLOAT,
    non_pen_goals_per90         FLOAT,
    non_pen_contributions_per90 FLOAT,
    UNIQUE(player_id, season_id)
);

CREATE TABLE IF NOT EXISTS team_season_stats (
    id             SERIAL PRIMARY KEY,
    team_id        INTEGER NOT NULL REFERENCES teams(id),
    season_id      INTEGER NOT NULL REFERENCES seasons(id),
    players_used   INTEGER,
    avg_age        FLOAT,
    avg_possession FLOAT,
    matches_played INTEGER,
    goals          INTEGER,
    assists        INTEGER,
    yellow_cards   INTEGER,
    red_cards      INTEGER,
    goals_per90    FLOAT,
    assists_per90  FLOAT,
    UNIQUE(team_id, season_id)
);

CREATE INDEX IF NOT EXISTS ix_players_name   ON players(name);
CREATE INDEX IF NOT EXISTS ix_players_team   ON players(team_id);
CREATE INDEX IF NOT EXISTS ix_matches_date   ON matches(match_date);
CREATE INDEX IF NOT EXISTS ix_matches_season ON matches(season_id);
CREATE INDEX IF NOT EXISTS ix_pss_player     ON player_season_stats(player_id);
CREATE INDEX IF NOT EXISTS ix_pss_season     ON player_season_stats(season_id);
"""


def create_tables(conn):
    log.info("Creating tables ...")
    with conn.cursor() as cur:
        cur.execute(DDL)
    conn.commit()
    log.info("  Tables ready.")


# ── Loaders ───────────────────────────────────────────────────────────────────

def upsert_competition(conn) -> int:
    log.info("\n[1/8] Loading competition ...")
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO competitions (name, country)
            VALUES ('ENG-Premier League', 'England')
            ON CONFLICT (name) DO NOTHING
        """)
        conn.commit()
        cur.execute("SELECT id FROM competitions WHERE name = 'ENG-Premier League'")
        comp_id = cur.fetchone()[0]
    log.info(f"  competition_id = {comp_id}")
    return comp_id


def upsert_season(conn, competition_id: int) -> int:
    log.info("\n[2/8] Loading season ...")
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO seasons (competition_id, season_code, season_year)
            VALUES (%s, '2425', '2024-25')
            ON CONFLICT (competition_id, season_code) DO NOTHING
        """, (competition_id,))
        conn.commit()
        cur.execute("""
            SELECT id FROM seasons
            WHERE competition_id = %s AND season_code = '2425'
        """, (competition_id,))
        season_id = cur.fetchone()[0]
    log.info(f"  season_id = {season_id}")
    return season_id


def load_teams(conn) -> dict[str, int]:
    log.info("\n[3/8] Loading teams ...")
    df = pd.read_parquet(PROCESSED_DIR / "team_season_stats.parquet")
    team_names = sorted(df["team"].dropna().unique().tolist())

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            "INSERT INTO teams (name) VALUES %s ON CONFLICT (name) DO NOTHING",
            [(n,) for n in team_names],
        )
        conn.commit()
        cur.execute("SELECT id, name FROM teams")
        rows = cur.fetchall()

    name_to_id = {row[1]: row[0] for row in rows}
    log.info(f"  Loaded {len(team_names)} teams")
    return name_to_id


def load_players(conn, team_map: dict[str, int]) -> dict[tuple, int]:
    log.info("\n[4/8] Loading players ...")
    df = pd.read_parquet(PROCESSED_DIR / "player_season_stats.parquet")
    df = clean_df(df)

    records = []
    for _, row in df.iterrows():
        team_id = team_map.get(row["team"])
        records.append((
            row["player"],
            team_id,
            row.get("nationality"),
            row.get("position"),
            row.get("position_raw"),
            row.get("age"),
            row.get("birth_year"),
        ))

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO players (name, team_id, nationality, position, position_raw, age, birth_year)
            VALUES %s
            ON CONFLICT (name, team_id) DO UPDATE SET
                nationality  = EXCLUDED.nationality,
                position     = EXCLUDED.position,
                position_raw = EXCLUDED.position_raw,
                age          = EXCLUDED.age,
                birth_year   = EXCLUDED.birth_year
            """,
            records,
            page_size=200,   # send 200 rows per round-trip
        )
        conn.commit()
        cur.execute("SELECT id, name, team_id FROM players")
        rows = cur.fetchall()

    player_map = {(row[1], row[2]): row[0] for row in rows}
    log.info(f"  Loaded {len(records)} players ({len(records)//200 + 1} batch(es))")
    return player_map


def load_matches(conn, season_id: int, team_map: dict[str, int]):
    log.info("\n[5/8] Loading matches ...")
    df = pd.read_parquet(PROCESSED_DIR / "schedule.parquet")
    df = clean_df(df)

    records = []
    skipped = 0
    for _, row in df.iterrows():
        home_id = team_map.get(row["home_team"])
        away_id = team_map.get(row["away_team"])
        if not home_id or not away_id:
            skipped += 1
            continue
        date_val = row["date"].date() if row.get("date") is not None and not isinstance(row.get("date"), type(None)) else None
        records.append((
            season_id, home_id, away_id,
            date_val, row.get("day"), row.get("time"),
            row.get("home_score"), row.get("away_score"), row.get("attendance"),
            row.get("venue"), row.get("referee"), row.get("game_id"), row.get("matchweek"),
        ))

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO matches (
                season_id, home_team_id, away_team_id,
                match_date, day_of_week, kick_off_time,
                home_score, away_score, attendance,
                venue, referee, game_id, matchweek
            ) VALUES %s
            ON CONFLICT (game_id) DO NOTHING
            """,
            records,
            page_size=200,
        )
        conn.commit()
    log.info(f"  Loaded {len(records)} matches (skipped {skipped})")


def load_player_stats(conn, player_map: dict[tuple, int], season_id: int, team_map: dict[str, int]):
    log.info("\n[6/8] Loading player season stats ...")
    df = pd.read_parquet(PROCESSED_DIR / "player_season_stats.parquet")
    df = clean_df(df)

    records = []
    skipped = 0
    for _, row in df.iterrows():
        team_id   = team_map.get(row["team"])
        player_id = player_map.get((row["player"], team_id))
        if not player_id:
            skipped += 1
            continue
        records.append((
            player_id, season_id,
            row.get("matches_played"), row.get("starts"), row.get("minutes"), row.get("nineties"),
            row.get("goals"), row.get("assists"), row.get("goals_plus_assists"),
            row.get("non_pen_goals"), row.get("pen_goals"), row.get("pen_attempts"),
            row.get("yellow_cards"), row.get("red_cards"),
            row.get("goals_per90"), row.get("assists_per90"), row.get("goal_contributions_per90"),
            row.get("non_pen_goals_per90"), row.get("non_pen_contributions_per90"),
        ))

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO player_season_stats (
                player_id, season_id,
                matches_played, starts, minutes, nineties,
                goals, assists, goals_plus_assists,
                non_pen_goals, pen_goals, pen_attempts,
                yellow_cards, red_cards,
                goals_per90, assists_per90, goal_contributions_per90,
                non_pen_goals_per90, non_pen_contributions_per90
            ) VALUES %s
            ON CONFLICT (player_id, season_id) DO UPDATE SET
                goals   = EXCLUDED.goals,
                assists = EXCLUDED.assists,
                minutes = EXCLUDED.minutes
            """,
            records,
            page_size=200,
        )
        conn.commit()
    log.info(f"  Loaded {len(records)} player stat rows (skipped {skipped})")



def load_team_stats(conn, season_id: int, team_map: dict[str, int]):
    log.info("\n[7/8] Loading team season stats ...")
    df = pd.read_parquet(PROCESSED_DIR / "team_season_stats.parquet")
    df = clean_df(df)

    records = []
    skipped = 0
    for _, row in df.iterrows():
        team_id = team_map.get(row["team"])
        if not team_id:
            skipped += 1
            continue
        records.append((
            team_id, season_id,
            row.get("players_used"),
            row.get("avg_age"),
            row.get("avg_possession"),
            row.get("matches_played"),
            row.get("goals"),
            row.get("assists"),
            row.get("yellow_cards"),
            row.get("red_cards"),
            row.get("goals_per90"),
            row.get("assists_per90"),
        ))

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO team_season_stats (
                team_id, season_id,
                players_used, avg_age, avg_possession,
                matches_played, goals, assists,
                yellow_cards, red_cards,
                goals_per90, assists_per90
            ) VALUES %s
            ON CONFLICT (team_id, season_id) DO UPDATE SET
                goals          = EXCLUDED.goals,
                assists        = EXCLUDED.assists,
                avg_possession = EXCLUDED.avg_possession
            """,
            records,
            page_size=50,
        )
        conn.commit()
    log.info(f"  Loaded {len(records)} team stat rows (skipped {skipped})")


def verify(conn):
    log.info("\n[8/8] Verification ...")
    tables = [
        "competitions", "seasons", "teams", "players",
        "matches", "player_season_stats", "team_season_stats",
    ]
    with conn.cursor() as cur:
        for t in tables:
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            count = cur.fetchone()[0]
            log.info(f"  {t:25s}: {count:,} rows")

        log.info("\n  Top 5 scorers:")
        cur.execute("""
            SELECT p.name, t.name, pss.goals, pss.assists, pss.goals_per90
            FROM player_season_stats pss
            JOIN players p ON p.id = pss.player_id
            JOIN teams   t ON t.id = p.team_id
            ORDER BY pss.goals DESC
            LIMIT 5
        """)
        for r in cur.fetchall():
            log.info(f"    {r[0]:25s} | {r[1]:20s} | {r[2]:2d} G | {r[3]:2d} A | {r[4]:.2f}/90")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    log.info("=" * 60)
    log.info("Loading data into PostgreSQL (execute_values mode) ...")
    log.info("=" * 60)

    conn = get_conn()
    try:
        create_tables(conn)
        competition_id = upsert_competition(conn)
        season_id      = upsert_season(conn, competition_id)
        team_map       = load_teams(conn)
        player_map     = load_players(conn, team_map)
        load_matches(conn, season_id, team_map)
        load_player_stats(conn, player_map, season_id, team_map)
        load_team_stats(conn, season_id, team_map)
        verify(conn)
    finally:
        conn.close()

    log.info("\n" + "=" * 60)
    log.info("DONE. Neon database populated successfully.")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
