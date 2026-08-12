"""
M11 — Leakage-safe feature engineering for match-outcome prediction.

Features for a given match are computed ONLY from matches that occurred
BEFORE it (rolling form, home/away venue form, head-to-head). We never use
season-total aggregates (they include the target match) or per-match shot
data (it is part of the match itself and may be absent).

Source: ``data/processed/schedule.parquet`` — scores only.

Train and predict share a single ordered feature list (``FEATURE_COLS``)
so the model input order is always identical.
"""
from __future__ import annotations

from datetime import timedelta

import pandas as pd

# Rolling window for recent form.
ROLLING_N = 5

# Outcome encoding: home win / draw / away win.
OUTCOME_HOME, OUTCOME_DRAW, OUTCOME_AWAY = 0, 1, 2
OUTCOME_LABELS = ["H", "D", "A"]

# Defaults applied when a team has no prior history (cold-start / pre-season).
DEFAULT_DAYS = 30
DEFAULT_VAL = 0.0

# Ordered list of match-level features (single source of truth for order).
FEATURE_COLS: list[str] = [
    # Home team rolling form
    "home_pts_N", "home_wins_N", "home_draws_N", "home_losses_N",
    "home_gf_N", "home_ga_N", "home_goal_diff_N", "home_avg_gf_N", "home_avg_ga_N",
    "home_win_pct_all", "home_matches_played_all", "home_form_streak",
    # Home team venue-specific (home) form
    "home_home_pts_N", "home_home_win_pct", "home_home_avg_gf",
    "home_days_since_last",
    # Away team rolling form
    "away_pts_N", "away_wins_N", "away_draws_N", "away_losses_N",
    "away_gf_N", "away_ga_N", "away_goal_diff_N", "away_avg_gf_N", "away_avg_ga_N",
    "away_win_pct_all", "away_matches_played_all", "away_form_streak",
    # Away team venue-specific (away) form
    "away_away_pts_N", "away_away_win_pct", "away_away_avg_gf",
    "away_days_since_last",
    # Derived / net
    "net_pts", "net_att", "net_def",
    # Head-to-head this season
    "h2h_pts", "h2h_gd", "h2h_n",
]

_POINTS = {"W": 3, "D": 1, "L": 0}
_STREAK_SIGN = {"W": 1, "D": 0, "L": -1}


def outcome_from_score(home_score: float, away_score: float) -> int:
    """Map a scoreline to the H/D/A outcome code."""
    if home_score > away_score:
        return OUTCOME_HOME
    if home_score == away_score:
        return OUTCOME_DRAW
    return OUTCOME_AWAY


def _team_result(gf: int, ga: int) -> str:
    """W/D/L result label from a team's perspective."""
    if gf > ga:
        return "W"
    if gf == ga:
        return "D"
    return "L"


def _add_result(history: dict[str, list[dict]], home: str, away: str,
                date, home_score: int, away_score: int) -> None:
    """Append a completed match to each team's history (both perspectives)."""
    if home_score is None or away_score is None:
        return
    home_label = _team_result(home_score, away_score)
    away_label = _team_result(away_score, home_score)

    history.setdefault(home, []).append({
        "date": date, "opp": away, "venue": "H",
        "gf": home_score, "ga": away_score,
        "pts": _POINTS[home_label], "result": home_label,
    })
    history.setdefault(away, []).append({
        "date": date, "opp": home, "venue": "A",
        "gf": away_score, "ga": home_score,
        "pts": _POINTS[away_label], "result": away_label,
    })


def _team_form(team: str, history: dict[str, list[dict]], date,
               prefix: str, venue: str) -> dict:
    """
    Build the form feature dict for one team as of `date`.

    `prefix` is 'home' or 'away' (used to name the keys). `venue` is 'H' or 'A'
    and selects venue-specific stats (home team -> its home games, away team ->
    its away games).
    """
    prior = history.get(team, [])
    prior_before = [m for m in prior if m["date"] is not None and
                    (date is None or m["date"] < date)]
    last_n = prior_before[-ROLLING_N:]

    n = len(last_n)
    wins = sum(1 for m in last_n if m["result"] == "W")
    draws = sum(1 for m in last_n if m["result"] == "D")
    losses = sum(1 for m in last_n if m["result"] == "L")
    gf = sum(m["gf"] for m in last_n)
    ga = sum(m["ga"] for m in last_n)

    all_n = len(prior_before)
    all_wins = sum(1 for m in prior_before if m["result"] == "W")
    win_pct_all = (all_wins / all_n) if all_n else DEFAULT_VAL

    # Current form streak (from most recent backwards), signed & capped.
    streak = 0
    if prior_before:
        last_res = prior_before[-1]["result"]
        sign = _STREAK_SIGN[last_res]
        for m in reversed(prior_before):
            if m["result"] != last_res:
                break
            streak += sign
        streak = max(-5, min(5, streak))

    # Venue-specific subset.
    ven = [m for m in prior_before if m["venue"] == venue]
    ven_n = ven[-ROLLING_N:]
    ven_pts = sum(m["pts"] for m in ven_n)
    ven_wins = sum(1 for m in ven_n if m["result"] == "W")
    ven_gf = sum(m["gf"] for m in ven_n)
    ven_win_pct = (ven_wins / len(ven_n)) if ven_n else DEFAULT_VAL
    ven_avg_gf = (ven_gf / len(ven_n)) if ven_n else DEFAULT_VAL

    days = DEFAULT_DAYS
    if prior_before and prior_before[-1]["date"] is not None and date is not None:
        days = int((pd.Timestamp(date) - pd.Timestamp(prior_before[-1]["date"])).days)

    ven_key = "home" if venue == "H" else "away"
    return {
        f"{prefix}_pts_N":              sum(m["pts"] for m in last_n),
        f"{prefix}_wins_N":             wins,
        f"{prefix}_draws_N":            draws,
        f"{prefix}_losses_N":           losses,
        f"{prefix}_gf_N":               gf,
        f"{prefix}_ga_N":               ga,
        f"{prefix}_goal_diff_N":        gf - ga,
        f"{prefix}_avg_gf_N":           (gf / n) if n else DEFAULT_VAL,
        f"{prefix}_avg_ga_N":           (ga / n) if n else DEFAULT_VAL,
        f"{prefix}_win_pct_all":        win_pct_all,
        f"{prefix}_matches_played_all": float(all_n),
        f"{prefix}_form_streak":        float(streak),
        f"{prefix}_{ven_key}_pts_N":    ven_pts,
        f"{prefix}_{ven_key}_win_pct":  ven_win_pct,
        f"{prefix}_{ven_key}_avg_gf":   ven_avg_gf,
        f"{prefix}_days_since_last":    float(days),
    }


def _h2h(home: str, away: str, history: dict[str, list[dict]], date) -> dict:
    """Head-to-head points / goal diff / meetings for (home vs away) prior to date."""
    meetings = [
        m for m in history.get(home, [])
        if m["opp"] == away and (date is None or m["date"] < date)
    ]
    h2h_pts = sum(m["pts"] for m in meetings)
    h2h_gd = sum(m["gf"] - m["ga"] for m in meetings)
    return {"h2h_pts": float(h2h_pts), "h2h_gd": float(h2h_gd), "h2h_n": float(len(meetings))}


def _match_features(home: str, away: str, history: dict[str, list[dict]],
                    date) -> list[float]:
    """Full ordered feature vector for a single (home, away) match as of `date`."""
    home_f = _team_form(home, history, date, "home", "H")
    away_f = _team_form(away, history, date, "away", "A")
    net = {
        "net_pts": home_f["home_pts_N"] - away_f["away_pts_N"],
        "net_att": home_f["home_avg_gf_N"] - away_f["away_avg_ga_N"],
        "net_def": home_f["home_avg_ga_N"] - away_f["away_avg_gf_N"],
    }
    h2h = _h2h(home, away, history, date)
    merged = {**home_f, **away_f, **net, **h2h}
    return [merged[c] for c in FEATURE_COLS]


def build_feature_matrix(schedule: pd.DataFrame) -> tuple:
    """
    Build the leakage-safe feature matrix from a full schedule.

    Returns (X_df, y_outcome, y_hg, y_ag, meta_df). One row per completed match,
    features computed from matches strictly before it.
    """
    df = schedule.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"]).sort_values(["date", "matchweek"])

    history: dict[str, list[dict]] = {}
    rows, outcomes, hgs, ags, meta = [], [], [], [], []

    for _, m in df.iterrows():
        home, away = m["home_team"], m["away_team"]
        hs, as_ = m["home_score"], m["away_score"]
        if hs is None or as_ is None:
            continue  # unplayed fixture — not a training row

        rows.append(_match_features(home, away, history, m["date"]))
        outcomes.append(outcome_from_score(hs, as_))
        hgs.append(int(hs))
        ags.append(int(as_))
        meta.append({
            "home_team": home, "away_team": away,
            "date": m["date"], "matchweek": m["matchweek"],
            "game_id": m.get("game_id"),
        })

        _add_result(history, home, away, m["date"], hs, as_)

    X = pd.DataFrame(rows, columns=FEATURE_COLS)
    return X, pd.Series(outcomes), pd.Series(hgs), pd.Series(ags), pd.DataFrame(meta)


def build_feature_vector(home: str, away: str, schedule: pd.DataFrame) -> list[float]:
    """
    Feature vector for an arbitrary (home, away) match, using full history as of
    the latest played date. Used at predict time (the match is hypothetical).
    """
    df = schedule.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"]).sort_values(["date", "matchweek"])

    history: dict[str, list[dict]] = {}
    for _, m in df.iterrows():
        hs, as_ = m["home_score"], m["away_score"]
        if hs is None or as_ is None:
            continue
        _add_result(history, m["home_team"], m["away_team"], m["date"], hs, as_)

    return _match_features(home, away, history, None)
