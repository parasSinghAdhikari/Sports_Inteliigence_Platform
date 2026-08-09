"""Quick verification of M10 API endpoints."""
import urllib.request, json

def get(url):
    with urllib.request.urlopen(url, timeout=12) as r:
        return json.loads(r.read())

BASE = "http://localhost:8000"

# Match list
m = get(f"{BASE}/api/matches/recent?limit=5")
cnt = len(m["matches"])
print(f"  /matches/recent  : {cnt} matches OK")
for match in m["matches"][:2]:
    print(f"    GW{match['matchweek']} {match['home_team']} {match['home_score']}-{match['away_score']} {match['away_team']}  id={match.get('game_id')}")

# H2H
h = get(f"{BASE}/api/intel/head-to-head?team1=Arsenal&team2=Liverpool")
print(f"\n  H2H Arsenal vs Liverpool: {h['record']}")
for match in h["matches"]:
    print(f"    W{match['matchweek']} {match['home_team']} {match['home_score']}-{match['away_score']} {match['away_team']}")

# Shooting leaders (empty until match_stats loaded)
s = get(f"{BASE}/api/intel/league/shooting-leaders")
print(f"\n  Shooting leaders: {len(s['teams'])} teams (0 = match_stats not yet loaded)")

print("\nAll M10 API routes responding OK.")
