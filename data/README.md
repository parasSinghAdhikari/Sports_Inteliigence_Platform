# Data Directory

## Structure

```
data/
├── raw/          ← Downloaded from FBref via soccerdata (NOT in Git)
├── processed/    ← Cleaned, validated, ready for DB (NOT in Git)
└── statsbomb/    ← StatsBomb open data (NOT in Git)
```

## Files in raw/

Files are saved as Parquet with a date stamp, e.g.:

| File | Description | Source |
|---|---|---|
| `schedule_YYYYMMDD.parquet` | Match fixtures and results | FBref |
| `player_season_stats_YYYYMMDD.parquet` | Player stats aggregated by season | FBref |
| `team_season_stats_YYYYMMDD.parquet` | Team stats aggregated by season | FBref |
| `team_match_stats_YYYYMMDD.parquet` | Team stats per match | FBref |

## Why Parquet?

- Efficient columnar storage (much smaller than CSV for wide DataFrames)
- Preserves data types (no silent type conversion like CSV)
- Fast read/write with Pandas

## Notes

- Large files are excluded from Git via `.gitignore`
- To regenerate: `python scripts/extract_fbref.py`
- Extraction date is embedded in filename for traceability
