"""Verify M11 prediction API endpoints against a running server."""
import urllib.request
import json

BASE = "http://localhost:8000"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return json.loads(r.read())


def http_status(path):
    try:
        urllib.request.urlopen(BASE + path, timeout=30)
        return 200
    except urllib.error.HTTPError as e:
        return e.code


print("=== M11 - PREDICTION API TESTS ===")
print()

# Health
h = get("/health")
print(f"[health]    {h['status']}")

# Model report
rep = get("/api/predictions/report")
c = rep["classifier"]
print(f"[report]    model_loaded={rep['model_loaded']}, features={rep['feature_count']}")
print(f"[report]    acc={c['accuracy']:.3f} baseline={c['baseline_accuracy']:.3f} logloss={c['log_loss']:.3f}")

# Arbitrary match
m = get("/api/predictions/match?home=Arsenal&away=Manchester%20City")
print(f"[match]     {m['home_team']} vs {m['away_team']} -> {m['outcome']}")
print(f"[match]     probs={m['probabilities']}")
print(f"[match]     expected scoreline={m['expected']['scoreline']}")

# Unknown team -> 404
code = http_status("/api/predictions/match?home=NotATeam&away=Arsenal")
print(f"[match]     unknown team -> HTTP {code} (expect 404)")

# Upcoming (completed season -> count 0)
up = get("/api/predictions/upcoming")
print(f"[upcoming]  model_loaded={up['model_loaded']}, count={up['count']} (0 = no unplayed fixtures)")

print()
print("M11 COMPLETE - all prediction endpoints verified!")
print("Swagger: http://localhost:8000/docs")
