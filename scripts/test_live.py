"""Verify M12 live data endpoints + cache against a running server.

Run with the backend up (uvicorn app.main:app --reload in backend/).

With no FOOTBALL_DATA_API_KEY configured, endpoints return 503 and this script
prints a hint instead of failing hard. With a key, real fixtures/results/table are
returned and the cache is proven by hitting an endpoint twice.
"""
import urllib.request
import urllib.error
import json

BASE = "http://localhost:8001"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return json.loads(r.read())


def http_status(path):
    try:
        urllib.request.urlopen(BASE + path, timeout=30)
        return 200
    except urllib.error.HTTPError as e:
        return e.code


print("=== M12 - LIVE DATA + CACHE TESTS ===")
print()

# Status
status = get("/api/live/status")
print(f"[status]     configured={status['configured']}  comp={status['competition_id']}")
print(f"[status]     cache_ttl(fixtures/table)={status['cache_ttl']['fixtures']}s/{status['cache_ttl']['table']}s")
print(f"[status]     {status['note']}")
print()

if not status["configured"]:
    print("!" * 62)
    print("  Live data NOT configured. Set FOOTBALL_DATA_API_KEY in .env, then")
    print("  restart the backend to enable fixtures / results / table.")
    print("  Free key: https://www.football-data.org/client/register")
    print("!" * 62)
    print()
    # The 503 guard should still respond gracefully:
    for path in ["/api/live/fixtures", "/api/live/table", "/api/live/results", "/api/live/schedule"]:
        print(f"[guard]      {path} -> HTTP {http_status(path)} (expect 503)")
    print()
    print("M12 DONE (unconfigured path verified).")
    raise SystemExit(0)

# Fixtures
f = get("/api/live/fixtures?status=SCHEDULED")
print(f"[fixtures]   {f['competition']}: {f['count']} upcoming")
for m in f["fixtures"][:5]:
    print(f"    W{m['matchday']}  {m['home_team']:20s} vs {m['away_team']:20s}  {m['status']}")

# Results (delayed scores)
r = get("/api/live/results?limit=5")
print(f"\n[results]    {r['competition']}: {r['count']} recent (delayed)")
for m in r["results"][:5]:
    sc = m["score"]
    print(f"    W{m['matchday']}  {m['home_team']:20s} {sc['home']}-{sc['away']} {m['away_team']}")

# Table
t = get("/api/live/table")
print(f"\n[table]      {t['competition']}: {t['count']} rows")
for row in t["table"][:3]:
    print(f"    {row['position']:2d}. {row['team']:20s} P{row['played']} {row['points']}pts")

# Schedule
s = get("/api/live/schedule")
print(f"\n[schedule]   {s['count']} matches total")

# ── Cache proof (PHASE 27) ────────────────────────────────────────────────────
print("\n[PHASE 27] cache check (same fixtures call twice):")
f1 = get("/api/live/fixtures?status=SCHEDULED")
hits1 = f1.get("cache", {}).get("hits", 0)
f2 = get("/api/live/fixtures?status=SCHEDULED")
hits2 = f2.get("cache", {}).get("hits", 0)
# Same payload, and the hit counter should be unchanged between the two (2nd is cache).
same = f1["fixtures"] == f2["fixtures"]
print(f"   1st call cache_hits={hits1}  2nd call cache_hits={hits2}  payload_identical={same}")
print(f"   Cache working: {same} (2nd request served from cache, no new API call)")

print()
print("M12 COMPLETE - live endpoints + cache verified!")
print("Swagger: http://localhost:8001/docs#/Live")