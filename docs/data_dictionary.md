# Data Dictionary

All fields collected via FBref through soccerdata v1.9.1.

> Last updated: 2026-08-08
> Extraction: `scripts/extract_fbref.py`
> League: ENG-Premier League | Season: 2024/25

---

## player_season_stats

Aggregated player statistics for the full season.

| Field | Meaning | Type | Source | Notes |
|---|---|---|---|---|
| player | Player full name | string | FBref | Multi-index level |
| team | Club name | string | FBref | Multi-index level |
| season | Season year (e.g. 2024-25) | string | FBref | |
| position | Position(s) played | string | FBref | May be comma-separated |
| age | Player age | integer | FBref | At time of season |
| minutes | Total minutes played | integer | FBref | |
| matches | Matches appeared in | integer | FBref | |
| goals | Goals scored | integer | FBref | |
| assists | Goal assists | integer | FBref | |
| xg | Expected goals | float | FBref | Model-based |
| xa | Expected assists | float | FBref | Model-based |
| shots | Total shots | integer | FBref | |
| shots_on_target | Shots on target | integer | FBref | |
| passes_completed | Passes completed | integer | FBref | |
| passes_attempted | Passes attempted | integer | FBref | |
| pass_pct | Pass completion % | float | FBref | Computed |
| key_passes | Key passes (leading to shot) | integer | FBref | |
| progressive_passes | Progressive passes | integer | FBref | >10 yards toward goal |
| tackles | Tackles won | integer | FBref | |
| interceptions | Interceptions | integer | FBref | |

---

## schedule

Match fixtures and results.

| Field | Meaning | Type | Source | Notes |
|---|---|---|---|---|
| date | Match date | date | FBref | |
| home_team | Home team name | string | FBref | |
| away_team | Away team name | string | FBref | |
| home_goals | Home team goals | integer | FBref | Null if not played |
| away_goals | Away team goals | integer | FBref | Null if not played |
| matchweek | Gameweek number | integer | FBref | |
| venue | Stadium name | string | FBref | |

---

## team_season_stats

Team-level aggregated statistics per season.

| Field | Meaning | Type | Source | Notes |
|---|---|---|---|---|
| team | Team name | string | FBref | |
| season | Season | string | FBref | |
| goals_for | Goals scored | integer | FBref | |
| goals_against | Goals conceded | integer | FBref | |
| xg_for | Expected goals for | float | FBref | |
| xg_against | Expected goals against | float | FBref | |
| possession | Avg possession % | float | FBref | |

---

## Missing Value Treatment

| Column | Missing % | Treatment |
|---|---|---|
| xg | ~5% | Keep as null (model data not always available) |
| xa | ~5% | Keep as null |
| age | <1% | Keep as null |
| venue | ~2% | Keep as null |

---

## Assumptions

1. Player names are standardized using soccerdata's built-in normalization
2. Season year refers to the starting year (e.g. "2024" = 2024/25)
3. Per-90 metrics are calculated as: `metric / minutes * 90`
4. xG and xA values come from FBref's model and may differ from other providers
