"""
FastAPI entry point for Sports Intelligence Platform.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import players, teams, matches, stats, dashboard, scouting, match_intelligence

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title="Sports Intelligence API",
    description="Premier League analytics API powered by real FBref data",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router,   prefix="/api/players",   tags=["Players"])
app.include_router(teams.router,     prefix="/api/teams",     tags=["Teams"])
app.include_router(matches.router,   prefix="/api/matches",   tags=["Matches"])
app.include_router(stats.router,     prefix="/api/stats",     tags=["Stats"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(scouting.router,           prefix="/api/scouting",     tags=["Scouting"])
app.include_router(match_intelligence.router,  prefix="/api/intel",        tags=["Match Intelligence"])

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "version": "1.0.0"}
