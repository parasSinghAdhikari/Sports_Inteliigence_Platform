"""
M11 — Training for the match-outcome prediction model.

Primary target  : H/D/A classifier (GradientBoosting, calibrated).
Secondary target: expected home/away goals (two Poisson regressions) used to
                   produce an expected scoreline.

Time-based, leak-safe split: train on matchweeks <= 25, validate 26..32, held-out
test 33..38. All hyperparameters/selection use train+val only.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression, PoissonRegressor
from sklearn.metrics import (accuracy_score, balanced_accuracy_score,
                             confusion_matrix, log_loss, mean_absolute_error,
                             root_mean_squared_error)

import ml.features as F

log = logging.getLogger(__name__)

TRAIN_MAX_WEEK = 25
VAL_MAX_WEEK = 32   # train = <=25, val = 26..32, test = 33..38

GBC_PARAMS = dict(
    n_estimators=150, learning_rate=0.1, max_depth=2,
    min_samples_leaf=10, subsample=0.9, random_state=42,
)
LR_PARAMS = dict(C=1.0, max_iter=2000, random_state=42)


def _split_weeks(meta: pd.DataFrame):
    """Return (train_idx, val_idx, test_idx) as boolean masks by matchweek."""
    mw = meta["matchweek"].fillna(0).astype(int).values
    train = mw <= TRAIN_MAX_WEEK
    val = (mw > TRAIN_MAX_WEEK) & (mw <= VAL_MAX_WEEK)
    test = mw > VAL_MAX_WEEK
    return train, val, test


def _balanced_sample_weight(y: pd.Series) -> np.ndarray:
    """Sample weights inversely proportional to class frequency."""
    counts = y.value_counts()
    weight = y.map(lambda c: len(y) / (len(counts) * counts[c])).to_numpy()
    return weight


def _score_classifier(clf, X, y_true):
    """Return classification metrics for a fitted model on a held-out set."""
    y_pred = clf.predict(X)
    proba = clf.predict_proba(X)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "log_loss": float(log_loss(y_true, proba, labels=[0, 1, 2])),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=[0, 1, 2]).tolist(),
    }


def _score_goals(model, X, y_true):
    pred = model.predict(X)
    mae = mean_absolute_error(y_true, pred)
    rmse = root_mean_squared_error(y_true, pred)
    if pred.std() > 0 and y_true.std() > 0:
        pearson = float(np.corrcoef(pred, y_true)[0, 1])
    else:
        pearson = None
    return {
        "mae": float(mae),
        "rmse": float(rmse),
        "pearson_r": pearson,
        "mean_predicted": float(pred.mean()),
        "mean_actual": float(y_true.mean()),
    }


def train_classifier(X: pd.DataFrame, y: pd.Series, meta: pd.DataFrame) -> tuple:
    """Fit the calibrated GBM on train+val, return (model, report)."""
    tr, val, te = _split_weeks(meta)
    tr_val = tr | val
    X_tr_val, y_tr_val = X[tr_val], y[tr_val]
    X_te, y_te = X[te], y[te]

    sw = _balanced_sample_weight(y_tr_val)

    base = GradientBoostingClassifier(**GBC_PARAMS)
    cal = CalibratedClassifierCV(estimator=base, cv=3, method="isotonic")
    cal.fit(X_tr_val, y_tr_val, sample_weight=sw)

    report = _score_classifier(cal, X_te, y_te)

    # Baseline + class distribution for honest context.
    dist = y.value_counts(normalize=True).sort_index().to_dict()
    majority = y.value_counts().idxmax()
    report["baseline_accuracy"] = float((y_te == majority).mean())
    report["class_distribution"] = {str(k): float(v) for k, v in dist.items()}

    # LogisticRegression baseline on the same split (reported only).
    lr = LogisticRegression(**LR_PARAMS)
    lr.fit(X_tr_val, y_tr_val, sample_weight=sw)
    report["lr_accuracy"] = _score_classifier(lr, X_te, y_te)["accuracy"]

    report["n_train"] = int(tr.sum())
    report["n_val"] = int(val.sum())
    report["n_test"] = int(te.sum())

    log.info("Classifier  acc=%.3f bal=%.3f logloss=%.3f (baseline %.3f)",
             report["accuracy"], report["balanced_accuracy"],
             report["log_loss"], report["baseline_accuracy"])
    return cal, report


def train_goals_models(X: pd.DataFrame, y_hg: pd.Series, y_ag: pd.Series,
                       meta: pd.DataFrame) -> tuple:
    """Fit Poisson regressions for home/away expected goals, return (models, report)."""
    tr, val, te = _split_weeks(meta)
    tr_val = tr | val
    # Keep DataFrames (with feature names) so predict-time input matches training.
    X_tr_val = X[tr_val]
    X_te = X[te]

    eg_home = PoissonRegressor(alpha=0.1, max_iter=1000)
    eg_away = PoissonRegressor(alpha=0.1, max_iter=1000)
    eg_home.fit(X_tr_val, y_hg[tr_val].to_numpy())
    eg_away.fit(X_tr_val, y_ag[tr_val].to_numpy())

    report = {
        "home": _score_goals(eg_home, X_te, y_hg[te].to_numpy()),
        "away": _score_goals(eg_away, X_te, y_ag[te].to_numpy()),
    }
    log.info("Goals home  mae=%.3f rmse=%.3f | away mae=%.3f rmse=%.3f",
             report["home"]["mae"], report["home"]["rmse"],
             report["away"]["mae"], report["away"]["rmse"])
    return (eg_home, eg_away), report


def run_full_training(schedule_path: Path | str, out_dir: Path | str) -> dict:
    """Train everything, save artifacts, return the full report dict."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    log.info("Loading schedule: %s", schedule_path)
    schedule = pd.read_parquet(schedule_path)

    X, y_outcome, y_hg, y_ag, meta = F.build_feature_matrix(schedule)
    if X.empty:
        raise ValueError("No completed matches to train on — check schedule data.")

    log.info("Feature matrix: %d rows x %d cols", X.shape[0], X.shape[1])

    clf, clf_report = train_classifier(X, y_outcome, meta)
    (eg_home, eg_away), goals_report = train_goals_models(X, y_hg, y_ag, meta)

    report = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "feature_count": int(X.shape[1]),
        "n_train": clf_report["n_train"],
        "n_val": clf_report["n_val"],
        "n_test": clf_report["n_test"],
        "classifier": {
            "model": "GradientBoostingClassifier(calibrated)",
            "baseline": "LogisticRegression",
            "accuracy": clf_report["accuracy"],
            "balanced_accuracy": clf_report["balanced_accuracy"],
            "log_loss": clf_report["log_loss"],
            "baseline_accuracy": clf_report["baseline_accuracy"],
            "lr_accuracy": clf_report["lr_accuracy"],
            "class_distribution": clf_report["class_distribution"],
            "confusion_matrix": clf_report["confusion_matrix"],
        },
        "goals": {"home": goals_report["home"], "away": goals_report["away"]},
    }

    joblib.dump(clf, out_dir / "classifier.joblib")
    joblib.dump(eg_home, out_dir / "goals_home.joblib")
    joblib.dump(eg_away, out_dir / "goals_away.joblib")
    joblib.dump(F.FEATURE_COLS, out_dir / "feature_cols.joblib")
    (out_dir / "report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8")

    log.info("Saved artifacts to %s", out_dir)
    return report
