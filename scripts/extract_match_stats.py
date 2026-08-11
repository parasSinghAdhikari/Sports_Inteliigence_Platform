"""
M10 — Match Intelligence Data Extraction

Builds a clean per-match team-stats table (2 rows per match: Home + Away) ready
for scripts/load_match_stats.py.

Sources (all via soccerdata FBref, season 2024-25):
  - stat_type="shooting"  → shots, shots on target, GF, GA, venue, result
  - stat_type="misc"      → fouls, yellow/red cards, penalty attempts

Column names are mapped explicitly against the real FBref output (verified:
  shooting → GF, GA, Standard_Sh, Standard_SoT, venue, result, opponent, ...
  misc     → Fls, CrdY, CrdR, PKatt, ...)

IMPORTANT:
  - Run this in your own PowerShell terminal (FBref may block headless Chrome).
  - The `team` index from soccerdata can be NaN in some pulls; this script
    recovers the team name from the `game` + `venue` fields when possible.
  - Output: data/processed/match_stats.parquet

Usage:
    .\\venv\\Scripts\\Activate.ps1
    python scripts/extract_match_stats.py
"""
import warnings
warnings.filterwarnings("ignore")

import sys
import logging
from datetime import date
from pathlib import Path

import pandas as pd
import soccerdata as sd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

ROOT     = Path(__file__).resolve().parent.parent
RAW_DIR  = ROOT / "data" / "raw"
PROC_DIR = ROOT / "data" / "processed"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROC_DIR.mkdir(parents=True, exist_ok=True)

TODAY = date.today().strftime("%Y%m%d")

LEAGUE = "ENG-Premier League"
SEASON = 2024  # 2024-25


def fix_col(df: pd.DataFrame) -> pd.DataFrame:
    """Flatten multi-level columns and lowercase with underscores."""
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ["_".join(filter(None, map(str, c))).strip("_") for c in df.columns]
    df.columns = [str(c).lower().replace(" ", "_") for c in df.columns]
    return df


def recover_team(df: pd.DataFrame) -> pd.DataFrame:
    """
    The `team` index is frequently NaN in FBref pulls. Recover it from the
    `game` value, which is formatted '{date} {home_name}-{away_name}'.
    venue tells us which side each row represents.
    """
    for i, row in df.iterrows():
        team = row.get("team")
        if pd.notna(team) and str(team) != "":
            continue  # already have a real team
        game = str(row.get("game", ""))
        venue = str(row.get("venue", "")).lower()
        if "-" in game and " " in game:
            _, matchup = game.split(" ", 1)
            if matchup.count("-") == 1:
                home, away = matchup.split("-", 1)
                side = home if venue == "home" else away
                df.at[i, "team"] = side if side and side.lower() != "nan" else None
    return df


def parse_score_misc(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce numeric match-stat columns safely."""

    # Detect duplicate column names
    duplicate_cols = df.columns[df.columns.duplicated()].tolist()

    if duplicate_cols:
        log.error(
            "Duplicate columns detected in parse_score_misc: %s",
            duplicate_cols
        )
        log.error("All columns: %s", df.columns.tolist())

        raise ValueError(
            f"Duplicate columns detected: {duplicate_cols}"
        )

    numeric_cols = [
        "gf",
        "ga",
        "standard_sh",
        "standard_sot",
        "shots",
        "shots_on_target",
        "goals_for",
        "goals_against",
        "fouls",
        "yellow_cards",
        "red_cards",
        "pen_attempts",
        "misc_fls",
        "misc_crdy",
        "misc_crdr",
        "standard_pkatt",
        "misc_pkatt",
    ]

    for col in numeric_cols:
        if col not in df.columns:
            continue

        df[col] = pd.to_numeric(
            df[col],
            errors="coerce"
        )

    return df


def extract_shooting(fbref) -> pd.DataFrame:
    log.info("Extracting shooting stats (shots, SoT, GF, GA per match)...")
    df = fbref.read_team_match_stats(stat_type="shooting")
    df = fix_col(df.reset_index())
    df = parse_score_misc(df)

    df = df.rename(columns={
        "gf": "goals_for",
        "ga": "goals_against",
        "standard_sh": "shots",
        "standard_sot": "shots_on_target",
        "standard_pkatt": "pen_attempts",
    })

    keep = ["league", "season", "team", "game", "date", "venue", "opponent", "result",
            "goals_for", "goals_against", "shots", "shots_on_target", "pen_attempts"]
    
    return df[[c for c in keep if c in df.columns]].copy()


def extract_misc(fbref) -> pd.DataFrame:
    log.info("Extracting misc stats (fouls, cards per match)...")
    df = fbref.read_team_match_stats(stat_type="misc")
    df = fix_col(df.reset_index())
    log.info("Misc columns after normalisation: %s", df.columns.tolist())
    df = parse_score_misc(df)

    rename = {}
    for c in df.columns:
        suffix = str(c).lower().split("_")[-1]
        if suffix == "fls":
            rename[c] = "fouls"
        elif suffix == "crdy":
            rename[c] = "yellow_cards"
        elif suffix == "crdr":
            rename[c] = "red_cards"
        elif suffix == "pkatt":
            rename[c] = "pen_attempts"
    df = df.rename(columns=rename)

    duplicates = df.columns[df.columns.duplicated()].tolist()
    if duplicates:
        raise ValueError(f"Duplicate columns after misc rename: {duplicates}")

    keep = ["league", "season", "team", "game", "date", "venue", "opponent",
            "fouls", "yellow_cards", "red_cards", "pen_attempts"]
    return df[[c for c in keep if c in df.columns]].copy()


def build_match_stats(shooting: pd.DataFrame, misc: pd.DataFrame) -> pd.DataFrame:
    log.info("Merging shooting + misc ...")
    if shooting.empty:
        log.error("Shooting data is empty — cannot proceed.")
        sys.exit(1)

    # Pair Home/Away rows between the two tables via (game, venue).
    if not misc.empty:
        keys = [k for k in ("league", "season", "game", "venue") if k in shooting.columns and k in misc.columns]
        df = shooting.merge(misc, on=keys, how="left",
                            suffixes=("", "_misc"))
        # Prefer shooting's pen_attempts; fill from misc if missing
        if "pen_attempts_misc" in df.columns:
            df["pen_attempts"] = df["pen_attempts"].fillna(df["pen_attempts_misc"])
            df.drop(columns=["pen_attempts_misc"], inplace=True)
    else:
        log.warning("Misc data empty — fouls/cards will be NULL.")
        df = shooting.copy()

    df = parse_score_misc(df)

    # Normalise date to ISO string
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m-%d")

    # Fill pen_attempts from shooting if present
    for col in ["goals_for", "goals_against", "shots", "shots_on_target",
                "fouls", "yellow_cards", "red_cards", "pen_attempts"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


def main():
    log.info("=" * 60)
    log.info("M10 — Match Intelligence Extraction")
    log.info("=" * 60)

    fbref = sd.FBref(leagues=LEAGUE, seasons=SEASON)

    shooting = extract_shooting(fbref)
    log.info("  Shooting rows: %d", len(shooting))

    misc = extract_misc(fbref)
    log.info("  Misc rows: %d", len(misc))

    df = build_match_stats(shooting, misc)

    if df.empty:
        log.error("No match stats produced.")
        sys.exit(1)

    # Save raw + processed
    raw_path = RAW_DIR / f"match_stats_{TODAY}.parquet"
    df.to_parquet(raw_path, index=False)
    log.info("  Raw saved: %s (%d rows, %d cols)", raw_path, len(df), len(df.columns))

    proc_path = PROC_DIR / "match_stats.parquet"
    df.to_parquet(proc_path, index=False)
    log.info("  Processed saved: %s (%d rows, %d cols)", proc_path, len(df), len(df.columns))

    # QA summary
    log.info("\n=== MATCH STATS SUMMARY ===")
    log.info("  Rows (expect 2 per match = 760): %d", len(df))
    log.info("  Teams with a name: %d / %d (%d missing)",
             df["team"].notna().sum(), len(df), df["team"].isna().sum())
    log.info("  Columns: %s", df.columns.tolist())
    for col in ["shots", "shots_on_target", "fouls", "yellow_cards"]:
        if col in df.columns:
            log.info("  Mean %s: %.1f", col, df[col].mean())
    log.info("  Rows missing team name (will be skipped at load): %d", df["team"].isna().sum())
    log.info("===========================\n")
    return df


if __name__ == "__main__":
    main()