"""
M10 — Match Intelligence Data Extraction

Extracts per-match stats from FBref for all 380 Premier League 2024-25 games:
  - shooting  → shots, shots on target, xG (via schedule)
  - misc       → fouls, corners, yellow/red cards per match
  - schedule   → xG, xGA per team per match

Output: data/raw/match_intelligence_<date>.parquet
        data/processed/match_stats.parquet

Run this script locally in PowerShell (FBref may block headless Chrome).
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

ROOT        = Path(__file__).resolve().parent.parent
RAW_DIR     = ROOT / "data" / "raw"
PROC_DIR    = ROOT / "data" / "processed"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROC_DIR.mkdir(parents=True, exist_ok=True)

TODAY = date.today().strftime("%Y%m%d")


def fix_col(df: pd.DataFrame) -> pd.DataFrame:
    """Flatten multi-level columns and lower-case."""
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ["_".join(filter(None, map(str, c))).strip("_") for c in df.columns]
    df.columns = [c.lower().replace(" ", "_") for c in df.columns]
    return df


def safe_float(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def extract_shooting(fbref) -> pd.DataFrame:
    log.info("Extracting shooting stats (shots, SoT, goals per match)...")
    df = fbref.read_team_match_stats(stat_type="shooting")
    df = fix_col(df.reset_index())

    # Normalise column names produced by soccerdata
    rename = {}
    for c in df.columns:
        lc = c.lower()
        if "standard_sh" in lc and "sot" not in lc:   rename[c] = "shots"
        elif "standard_sot" in lc and "%" not in lc:  rename[c] = "shots_on_target"
        elif "standard_gls" in lc:                    rename[c] = "goals_shot"
        elif c in ("gf", "standard_gf"):              rename[c] = "goals_for"
        elif c in ("ga", "standard_ga"):              rename[c] = "goals_against"
    df = df.rename(columns=rename)

    keep = ["league", "season", "team", "game", "date", "venue", "result",
            "opponent", "shots", "shots_on_target", "goals_for", "goals_against"]
    keep = [c for c in keep if c in df.columns]
    return df[keep].copy()


def extract_misc(fbref) -> pd.DataFrame:
    log.info("Extracting misc stats (fouls, corners, cards per match)...")
    df = fbref.read_team_match_stats(stat_type="misc")
    df = fix_col(df.reset_index())

    rename = {}
    for c in df.columns:
        lc = c.lower()
        if "fls" in lc or "fouls_committed" in lc: rename[c] = "fouls"
        elif "fld" in lc or "fouls_drawn" in lc:   rename[c] = "fouls_drawn"
        elif "crd_y" in lc or "crdy" in lc:        rename[c] = "yellow_cards"
        elif "crd_r" in lc or "crdr" in lc:        rename[c] = "red_cards"
        elif "pkatt" in lc:                         rename[c] = "pen_attempts"
        elif "int" in lc and "interceptions" in lc: rename[c] = "interceptions"
    df = df.rename(columns=rename)

    keep = ["league", "season", "team", "game",
            "fouls", "fouls_drawn", "yellow_cards", "red_cards", "pen_attempts"]
    keep = [c for c in keep if c in df.columns]
    return df[keep].copy()


def extract_schedule_xg(fbref) -> pd.DataFrame:
    """
    The main schedule read_schedule() contains xG columns:
    home_xg, away_xg (or xg / xga per-team row).
    Try both approaches.
    """
    log.info("Extracting xG from schedule...")
    try:
        df = fbref.read_schedule()
        df = fix_col(df.reset_index())
        log.info("  Schedule columns: %s", df.columns.tolist())

        # Look for xg-related columns
        xg_cols = [c for c in df.columns if "xg" in c.lower()]
        log.info("  xG columns found: %s", xg_cols)

        if not xg_cols:
            log.warning("  No xG columns in schedule — FBref may not have published xG for all matches yet.")
            return pd.DataFrame()

        keep = ["game_id", "home_team", "away_team", "date"] + xg_cols
        keep = [c for c in keep if c in df.columns]
        return df[keep].copy()

    except Exception as e:
        log.error("  Schedule xG extraction failed: %s", e)
        return pd.DataFrame()


def merge_and_save(shooting: pd.DataFrame, misc: pd.DataFrame, xg: pd.DataFrame):
    log.info("Merging and cleaning match stats...")

    if shooting.empty:
        log.error("Shooting data is empty — cannot proceed.")
        sys.exit(1)

    # Merge shooting + misc on (team, game)
    merge_keys = ["league", "season", "team", "game"]
    merge_keys_m = [k for k in merge_keys if k in misc.columns]
    merge_keys_s = [k for k in merge_keys if k in shooting.columns]

    if not misc.empty and merge_keys_m:
        df = shooting.merge(misc, on=[k for k in merge_keys if k in merge_keys_s and k in merge_keys_m], how="left")
    else:
        df = shooting.copy()

    # Numeric coercion
    for col in ["shots", "shots_on_target", "goals_for", "goals_against",
                "fouls", "yellow_cards", "red_cards", "pen_attempts"]:
        if col in df.columns:
            df[col] = safe_float(df[col])

    # Save raw
    raw_path = RAW_DIR / f"match_stats_{TODAY}.parquet"
    df.to_parquet(raw_path, index=False)
    log.info("  Raw saved: %s (%d rows, %d cols)", raw_path, len(df), len(df.columns))

    # Processed copy
    proc_path = PROC_DIR / "match_stats.parquet"
    df.to_parquet(proc_path, index=False)
    log.info("  Processed saved: %s", proc_path)

    # Save xG separately if available
    if not xg.empty:
        xg_path = PROC_DIR / "match_xg.parquet"
        xg.to_parquet(xg_path, index=False)
        log.info("  xG saved: %s (%d rows)", xg_path, len(xg))

    # Summary
    log.info("\n=== MATCH STATS SUMMARY ===")
    log.info("  Total rows (2 per match): %d", len(df))
    log.info("  Teams: %s", df.get("team", pd.Series(dtype="object")).nunique() if "team" in df else "N/A")
    log.info("  Columns: %s", df.columns.tolist())
    if "shots" in df.columns:
        log.info("  Avg shots per team/match: %.1f", df["shots"].mean())
    if "shots_on_target" in df.columns:
        log.info("  Avg SoT per team/match: %.1f", df["shots_on_target"].mean())
    log.info("===========================\n")

    return df


def main():
    log.info("=" * 60)
    log.info("M10 — Match Intelligence Extraction")
    log.info("=" * 60)

    fbref = sd.FBref(leagues="ENG-Premier League", seasons=2024)

    shooting = extract_shooting(fbref)
    log.info("  Shooting rows: %d", len(shooting))

    misc = extract_misc(fbref)
    log.info("  Misc rows: %d", len(misc))

    xg = extract_schedule_xg(fbref)
    log.info("  xG rows: %d", len(xg))

    df = merge_and_save(shooting, misc, xg)

    log.info("DONE. Run load_match_stats.py next to push to Neon.")
    return df


if __name__ == "__main__":
    main()
