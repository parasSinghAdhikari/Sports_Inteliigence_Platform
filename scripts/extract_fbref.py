"""
Extract FBref data via soccerdata.

IMPORTANT: Run this in your own PowerShell terminal (not via agent).
soccerdata uses a real Chrome browser to fetch FBref data.

Usage:
    cd C:\\Sports\\sports-intelligence-platform
    .\\venv\\Scripts\\Activate.ps1
    python scripts/extract_fbref.py
"""

import sys
import logging
from pathlib import Path
from datetime import datetime

import pandas as pd
import soccerdata as sd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

LEAGUE = "ENG-Premier League"
SEASON = "2024"   # 2024/25 season


def fix_mixed_types(df: pd.DataFrame) -> pd.DataFrame:
    """
    Parquet cannot save columns with mixed Python types (e.g. str '1' and int 1).
    Coerce every object column to numeric where possible, else cast to str.
    """
    for col in df.columns:
        if df[col].dtype == object:
            # Try numeric first
            converted = pd.to_numeric(df[col], errors="coerce")
            if converted.notna().sum() > 0 and df[col].notna().sum() > 0:
                # If at least some values converted, check if ALL non-null became numeric
                non_null = df[col].dropna()
                all_numeric = all(
                    isinstance(v, (int, float)) or str(v).replace(".", "").replace("-", "").isdigit()
                    for v in non_null
                )
                if all_numeric:
                    df[col] = pd.to_numeric(df[col], errors="coerce")
                    continue
            # Otherwise cast whole column to string
            df[col] = df[col].astype(str).where(df[col].notna(), other=None)
    return df


def save(df: pd.DataFrame, name: str) -> Path:
    """Fix mixed types then save to parquet."""
    df = fix_mixed_types(df)
    timestamp = datetime.now().strftime("%Y%m%d")
    path = RAW_DIR / f"{name}_{timestamp}.parquet"
    df.to_parquet(path, index=True)
    log.info(f"  Saved: {path.name}  ({len(df):,} rows x {len(df.columns)} cols)")
    return path


def extract():
    log.info("=" * 60)
    log.info(f"FBref extraction: {LEAGUE} | Season {SEASON}")
    log.info("=" * 60)

    fbref = sd.FBref(leagues=LEAGUE, seasons=SEASON)

    # 1. Schedule (fixtures + results)
    log.info("\n[1/5] Reading schedule ...")
    try:
        df = fbref.read_schedule()
        save(df, "schedule")
        log.info(f"      Shape: {df.shape}")
        log.info(f"      Columns: {df.columns.tolist()}")
    except Exception as e:
        log.error(f"      Failed: {e}")

    # 2. Team season statistics (standard)
    log.info("\n[2/5] Reading team season stats (standard) ...")
    try:
        df = fbref.read_team_season_stats(stat_type="standard")
        save(df, "team_season_stats")
        log.info(f"      Shape: {df.shape}")
    except Exception as e:
        log.error(f"      Failed: {e}")

    # 3. Player season statistics (standard)
    log.info("\n[3/5] Reading player season stats (standard) ...")
    try:
        df = fbref.read_player_season_stats(stat_type="standard")
        save(df, "player_season_stats")
        log.info(f"      Shape: {df.shape}")
    except Exception as e:
        log.error(f"      Failed: {e}")

    # 4. Team match stats - schedule (result, possession per match)
    log.info("\n[4/5] Reading team match stats (schedule) ...")
    try:
        df = fbref.read_team_match_stats(stat_type="schedule")
        # GF and GA columns come as mixed str/int — coerce explicitly
        for col in ["GF", "GA", "Poss", "Attendance"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        save(df, "team_match_stats_schedule")
        log.info(f"      Shape: {df.shape}")
        log.info(f"      Columns: {df.columns.tolist()}")
    except Exception as e:
        log.error(f"      Failed: {e}")

    # 5. Team match stats - shooting (xG per match)
    log.info("\n[5/5] Reading team match stats (shooting) ...")
    try:
        df = fbref.read_team_match_stats(stat_type="shooting")
        for col in df.select_dtypes(include="object").columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        save(df, "team_match_stats_shooting")
        log.info(f"      Shape: {df.shape}")
        log.info(f"      Columns: {df.columns.tolist()}")
    except Exception as e:
        log.error(f"      Failed: {e}")

    log.info("\n" + "=" * 60)
    log.info("DONE. Check data/raw/ for output files.")
    log.info("=" * 60)


if __name__ == "__main__":
    extract()
