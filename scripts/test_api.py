"""Test all FastAPI endpoints against the running server."""
import urllib.request
import json

BASE = "http://localhost:8000"


def get(path):
    with urllib.request.urlopen(BASE + path) as r:
        return json.loads(r.read())


print("=== API ENDPOINT TESTS ===")
print()

# Health
h = get("/health")
print(f"[health]    {h}")

# Dashboard
d = get("/api/dashboard/")
s = d["summary"]
print(f"[dashboard] total_matches={s['total_matches']}, total_goals={s['total_goals']}, avg={s['avg_goals_per_match']}")
print(f"[dashboard] top scorer:  {d['top_scorers'][0]['name']} — {d['top_scorers'][0]['goals']}G")
print(f"[dashboard] top assist:  {d['top_assists'][0]['name']} — {d['top_assists'][0]['assists']}A")
print(f"[dashboard] table top:   {d['table_top6'][0]['team']} — {d['table_top6'][0]['points']}pts")

# Players list
p = get("/api/players/?limit=3")
print(f"[players]   total={p['total']}, first 3: {[x['name'] for x in p['players']]}")

# Player search
ps = get("/api/players/?search=Salah")
print(f"[players]   search=Salah -> {ps['players'][0]['name']} ({ps['players'][0]['team']})")

# Player compare
cmp = get("/api/players/compare/two?player1=Salah&player2=Haaland")
for pl in cmp["players"]:
    print(f"[compare]   {pl['name']:22s} | {pl['goals']}G {pl['assists']}A | {pl['goals_per90']:.2f}/90")

# Teams table
t = get("/api/teams/table")
print(f"[teams]     table rows={len(t['table'])}")
for row in t["table"][:3]:
    print(f"[teams]       {row['team']:20s} {row['points']}pts")

# Team form (team_id=12 = Liverpool)
f = get("/api/teams/12/form?last_n=5")
print(f"[form]      Liverpool last 5: {f['form']}")

# Stats
sc = get("/api/stats/top-scorers?limit=5")
print(f"[stats]     top scorers: {[(x['name'], x['goals']) for x in sc['top_scorers']]}")

ac = get("/api/stats/top-contributors?limit=3")
print(f"[stats]     top G+A/90: {[(x['name'], x['goal_contributions_per90']) for x in ac['top_contributors']]}")

# Matches
m = get("/api/matches/recent?limit=5")
for match in m["matches"]:
    print(f"[matches]   {match['home_team']:18s} {match['home_score']}-{match['away_score']} {match['away_team']}")

print()
print("M5 COMPLETE - All API endpoints verified!")
print("Swagger docs: http://localhost:8000/docs")
