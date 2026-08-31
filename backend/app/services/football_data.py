"""
M12 — football-data.org client + TTL cache (PHASE 26 & 27).

PHASE 26 (live data):
    Wraps the football-data.org v4 API (X-Auth-Token) behind a small client that
    exposes upcoming fixtures, delayed (FINISHED) results, league tables and the
    season schedule.

    The free tier is €0 / 12 competitions / DELAYED scores — NOT real-time. We
    therefore only expose SCHEDULED/TIMED (upcoming) and FINISHED (delayed)
    statuses. There is deliberately NO real-time "live" endpoint.

PHASE 27 (cache live data):
    Every request goes through a thread-safe in-memory TTLCache so browsers never
    hit the external API directly and we stay under the 10 req/min free limit.
    On a failed / rate-limited refresh we return STALE cache rather than breaking
    the UI (stale-while-error). A 503 is only raised when there is neither cache
    nor an API key.

        Browser → /api/live router → FootballDataClient (cache) → api.football-data.org

In-memory (not DB) caching is correct here because Render free tier runs a single
instance, so no cross-instance coherence is required.
"""
from __future__ import annotations

import logging
import threading
import time
from typing import Any

import httpx

from app.config import settings

log = logging.getLogger(__name__)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
# football-data.org v4 competition id for the English Premier League.
DEFAULT_COMPETITION_ID = "2021"


class TTLCache:
    """Simple thread-safe in-memory TTL cache: key -> (expires_at, payload)."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> tuple[Any, bool]:
        """
        Return (payload, stale). stale=True when the entry existed but has
        expired (so callers may fall back to it on a failed refresh).
        """
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None, False
            expires_at, payload = entry
            if time.monotonic() < expires_at:
                return payload, False
        # Expired — do not delete yet (caller may still use it as stale fallback).
        return payload, True

    def put(self, key: str, value: Any, ttl: float) -> None:
        with self._lock:
            self._store[key] = (time.monotonic() + ttl, value)


class FootballDataClient:
    """Thin client over football-data.org v4 with a TTL cache in front."""

    def __init__(
        self,
        api_key: str,
        competition_id: str = DEFAULT_COMPETITION_ID,
        timeout: float = 8.0,
    ) -> None:
        if not api_key:
            raise ValueError("FOOTBALL_DATA_API_KEY is required")
        self.api_key = api_key
        self.competition_id = competition_id
        self.timeout = timeout
        self.cache = TTLCache()
        self.client = httpx.Client(
            base_url=FOOTBALL_DATA_BASE,
            headers={"X-Auth-Token": api_key},
            timeout=timeout,
        )
        # Diagnosability: test_live.py asserts a cache hit on the 2nd identical call.
        self.cache_hits = 0
        self.cache_misses = 0

    # ── Internal ────────────────────────────────────────────────────────────

    def _cache_key(self, endpoint: str, params: dict) -> str:
        # Include every param so different filter combos don't collide.
        bits = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
        return f"{endpoint}?{bits}" if bits else endpoint

    def _get(self, endpoint: str, params: dict, ttl: float) -> Any:
        """Single choke point: cache-first GET with stale-on-error fallback."""
        key = self._cache_key(endpoint, params)

        cached, stale = self.cache.get(key)
        if cached is not None and not stale:
            self.cache_hits += 1
            return cached

        try:
            resp = self.client.get(endpoint, params=params)
            resp.raise_for_status()
        except Exception as exc:  # noqa: BLE001 - always prefer stale cache over a 5xx
            # Rate-limited / network error. Fall back to stale cache if any.
            if cached is not None:
                self.cache_hits += 1
                log.warning("football-data refresh failed (%s) — serving stale cache for %s",
                            exc.__class__.__name__, key)
                return cached
            self.cache_misses += 1
            raise ValueError(f"football-data.org request failed for {endpoint}: {exc}") from exc

        self.cache_misses += 1
        self.cache.put(key, resp.json(), ttl)
        return resp.json()

    # ── Public API ──────────────────────────────────────────────────────────

    def matches(
        self,
        status: str | None = None,
        matchday: int | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        ttl: float | None = None,
    ) -> dict:
        """Matches for the configured competition. statuses: SCHEDULED/TIMED/FINISHED."""
        if ttl is None:
            ttl = settings.FIXTURES_CACHE_TTL
        params = {}
        if status:
            params["status"] = status
        if matchday is not None:
            params["matchday"] = matchday
        if date_from:
            params["dateFrom"] = date_from
        if date_to:
            params["dateTo"] = date_to
        return self._get(f"/competitions/{self.competition_id}/matches", params, ttl)

    def standings(self, ttl: float | None = None) -> dict:
        """League standings (all table types: TOTAL / HOME / AWAY)."""
        if ttl is None:
            ttl = settings.LEAGUE_TABLE_CACHE_TTL
        return self._get(f"/competitions/{self.competition_id}/standings", {}, ttl)

    def competition(self, ttl: float = 86400) -> dict:
        """Competition metadata (name / season). Long cache (1 day)."""
        return self._get(f"/competitions/{self.competition_id}", {}, ttl)

    def close(self) -> None:
        self.client.close()


# Lazy module-level singleton, mirroring database._get_pool().

_client: FootballDataClient | None = None
_client_lock = threading.Lock()


def is_configured() -> bool:
    """True when an API key is present (endpoints can be served)."""
    return bool(settings.FOOTBALL_DATA_API_KEY)


def get_client() -> FootballDataClient | None:
    """Return the shared client, or None when no API key is configured."""
    global _client
    if not is_configured():
        return None
    if _client is None:
        with _client_lock:
            if _client is None:
                _client = FootballDataClient(
                    api_key=settings.FOOTBALL_DATA_API_KEY,
                    competition_id=settings.FOOTBALL_DATA_COMPETITION_ID,
                )
    return _client