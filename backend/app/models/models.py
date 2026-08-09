"""
SQLAlchemy ORM models — designed after inspecting real FBref data.
Schema will be finalized after running extract_fbref.py and exploring the data.
"""

from datetime import date, datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime,
    ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.database import Base


class Competition(Base):
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    country = Column(String(50))
    fbref_id = Column(String(20), unique=True)

    seasons = relationship("Season", back_populates="competition")

    def __repr__(self):
        return f"<Competition {self.name}>"


class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True)
    competition_id = Column(Integer, ForeignKey("competitions.id"), nullable=False)
    year = Column(String(10), nullable=False)   # e.g. "2024-25"
    start_date = Column(Date)
    end_date = Column(Date)

    competition = relationship("Competition", back_populates="seasons")
    matches = relationship("Match", back_populates="season")

    __table_args__ = (UniqueConstraint("competition_id", "year"),)


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    short_name = Column(String(30))
    country = Column(String(50))
    fbref_id = Column(String(20), unique=True)

    players = relationship("Player", back_populates="team")
    home_matches = relationship("Match", foreign_keys="Match.home_team_id", back_populates="home_team")
    away_matches = relationship("Match", foreign_keys="Match.away_team_id", back_populates="away_team")

    __table_args__ = (Index("ix_teams_name", "name"),)


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"))
    nationality = Column(String(50))
    position = Column(String(30))       # GK, DF, MF, FW
    age = Column(Integer)
    fbref_id = Column(String(20), unique=True)

    team = relationship("Team", back_populates="players")
    season_stats = relationship("PlayerSeasonStats", back_populates="player")
    match_stats = relationship("PlayerMatchStats", back_populates="player")

    __table_args__ = (
        Index("ix_players_name", "name"),
        Index("ix_players_team", "team_id"),
    )


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    home_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    match_date = Column(Date)
    home_score = Column(Integer)
    away_score = Column(Integer)
    matchweek = Column(Integer)
    venue = Column(String(100))
    fbref_match_id = Column(String(20), unique=True)

    season = relationship("Season", back_populates="matches")
    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    player_stats = relationship("PlayerMatchStats", back_populates="match")
    team_stats = relationship("TeamMatchStats", back_populates="match")

    __table_args__ = (
        Index("ix_matches_date", "match_date"),
        Index("ix_matches_season", "season_id"),
    )


class PlayerSeasonStats(Base):
    """Aggregated player stats per season."""
    __tablename__ = "player_season_stats"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)

    # Playing time
    matches_played = Column(Integer, default=0)
    minutes = Column(Integer, default=0)
    minutes_per_90 = Column(Float)

    # Attack
    goals = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    goals_per90 = Column(Float)
    assists_per90 = Column(Float)
    xg = Column(Float)           # expected goals
    xa = Column(Float)           # expected assists
    shots = Column(Integer)
    shots_on_target = Column(Integer)

    # Passing
    passes_completed = Column(Integer)
    passes_attempted = Column(Integer)
    pass_completion_pct = Column(Float)
    key_passes = Column(Integer)
    progressive_passes = Column(Integer)

    # Defense
    tackles = Column(Integer)
    interceptions = Column(Integer)
    blocks = Column(Integer)

    player = relationship("Player", back_populates="season_stats")
    season = relationship("Season")

    __table_args__ = (UniqueConstraint("player_id", "season_id"),)


class PlayerMatchStats(Base):
    """Per-match player statistics."""
    __tablename__ = "player_match_stats"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)

    minutes = Column(Integer)
    goals = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    xg = Column(Float)
    xa = Column(Float)
    shots = Column(Integer)
    passes_completed = Column(Integer)
    key_passes = Column(Integer)
    tackles = Column(Integer)
    yellow_cards = Column(Integer, default=0)
    red_cards = Column(Integer, default=0)

    player = relationship("Player", back_populates="match_stats")
    match = relationship("Match", back_populates="player_stats")

    __table_args__ = (UniqueConstraint("player_id", "match_id"),)


class TeamMatchStats(Base):
    """Per-match team statistics."""
    __tablename__ = "team_match_stats"

    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    is_home = Column(Boolean, nullable=False)

    goals = Column(Integer)
    xg = Column(Float)
    shots = Column(Integer)
    shots_on_target = Column(Integer)
    possession = Column(Float)      # percentage
    passes = Column(Integer)
    passes_completed = Column(Integer)
    fouls = Column(Integer)
    corners = Column(Integer)

    match = relationship("Match", back_populates="team_stats")

    __table_args__ = (UniqueConstraint("team_id", "match_id"),)
