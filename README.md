# ⚽ SportsIQ — Premier League Intelligence Platform

> Real FBref data · FastAPI backend · React frontend · ML predictions

A full-stack sports analytics platform built with real **Premier League 2024-25** data scraped from FBref. Features a dark-mode React dashboard, REST API, cosine-similarity player comparison, composite Scout Score, match-outcome predictions, and live fixture integration.

---

## 🖥️ Live Demo

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |

---

## 🗺️ Pages

| Page | Description |
|------|-------------|
| ⚡ Dashboard | League table, top scorers, top assists, recent results |
| 👤 Players | 574 players — sortable, searchable, position-filtered |
| 🛡️ Teams | All 20 clubs — card grid + table toggle, team profile modal |
| ⚖️ Compare | Live autocomplete head-to-head player comparison |
| 🔭 Scouting | Scout Score (0-100) ranking + Similar Player finder |
| 🏆 Matches | 380 results with per-match shot/foul/card stats + H2H |
| 🔮 Predict | ML match-outcome predictor (GradientBoosting + calibration) |
| 📅 Fixtures | Live upcoming fixtures via football-data.org |

---

## 🏗️ Architecture

```
FBref (soccerdata)
       ↓
  scripts/extract_*.py     ← raw parquet files
       ↓
  scripts/transform_data.py ← cleaned parquet
       ↓
  scripts/load_database.py  ← Neon PostgreSQL
       ↓
  backend/ (FastAPI)        ← REST API :8000
       ↓
  frontend/ (React/Vite)    ← UI :5173
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node 18+
- A [Neon](https://neon.tech) PostgreSQL database (free tier)

### 1. Clone & install

```bash
git clone https://github.com/yourusername/sports-intelligence-platform
cd sports-intelligence-platform

python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set:
#   DATABASE_URL=postgresql://...   (Neon connection string)
#   FOOTBALL_DATA_API_KEY=...       (optional, for live fixtures)
```

### 3. Load data

```bash
# Extract from FBref (takes ~5-10 min first time)
python scripts/extract_fbref.py

# Transform
python scripts/transform_data.py

# Load into Neon
python scripts/load_database.py

# Load per-match stats (shots, fouls, cards)
python scripts/extract_match_stats.py
python scripts/load_match_stats.py

# Train prediction model
python scripts/train_model.py
```

### 4. Run locally

```bash
# Terminal 1 — Backend
$env:PYTHONPATH = "backend"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend --reload

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173**

---

## 🐳 Docker

```bash
# Build and run everything
docker compose up --build

# Backend only
docker compose up backend
```

- Frontend → http://localhost:80
- Backend  → http://localhost:8000

---

## ☁️ Deploy to Railway (free tier)

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select your repo
4. Add env vars: `DATABASE_URL`, optionally `FOOTBALL_DATA_API_KEY`
5. Railway auto-detects `railway.toml` → deploys in ~2 min

For the frontend, deploy to **Vercel**:
```bash
cd frontend
npx vercel --prod
# Set VITE_API_URL=https://your-railway-app.up.railway.app
```

---

## 📊 Data

| Source | Method | Records |
|--------|--------|---------|
| FBref | soccerdata | 574 players, 380 matches, 20 teams |
| football-data.org | REST API | Live fixtures (free tier, delayed) |

All data is 2024-25 Premier League season.

---

## 🤖 ML Model

- **Algorithm**: Gradient Boosting Classifier (calibrated with isotonic regression)
- **Features**: 38 engineered features — rolling form (3/5/10 games), home/away rates, goal difference, possession, shots on target rate
- **Training split**: 250 train / 70 val / 60 test matches
- **Output**: Win/Draw/Loss probabilities + expected scoreline

---

## 🔭 Scout Score Formula

```
Scout Score (0-100) =
  weighted per-90 rates (G 30%, A 20%, G+A/90 25%, NP goals 15%, NP G+A 10%)
  × age multiplier (23-28y peak bonus up to +10%)
  × minutes confidence (≥900 min = 1.0, scaled below)
```

---

## 📁 Project Structure

```
├── backend/              FastAPI application
│   └── app/
│       ├── routers/      9 API routers
│       ├── database.py   psycopg2 connection pool
│       └── config.py     pydantic-settings
├── frontend/             Vite + React
│   └── src/pages/        8 page components
├── ml/                   Feature engineering + model
│   ├── features.py
│   ├── train.py
│   ├── predict.py
│   └── models/           Trained artifacts (.joblib + report.json)
├── scripts/              ETL + training scripts
├── data/processed/       Parquet files
├── Dockerfile
├── docker-compose.yml
├── railway.toml
└── .env.example
```

---

## 📜 License

MIT — use freely, attribution appreciated.
