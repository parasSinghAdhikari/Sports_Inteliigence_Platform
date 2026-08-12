"""
M11 — Inference for the match-outcome prediction model.

Loads the artifacts saved by ``ml.train.run_full_training`` and produces
predictions for upcoming or arbitrary fixtures: an H/D/A outcome with calibrated
probabilities, plus an expected-goals scoreline derived from two Poisson models.
"""
from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.stats import poisson

import ml.features as F

log = logging.getLogger(__name__)

MAX_GOALS = 6          # upper bound for the scoreline grid
MODEL_FILES = ("classifier.joblib", "goals_home.joblib", "goals_away.joblib")


def load_models(model_dir: Path | str):
    """
    Load all model artifacts. Returns a dict (clf, eg_home, eg_away, feature_cols)
    or None if any artifact is missing. Result is cached.
    """
    model_dir = Path(model_dir)
    if not all((model_dir / f).exists() for f in MODEL_FILES):
        return None

    models = {
        "clf": joblib.load(model_dir / "classifier.joblib"),
        "eg_home": joblib.load(model_dir / "goals_home.joblib"),
        "eg_away": joblib.load(model_dir / "goals_away.joblib"),
        "feature_cols": joblib.load(model_dir / "feature_cols.joblib"),
    }
    # Defensive: ensure feature order matches what we build.
    if list(models["feature_cols"]) != F.FEATURE_COLS:
        log.warning("Feature column order mismatch between saved model and module.")
    return models


def _expected_scoreline(models: dict, x: np.ndarray) -> dict:
    """Expected goals + most-likely scoreline + win probs from the Poisson pair."""
    lh = float(np.clip(models["eg_home"].predict(x)[0], 0.02, None))
    la = float(np.clip(models["eg_away"].predict(x)[0], 0.02, None))

    grid = np.arange(0, MAX_GOALS + 1)
    p_home = poisson.pmf(grid, lh)[:, None]
    p_away = poisson.pmf(grid, la)[None, :]
    joint = p_home * p_away

    h_idx, a_idx = np.unravel_index(np.argmax(joint), joint.shape)
    scoreline_prob = float(joint[h_idx, a_idx])

    home_win = joint[np.triu_indices(MAX_GOALS + 1, k=1)].sum()
    draw = np.trace(joint)
    away_win = joint[np.tril_indices(MAX_GOALS + 1, k=-1)].sum()
    total = home_win + draw + away_win

    return {
        "home_goals": round(lh, 2),
        "away_goals": round(la, 2),
        "scoreline": f"{int(h_idx)}-{int(a_idx)}",
        "scoreline_prob": round(scoreline_prob, 4),
        "win_probs": {
            "H": round(home_win / total, 4),
            "D": round(draw / total, 4),
            "A": round(away_win / total, 4),
        },
    }


def _predict_row(models: dict, home: str, away: str, schedule: pd.DataFrame,
                 match_meta: dict | None = None) -> dict:
    """Build features and predict a single (home, away) match."""
    # DataFrame with the same column names used at train time (avoids sklearn
    # "X does not have feature names" warnings).
    x = pd.DataFrame(
        [F.build_feature_vector(home, away, schedule)],
        columns=models["feature_cols"],
    )

    proba = models["clf"].predict_proba(x)[0]   # order: [H, D, A]
    classes = models["clf"].classes_             # encode 0=H,1=D,2=A
    order = ["H", "D", "A"][: len(classes)]
    probabilities = {lab: round(float(proba[i]), 4) for i, lab in enumerate(order)}
    outcome = F.OUTCOME_LABELS[int(models["clf"].predict(x)[0])]

    expected = _expected_scoreline(models, x)

    result = {
        "home_team": home,
        "away_team": away,
        "outcome": outcome,
        "probabilities": probabilities,
        "expected": expected,
    }
    if match_meta:
        result.update(match_meta)
    return result


def predict_match(home: str, away: str, schedule: pd.DataFrame, models: dict) -> dict:
    """Predict an arbitrary (home, away) fixture."""
    return _predict_row(models, home, away, schedule)


def predict_upcoming(schedule: pd.DataFrame, models: dict) -> list[dict]:
    """Predict all unplayed fixtures (rows where scores are NULL)."""
    df = schedule.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    upcoming = df[df["home_score"].isna() | df["away_score"].isna()].sort_values("date")

    results = []
    for _, m in upcoming.iterrows():
        meta = {
            "match_id": m.get("id"),
            "matchweek": m.get("matchweek"),
            "match_date": str(m["date"].date()) if pd.notna(m["date"]) else None,
            "game_id": m.get("game_id"),
        }
        results.append(_predict_row(models, m["home_team"], m["away_team"], df, meta))
    return results
