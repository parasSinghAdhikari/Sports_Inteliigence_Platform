"""Database connection via psycopg2 for FastAPI dependency injection."""
import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent.parent / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")


def get_db():
    """FastAPI dependency: yields a psycopg2 connection and closes it after."""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()
