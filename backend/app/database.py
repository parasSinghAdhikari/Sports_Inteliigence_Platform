"""Database connection via psycopg2 connection pool for FastAPI dependency injection.

Uses psycopg2.pool.ThreadedConnectionPool so each request checks a connection
out of the pool and returns it after use, instead of opening a fresh connection
per request (which is slow against serverless Neon).
"""
import os
import psycopg2
import psycopg2.extras
from psycopg2 import pool
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent.parent / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")

# Pool bounds — small because the app runs sync endpoints in a threadpool.
# Tune minconn/maxconn to your workload.
POOL_MINCONN = 1
POOL_MAXCONN = 10

_pool = None


def _get_pool():
    """Lazily create the connection pool on first use."""
    global _pool
    if _pool is None:
        _pool = pool.ThreadedConnectionPool(
            POOL_MINCONN, POOL_MAXCONN, DATABASE_URL,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
    return _pool


def get_db():
    """FastAPI dependency: yields a pooled connection and returns it after."""
    conn = _get_pool().getconn()
    try:
        yield conn
    finally:
        _get_pool().putconn(conn)
