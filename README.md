# ⚽ Sports Intelligence Platform

A full-stack football analytics platform built with Python, FastAPI, PostgreSQL, and React.

> **Status**: 🚧 Active Development — M1 (Data Collection)

---

## 🎯 Overview

Sports Intelligence transforms raw football data into actionable analytics — player comparisons, scout scoring, match intelligence, and outcome predictions.

## 🏗️ Architecture

```
Data Sources (FBref, StatsBomb, football-data.org)
        ↓
ETL Pipeline (Python + Pandas)
        ↓
PostgreSQL Database (Neon)
        ↓
FastAPI Backend (Render)
        ↓
React + Tailwind Frontend (Vercel)
```

## ✨ Features (Planned)

| Feature | Status |
|---|---|
| Dashboard — fixtures, top players, league table | 🔜 |
| Player profiles & performance trends | 🔜 |
| Team profiles & form | 🔜 |
| Player vs Player comparison | 🔜 |
| Similar players engine | 🔜 |
| Scout Score (position-weighted) | 🔜 |
| Match Intelligence | 🔜 |
| Match outcome prediction | 🔜 |
| Live fixtures | 🔜 |

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Data | Python, soccerdata, Pandas, NumPy |
| Database | PostgreSQL (Neon) |
| ORM | SQLAlchemy + Alembic |
| Backend | FastAPI + Pydantic |
| Frontend | React + Vite + Tailwind CSS |
| Charts | Recharts |
| ML | Scikit-learn, XGBoost |
| Deploy | Vercel (FE) + Render (BE) |

## 📊 Data Sources

- **FBref** via [soccerdata](https://soccerdata.readthedocs.io/) — season & match statistics
- **StatsBomb Open Data** — event-level data for match intelligence
- **football-data.org** (free tier) — live fixtures & league tables

## 🚀 Local Setup

### Prerequisites
- Python 3.10+
- PostgreSQL (local or Neon/Supabase)
- Node.js 18+

### Backend
```bash
cd sports-intelligence-platform

# Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
copy .env.example .env
# Edit .env with your DATABASE_URL

# Run FastAPI
cd backend
uvicorn app.main:app --reload
```

### Data Pipeline
```bash
# Step 1: Extract FBref data
python scripts/extract_fbref.py

# Step 2: Validate data quality
python scripts/validate_data.py

# Step 3: Load to database (after DB setup)
python scripts/load_database.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
sports-intelligence-platform/
├── backend/app/
│   ├── main.py          # FastAPI app
│   ├── database.py      # SQLAlchemy setup
│   ├── config.py        # Settings from .env
│   ├── models/          # ORM models
│   ├── routers/         # API endpoints
│   ├── services/        # Business logic
│   └── utils/           # Helpers
├── data/
│   ├── raw/             # Downloaded data (not in Git)
│   └── processed/       # Cleaned data (not in Git)
├── analytics/
│   ├── notebooks/       # Jupyter exploration
│   └── sql/             # Analytical queries
├── ml/                  # ML models & training
├── scripts/             # ETL pipeline
├── docs/                # Data dictionary
└── tests/               # Automated tests
```

## ⚠️ Limitations

- FBref data accessed via soccerdata — refresh responsibly per source terms
- StatsBomb event data is Open Data with attribution requirements
- football-data.org free tier: 10 req/min, scores delayed, no true live data
- Render free tier: service sleeps after 15 min inactivity

## 📄 Data Attribution

- FBref data sourced via [soccerdata](https://soccerdata.readthedocs.io/)
- StatsBomb Open Data: [github.com/statsbomb/open-data](https://github.com/statsbomb/open-data)
- Fixtures via [football-data.org](https://www.football-data.org/)
