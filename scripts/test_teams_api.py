"""Verify team season stats are correctly in DB and API."""
import urllib.request, json

def get(path):
    with urllib.request.urlopen("http://localhost:8000" + path) as r:
        return json.loads(r.read())

# Teams list
teams = get("/api/teams/")["teams"]
print("=== ALL 20 TEAMS WITH SEASON STATS ===")
print(f"  {'Team':<20} {'Players':>7} {'Age':>5} {'Poss%':>6} {'Goals':>6} {'Ast':>4} {'G/90':>5}")
print("  " + "-" * 55)
for t in teams:
    print(
        f"  {t['name']:<20}"
        f" {str(t['players_used']):>7}"
        f" {str(t['avg_age']):>5}"
        f" {str(t['avg_possession']):>6}"
        f" {str(t['goals']):>6}"
        f" {str(t['assists']):>4}"
        f" {str(t['goals_per90']):>5}"
    )

print()

# Single team profile (Arsenal = id 1)
t = get("/api/teams/1")
team = t["team"]
print(f"=== TEAM PROFILE: {team['name']} ===")
print(f"  avg_possession : {team['avg_possession']}%")
print(f"  goals / assists: {team['goals']} / {team['assists']}")
print(f"  squad size     : {len(t['squad'])} players")
print(f"  recent results : {len(t['recent_results'])}")
for r in t["recent_results"][:3]:
    print(f"    {r['home_team']:18s} {r['home_score']}-{r['away_score']} {r['away_team']}")
