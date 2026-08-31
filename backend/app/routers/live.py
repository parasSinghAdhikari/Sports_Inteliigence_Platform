"""
M12 — Live data API (PHASE 26 + 27).

Exposes football-data.org (free tier) behind a TTL cache:
  GET /api/live/status     - config + cache TTL info (frontend banner)
  GET /api/live/fixtures   - upcoming fixtures (SCHEDULED/TIMED)
  GET /api/live/results    - delayed scores (FINISHED)
  GET /api/live/table      - league table (standings)
  GET /api/live/schedule   - full season match schedule

Honest naming: the free plan is DELAYED, not real-time, so no endpoint pretends
to be a live-score feed. If FOOTBALL_DATA_API_KEY is unset, endpoints return a
readable 503 (mirrors the untrained-model guard in predictions.py).
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import settings
from app.services import football_data

router = APIRouter()

NOT_CONFIGURED_MSG = (
    "Live data not configured - set FOOTBALL_DATA_API_KEY in .env "
    "(get a free key at https://www.football-data.org/client/register)"
)


def _require_client() -> football_data.FootballDataClient:
    """Return the shared client or raise a readable 503 when unconfigured."""
    client = football_data.get_client()
    if client is None:
        raise HTTPException(status_code=503, detail=NOT_CONFIGURED_MSG)
    return client


def _normalise_match(m: dict) -> dict:
    """Map a football-data.org match object to the frontend's existing shape."""
    return {
        "id": m.get("id"),
        "matchday": m.get("matchday"),
        "date": m.get("utcDate"),
        "status": m.get("status"),
        "home_team": (m.get("homeTeam") or {}).get("name"),
        "away_team": (m.get("awayTeam") or {}).get("name"),
        "score": (m.get("score") or {}).get("fullTime"),
    }


def _normalise_table(table: list) -> list:
    """Map a football-data.org standings table row to a friendly dict."""
    rows = []
    for r in table:
        rows.append({
            "position": r.get("position"),
            "team": (r.get("team") or {}).get("name"),
            "played": r.get("playedGames"),
            "wins": r.get("won"),
            "draws": r.get("draw"),
            "losses": r.get("lost"),
            "goals_for": r.get("goalsFor"),
            "goals_against": r.get("goalsAgainst"),
            "goal_diff": r.get("goalDifference"),
            "points": r.get("points"),
        })
    return rows


@router.get("/status")
def live_status():
    """Config + cache info so the frontend can show a setup banner."""
    return {
        "configured": football_data.is_configured(),
        "competition_id": settings.FOOTBALL_DATA_COMPETITION_ID,
        "cache_ttl": {
            "fixtures": settings.FIXTURES_CACHE_TTL,
            "table": settings.LEAGUE_TABLE_CACHE_TTL,
        },
        "note": "Free tier provides delayed scores/schedules only (not real-time).",
    }


@router.get("/fixtures")
def live_fixtures(
    matchday: int = Query(None),
    date_from: str = Query(None, alias="date_from"),
    date_to: str = Query(None, alias="date_to"),
    status: str = Query("SCHEDULED", pattern="^(SCHEDULED|TIMED|FINISHED)$"),
):
    """Upcoming fixtures (free tier: not live, just scheduled/delayed)."""
    client = _require_client()
    data = client.matches(
        status=status, matchday=matchday, date_from=date_from, date_to=date_to
    )
    fixtures = [_normalise_match(m) for m in data.get("matches", [])]
    comp = (data.get("competition") or {}).get("name")
    return {
        "competition": comp,
        "generated": True,
        "count": len(fixtures),
        "cache": {
            "hits": client.cache_hits,
            "misses": client.cache_misses,
        },
        "fixtures": fixtures,
    }


@router.get("/results")
def live_results(
    matchday: int = Query(None),
    date_from: str = Query(None, alias="date_from"),
    date_to: str = Query(None, alias="date_to"),
    limit: int = Query(20, le=50),
):
    """Delayed scores for finished matches (NOT real-time)."""
    client = _require_client()
    data = client.matches(
        status="FINISHED", matchday=matchday, date_from=date_from, date_to=date_to
    )
    results = [_normalise_match(m) for m in data.get("matches", [])]
    # Most recent first (free API returns chronological order).
    results = sorted(results, key=lambda m: m["date"] or "", reverse=True)[:limit]
    comp = (data.get("competition") or {}).get("name")
    return {
        "competition": comp,
        "count": len(results),
        "results": results,
    }


@router.get("/table")
def live_table(table_type: str = Query("TOTAL", pattern="^(TOTAL|HOME|AWAY)$")):
    """League table from the standings endpoint."""
    client = _require_client()
    data = client.standings()

    standings = data.get("standings", [])
    chosen = next((s for s in standings if (s.get("type") or "").upper() == table_type), None)
    if chosen is None and standings:
        chosen = standings[0]

    rows = _normalise_table((chosen or {}).get("table", []))
    comp = (data.get("competition") or {}).get("name")
    return {
        "competition": comp,
        "table_type": table_type,
        "season": (data.get("season") or {}).get("startDate"),
        "count": len(rows),
        "table": rows,
    }


@router.get("/schedule")
def live_schedule():
    """Full season match schedule (fixtures + results)."""
    client = _require_client()
    data = client.matches()
    matches = [_normalise_match(m) for m in data.get("matches", [])]
    comp = (data.get("competition") or {}).get("name")
    return {
        "competition": comp,
        "count": len(matches),
        "matches": matches,
    }