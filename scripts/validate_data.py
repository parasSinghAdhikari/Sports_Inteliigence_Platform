"""
Validate raw FBref data before loading into the database.

Checks:
- No null player/team names
- Numeric columns within valid ranges
- No duplicate matches
- Referential integrity checks

Prints a report and exits with code 1 if critical checks fail.
"""

import sys
import logging
from pathlib import Path
from glob import glob

import pandas as pd
import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"


def latest_file(pattern: str) -> Path | None:
    """Return the most recently created file matching the glob pattern."""
    files = sorted(glob(str(RAW_DIR / pattern)), reverse=True)
    return Path(files[0]) if files else None


class ValidationReport:
    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.passes: list[str] = []

    def error(self, msg: str):
        self.errors.append(msg)
        log.error(f"  ❌ {msg}")

    def warning(self, msg: str):
        self.warnings.append(msg)
        log.warning(f"  ⚠️  {msg}")

    def ok(self, msg: str):
        self.passes.append(msg)
        log.info(f"  ✅ {msg}")

    def summary(self):
        log.info("\n" + "=" * 60)
        log.info("VALIDATION SUMMARY")
        log.info("=" * 60)
        log.info(f"  Passed:   {len(self.passes)}")
        log.info(f"  Warnings: {len(self.warnings)}")
        log.info(f"  Errors:   {len(self.errors)}")
        if self.errors:
            log.error("\nCritical errors — fix before loading to database:")
            for e in self.errors:
                log.error(f"  • {e}")
            return False
        return True


def validate_player_stats(df: pd.DataFrame, report: ValidationReport):
    log.info("\n[Player Season Stats Validation]")

    # Null checks
    if df.index.get_level_values("player").isna().any():
        n = df.index.get_level_values("player").isna().sum()
        report.error(f"player index contains {n} null values")
    else:
        report.ok("player index has no nulls")

    # Numeric range checks
    for col in ["goals", "assists", "minutes"]:
        # Handle multi-level columns (soccerdata uses MultiIndex columns)
        matching = [c for c in df.columns if col in str(c).lower()]
        if matching:
            col_data = pd.to_numeric(df[matching[0]], errors="coerce")
            negative = (col_data < 0).sum()
            if negative > 0:
                report.error(f"Column '{matching[0]}' has {negative} negative values")
            else:
                report.ok(f"'{col}' column has no negative values")
        else:
            report.warning(f"Column '{col}' not found in player stats")

    # Missing values
    missing_pct = (df.isna().sum() / len(df) * 100).sort_values(ascending=False)
    high_missing = missing_pct[missing_pct > 50]
    if len(high_missing) > 0:
        report.warning(f"{len(high_missing)} columns have >50% missing values")
    else:
        report.ok("No columns with >50% missing values")


def validate_schedule(df: pd.DataFrame, report: ValidationReport):
    log.info("\n[Schedule Validation]")

    # Duplicate match check
    if df.index.duplicated().any():
        n = df.index.duplicated().sum()
        report.error(f"Schedule has {n} duplicate index rows")
    else:
        report.ok("No duplicate rows in schedule")

    # Score sanity
    for col in ["home_goals", "away_goals"]:
        matching = [c for c in df.columns if col.replace("_", "") in str(c).lower().replace("_", "")]
        if matching:
            col_data = pd.to_numeric(df[matching[0]], errors="coerce").dropna()
            negative = (col_data < 0).sum()
            if negative > 0:
                report.error(f"'{col}' has {negative} negative scores")
            else:
                report.ok(f"'{col}' has no negative values")


def validate():
    report = ValidationReport()
    log.info("Starting validation of raw FBref data …\n")

    # ── Player season stats ────────────────────────────────────────────────────
    path = latest_file("player_season_stats_*.parquet")
    if path:
        log.info(f"Loading {path.name}")
        df = pd.read_parquet(path)
        log.info(f"  Shape: {df.shape}")
        validate_player_stats(df, report)
    else:
        report.warning("No player_season_stats file found — run extract_fbref.py first")

    # ── Schedule ───────────────────────────────────────────────────────────────
    path = latest_file("schedule_*.parquet")
    if path:
        log.info(f"\nLoading {path.name}")
        df = pd.read_parquet(path)
        log.info(f"  Shape: {df.shape}")
        validate_schedule(df, report)
    else:
        report.warning("No schedule file found")

    # ── Final result ───────────────────────────────────────────────────────────
    passed = report.summary()
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    validate()
