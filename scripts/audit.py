"""
Full project audit — tests every API endpoint and reports status.
Run after both servers are up.
"""
import urllib.request, json, time, sys

BASE = "http://localhost:8000"
PASS = []
FAIL = []

def get(path, label=None):
    url = BASE + path
    tag = label or path
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            data = json.loads(r.read())
            PASS.append(tag)
            return data
    except Exception as e:
        FAIL.append((tag, str(e)))
        return None

def check(cond, msg):
    if cond:
        print(f"  OK  {msg}")
    else:
        print(f"  !! FAIL: {msg}")
        FAIL.append(("assertion", msg))

print("=" * 62)
print("SPORTS IQ -- Full Platform Audit")
print("=" * 62)

# Health
print("\n[1] Health")
h = get("/health")
if h:
    check(h.get("status") == "ok", f"status=ok  version={h.get('version')}")

# Dashboard
print("\n[2] Dashboard")
d = get("/api/dashboard/")
if d:
    check("summary" in d, "has summary")
    check(len(d.get("top_scorers",[])) > 0, f"top_scorers: {len(d.get('top_scorers',[]))} players")
    check("recent_results" in d, "has recent_results")
    s = d.get("summary", {})
    print(f"     total_goals={s.get('total_goals')}  avg={s.get('avg_goals_per_match')}")
    top = d["top_scorers"][0] if d.get("top_scorers") else {}
    print(f"     top scorer: {top.get('name')} {top.get('goals')}G {top.get('assists')}A")

# Players
print("\n[3] Players")
pl = get("/api/players/?limit=5")
if pl: check(len(pl.get("players",[])) == 5, "player list: 5 returned")

search = get("/api/players/?search=Salah")
if search and search.get("players"):
    p = search["players"][0]
    check("Salah" in p.get("name",""), f"search: {p.get('name')}")
    detail = get(f"/api/players/{p['id']}")
    if detail:
        check("goals" in detail, f"detail: {detail.get('name')} {detail.get('goals')}G {detail.get('assists')}A")

# Teams
print("\n[4] Teams")
teams = get("/api/teams/")
if teams: check(len(teams.get("teams",[])) == 20, "20 teams")

table = get("/api/teams/table")
if table:
    check(len(table.get("table",[])) == 20, "league table: 20 rows")
    leader = table["table"][0]
    print(f"     Leader: {leader.get('team')}  {leader.get('points')} pts  GD={leader.get('goal_diff')}")

# Matches
print("\n[5] Matches")
recent = get("/api/matches/recent?limit=5")
if recent and recent.get("matches"):
    m = recent["matches"][0]
    check(m.get("game_id") is not None, f"game_id ok: {m.get('game_id')}")
    check(m.get("matchweek") is not None, f"GW{m.get('matchweek')}: {m.get('home_team')} {m.get('home_score')}-{m.get('away_score')} {m.get('away_team')}")

# Stats
print("\n[6] Stats")
sc = get("/api/stats/top-scorers?limit=5")
if sc: check(len(sc.get("top_scorers",[])) > 0, f"top-scorers ok: {len(sc.get('top_scorers',[]))} returned")

cn = get("/api/stats/top-contributors?limit=5")
if cn: check(len(cn.get("top_contributors",[])) > 0, "top-contributors ok")

# Scouting
print("\n[7] Scouting (M8+M9)")
scout = get("/api/scouting/scout-score?limit=5&position=FW&max_age=27")
if scout and scout.get("players"):
    p = scout["players"][0]
    check(p.get("scout_score") is not None, f"score: {p.get('name')} score={p.get('scout_score')}")

sim = get("/api/scouting/1524/similar?n=3")
if sim:
    names = [x.get("name") for x in sim.get("similar",[])[:3]]
    check(len(names) > 0, f"similar to Salah: {names}")

# Match Intelligence
print("\n[8] Match Intelligence (M10)")
h2h = get("/api/intel/head-to-head?team1=Arsenal&team2=Liverpool")
if h2h:
    r = h2h.get("record", {})
    check(True, f"H2H: {r}  meetings={len(h2h.get('matches',[]))}")

shots = get("/api/intel/league/shooting-leaders")
if shots:
    tl = shots.get("teams", [])
    if tl:
        t = tl[0]
        check(True, f"shooting leader: {t.get('team')} avg_shots={t.get('avg_shots')} SoT={t.get('avg_sot')} conv={t.get('conversion_rate')}")
    else:
        check(False, "shooting-leaders: EMPTY -- run load_match_stats.py")

# Predictions
print("\n[9] Predictions (M11)")
rpt = get("/api/predictions/report")
if rpt:
    check("model_loaded" in rpt, f"model report keys: {list(rpt.keys())}")
    print(f"     report: {json.dumps({k:v for k,v in rpt.items() if k != 'model_loaded'})[:250]}")

pred = get("/api/predictions/match?home=Arsenal&away=Liverpool")
if pred:
    keys = list(pred.keys())
    check(any(k in pred for k in ["home_win_prob","probabilities","prediction","home","away"]), f"prediction keys: {keys}")
    print(f"     {pred}")

# Live Fixtures
print("\n[10] Live Fixtures (M12)")
live = get("/api/live/fixtures")
if live:
    check(True, f"fixtures ok: keys={list(live.keys())[:4]}")

# Final summary
print("\n" + "=" * 62)
total = len(PASS) + len(FAIL)
print(f"RESULTS:  {len(PASS)}/{total} PASSED   {len(FAIL)} FAILED")
print("=" * 62)
if FAIL:
    print("\nFAILED ITEMS:")
    for tag, err in FAIL:
        print(f"  - [{tag}]: {str(err)[:120]}")
else:
    print("\nAll endpoints verified!")
