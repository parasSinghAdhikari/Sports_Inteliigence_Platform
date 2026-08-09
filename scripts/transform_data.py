"""
Transform raw FBref parquet files into clean, flat DataFrames
ready to load into PostgreSQL.

Handles:
- Flattening MultiIndex columns
- Parsing scores into home_score / away_score integers
- Standardizing position strings (e.g. 'MF,FW' -> primary position)
- Computing normalized column names
- Adding per-90 metrics where not already present

Usage:
    python scripts/transform_data.py
"""

import sys
import logging
import re
from pathlib import Path
from glob import glob
from datetime import datetime

import pandas as pd
import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def latest(pattern: str) -> Path | None:
    files = sorted(glob(str(RAW_DIR / pattern)), reverse=True)
    return Path(files[0]) if files else None


def save(df: pd.DataFrame, name: str) -> Path:
    path = PROCESSED_DIR / f"{name}.parquet"
    df.to_parquet(path, index=False)
    log.info(f"  Saved: {path.name}  ({len(df):,} rows x {len(df.columns)} cols)")
    return path


def flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Flatten MultiIndex columns into 'group_field' style names."""
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [
            "_".join(str(p) for p in parts if p).strip("_")
            for parts in df.columns
        ]
    return df


def parse_score(score_str: str | None) -> tuple[int | None, int | None]:
    """Parse '2-1' or '2–1' into (2, 1). Returns (None, None) if unparseable."""
    if pd.isna(score_str) or not score_str:
        return None, None
    # FBref uses non-breaking hyphen or en-dash
    cleaned = str(score_str).replace("\u2013", "-").replace("\u2014", "-").replace("\xa0", "-")
    # Remove any non-digit non-hyphen characters
    cleaned = re.sub(r"[^\d\-]", "-", cleaned).strip("-")
    parts = cleaned.split("-")
    if len(parts) == 2:
        try:
            return int(parts[0]), int(parts[1])
        except ValueError:
            pass
    return None, None


def primary_position(pos_str: str | None) -> str | None:
    """Return the first position from comma-separated strings like 'MF,FW'."""
    if pd.isna(pos_str) or not pos_str:
        return None
    return str(pos_str).split(",")[0].strip()


# ── Transform schedule ─────────────────────────────────────────────────────────
def transform_schedule() -> pd.DataFrame:
    log.info("\n[1/3] Transforming schedule ...")
    path = latest("schedule_*.parquet")
    if not path:
        log.error("  No schedule file found")
        return pd.DataFrame()

    df = pd.read_parquet(path)
    df = flatten_columns(df)

    # Reset MultiIndex to columns
    df = df.reset_index()

    # Rename index columns
    df = df.rename(columns={
        "league": "competition",
        "season": "season_code",   # e.g. '2425'
        "game": "game_label",
    })

    # Parse score
    scores = df["score"].apply(parse_score)
    df["home_score"] = scores.apply(lambda x: x[0]).astype("Int64")
    df["away_score"] = scores.apply(lambda x: x[1]).astype("Int64")
    df.drop(columns=["score"], inplace=True)

    # Parse matchweek
    df = df.rename(columns={"week": "matchweek"})

    # Convert date
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # Add season_year (human-readable)
    df["season_year"] = "2024-25"

    # Select and order final columns
    cols = [
        "competition", "season_code", "season_year", "matchweek",
        "date", "day", "time",
        "home_team", "away_team",
        "home_score", "away_score",
        "attendance", "venue", "referee",
        "game_id",
    ]
    df = df[[c for c in cols if c in df.columns]]

    log.info(f"  Completed: {df.shape}")
    save(df, "schedule")
    return df


# ── Transform player season stats ─────────────────────────────────────────────
def transform_player_stats() -> pd.DataFrame:
    log.info("\n[2/3] Transforming player season stats ...")
    path = latest("player_season_stats_*.parquet")
    if not path:
        log.error("  No player stats file found")
        return pd.DataFrame()

    df = pd.read_parquet(path)
    df = flatten_columns(df)
    df = df.reset_index()

    # Rename index columns
    df = df.rename(columns={
        "league": "competition",
        "season": "season_code",
        "team": "team",
        "player": "player",
    })

    # Clean up FBref column names -> readable names
    col_map = {
        "nation":                   "nationality",
        "pos":                      "position_raw",
        "age":                      "age",
        "born":                     "birth_year",
        "Playing Time_MP":          "matches_played",
        "Playing Time_Starts":      "starts",
        "Playing Time_Min":         "minutes",
        "Playing Time_90s":         "nineties",
        "Performance_Gls":          "goals",
        "Performance_Ast":          "assists",
        "Performance_G+A":          "goals_plus_assists",
        "Performance_G-PK":         "non_pen_goals",
        "Performance_PK":           "pen_goals",
        "Performance_PKatt":        "pen_attempts",
        "Performance_CrdY":         "yellow_cards",
        "Performance_CrdR":         "red_cards",
        "Per 90 Minutes_Gls":       "goals_per90",
        "Per 90 Minutes_Ast":       "assists_per90",
        "Per 90 Minutes_G+A":       "goal_contributions_per90",
        "Per 90 Minutes_G-PK":      "non_pen_goals_per90",
        "Per 90 Minutes_G+A-PK":    "non_pen_contributions_per90",
    }
    df = df.rename(columns=col_map)

    # Standardize position
    df["position"] = df["position_raw"].apply(primary_position)

    # Ensure numeric types
    numeric_cols = [
        "age", "birth_year", "matches_played", "starts", "minutes",
        "goals", "assists", "yellow_cards", "red_cards",
        "pen_goals", "pen_attempts",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")

    float_cols = [
        "nineties", "goals_per90", "assists_per90",
        "goal_contributions_per90", "non_pen_goals_per90",
    ]
    for col in float_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Season year
    df["season_year"] = "2024-25"

    # Final column order
    final_cols = [
        "competition", "season_code", "season_year",
        "team", "player",
        "nationality", "position", "position_raw", "age", "birth_year",
        "matches_played", "starts", "minutes", "nineties",
        "goals", "assists", "goals_plus_assists",
        "non_pen_goals", "pen_goals", "pen_attempts",
        "yellow_cards", "red_cards",
        "goals_per90", "assists_per90", "goal_contributions_per90",
        "non_pen_goals_per90", "non_pen_contributions_per90",
    ]
    df = df[[c for c in final_cols if c in df.columns]]

    log.info(f"  Completed: {df.shape}")
    save(df, "player_season_stats")
    return df


# ── Transform team season stats ───────────────────────────────────────────────
def transform_team_stats() -> pd.DataFrame:
    log.info("\n[3/3] Transforming team season stats ...")
    path = latest("team_season_stats_*.parquet")
    if not path:
        log.error("  No team stats file found")
        return pd.DataFrame()

    df = pd.read_parquet(path)
    df = flatten_columns(df)
    df = df.reset_index()

    df = df.rename(columns={
        "league": "competition",
        "season": "season_code",
        "team": "team",
        "players_used": "players_used",
        "Age": "avg_age",
        "Poss": "avg_possession",
        "Playing Time_MP":     "matches_played",
        "Playing Time_Starts": "starts",
        "Playing Time_Min":    "minutes",
        "Playing Time_90s":    "nineties",
        "Performance_Gls":     "goals",
        "Performance_Ast":     "assists",
        "Performance_G+A":     "goals_plus_assists",
        "Performance_G-PK":    "non_pen_goals",
        "Performance_PK":      "pen_goals",
        "Performance_PKatt":   "pen_attempts",
        "Performance_CrdY":    "yellow_cards",
        "Performance_CrdR":    "red_cards",
        "Per 90 Minutes_Gls":      "goals_per90",
        "Per 90 Minutes_Ast":      "assists_per90",
        "Per 90 Minutes_G+A":      "goal_contributions_per90",
        "Per 90 Minutes_G-PK":     "non_pen_goals_per90",
        "Per 90 Minutes_G+A-PK":   "non_pen_contributions_per90",
    })

    df["season_year"] = "2024-25"
    df.drop(columns=["url"], errors="ignore", inplace=True)

    log.info(f"  Completed: {df.shape}")
    save(df, "team_season_stats")
    return df


def main():
    log.info("=" * 60)
    log.info("Transforming FBref data ...")
    log.info("=" * 60)

    schedule = transform_schedule()
    players = transform_player_stats()
    teams = transform_team_stats()

    log.info("\n" + "=" * 60)
    log.info("Transform complete. Files saved to data/processed/")
    log.info("=" * 60)

    # Quick QA summary
    if not schedule.empty:
        played = schedule["home_score"].notna().sum()
        log.info(f"  Schedule: {len(schedule)} matches, {played} played")
    if not players.empty:
        log.info(f"  Players:  {len(players)} player-seasons, {players['team'].nunique()} teams")
    if not teams.empty:
        log.info(f"  Teams:    {len(teams)} teams")


if __name__ == "__main__":
    main()
