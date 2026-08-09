"""Verify M8 (similar players) and M9 (scout score) endpoints."""
import urllib.request, json

def get(url):
    with urllib.request.urlopen(url, timeout=15) as r:
        return json.loads(r.read())

BASE = "http://localhost:8000"

# ── M9: Scout Score ───────────────────────────────────────────────────────────
print("=" * 55)
print("M9 — TOP 10 SCOUT SCORES (FW, max age 27)")
print("=" * 55)
d = get(f"{BASE}/api/scouting/scout-score?limit=10&position=FW&max_age=27&min_minutes=500")
for p in d["players"]:
    print(f"  {p['scout_score']:5.1f}  {p['name']:<24} {p['team']:<18} Age:{p['age']}  {p['goals']}G {p['assists']}A  {p['goal_contributions_per90']:.2f}/90")

print()
print("=" * 55)
print("M9 — TOP 10 SCOUT SCORES (All positions, max age 25)")
print("=" * 55)
d2 = get(f"{BASE}/api/scouting/scout-score?limit=10&max_age=25&min_minutes=500")
for p in d2["players"]:
    print(f"  {p['scout_score']:5.1f}  {p['name']:<24} {p['position']:<3} {p['team']:<18} Age:{p['age']}")

print()
print("=" * 55)
print("M8 — SIMILAR PLAYERS TO SALAH")
print("=" * 55)
pl = get(f"{BASE}/api/players/?search=Salah")
salah_id = pl["players"][0]["id"]
sim = get(f"{BASE}/api/scouting/{salah_id}/similar?n=6")
print(f"Reference: {sim['player']['name']} ({sim['player']['team']}) — {sim['player']['goals']}G {sim['player']['assists']}A")
print()
for p in sim["similar"]:
    print(f"  {p['similarity']:5.1f}%  {p['name']:<26} {p['team']:<18} {p['goals']}G {p['assists']}A")

print()
print("=" * 55)
print("M8 — SIMILAR PLAYERS TO HAALAND")
print("=" * 55)
pl2 = get(f"{BASE}/api/players/?search=Haaland")
hid = pl2["players"][0]["id"]
sim2 = get(f"{BASE}/api/scouting/{hid}/similar?n=5")
print(f"Reference: {sim2['player']['name']} ({sim2['player']['team']})")
for p in sim2["similar"]:
    print(f"  {p['similarity']:5.1f}%  {p['name']:<26} {p['team']:<18} {p['goals']}G {p['assists']}A")

print()
print("M8 + M9 COMPLETE — All scouting endpoints verified!")
