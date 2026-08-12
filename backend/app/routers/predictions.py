"""
M11 — Match-outcome prediction API.

Exposes the trained model (see scripts/train_model.py) as three endpoints:
  GET /api/predictions/upcoming   - predict all unplayed fixtures
  GET /api/predictions/match      - predict an arbitrary (home, away) pair
  GET /api/predictions/report     - training metrics / model health

If the model hasn't been trained yet, endpoints degrade gracefully with a
readable 503 message (mirrors the match_intelligence.py pattern).
"""
import json
import sys
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db

# Repo-root import shim so `import ml.*` resolves from anywhere.
ROOT = Path(__file__).resolve().parents[3]      # .../sports-intelligence-platform
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
import ml.predict as P

router = APIRouter()

MODELS_DIR = ROOT / "ml" / "models"
NOT_TRAINED_MSG = "Prediction model not trained - run scripts/train_model.py first"

_models = None


def _get_models():
    """Lazily load (and cache) the trained model artifacts; None if missing."""
    global _models
    if _models is None:
        _models = P.load_models(MODELS_DIR)
    return _models


def _load_schedule(db) -> pd.DataFrame:
    """Pull the full schedule from the DB as a DataFrame for feature building."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT m.id, m.matchweek, m.match_date AS date,
                   ht.name AS home_team, m.home_score,
                   at.name AS away_team, m.away_score,
                   m.game_id
            FROM matches m
            JOIN teams ht ON ht.id = m.home_team_id
            JOIN teams at ON at.id = m.away_team_id
            ORDER BY m.match_date
        """)
        rows = [dict(r) for r in cur.fetchall()]
    return pd.DataFrame(rows)


def _valid_team_names(schedule: pd.DataFrame) -> set:
    return set(schedule["home_team"]).union(schedule["away_team"])


def _require_models():
    models = _get_models()
    if models is None:
        raise HTTPException(status_code=503, detail=NOT_TRAINED_MSG)
    return models


@router.get("/upcoming")
def predict_upcoming(db=Depends(get_db)):
    """Predict all fixtures in the DB where the score is not yet recorded."""
    models = _require_models()
    schedule = _load_schedule(db)
    fixtures = P.predict_upcoming(schedule, models)
    return {"model_loaded": True, "count": len(fixtures), "fixtures": fixtures}


@router.get("/match")
def predict_match(
    home: str = Query(..., description="Home team name (exact)"),
    away: str = Query(..., description="Away team name (exact)"),
    db=Depends(get_db),
):
    """Predict an arbitrary (home, away) fixture."""
    models = _require_models()
    schedule = _load_schedule(db)
    names = _valid_team_names(schedule)

    if home not in names:
        raise HTTPException(status_code=404, detail=f"Unknown team: {home}")
    if away not in names:
        raise HTTPException(status_code=404, detail=f"Unknown team: {away}")

    result = P.predict_match(home, away, schedule, models)
    return {"model_loaded": True, **result}


@router.get("/report")
def prediction_report():
    """Return persisted training metrics and model health."""
    report_path = MODELS_DIR / "report.json"
    if not report_path.exists():
        raise HTTPException(status_code=503, detail=NOT_TRAINED_MSG)
    report = json.loads(report_path.read_text(encoding="utf-8"))
    return {"model_loaded": True, **report}
