import os
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
import psycopg2.extras
from psycopg2 import pool

# Only load .env if it actually exists (for local development)
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path, override=False)

DATABASE_URL = os.getenv("DATABASE_URL")

# Pool bounds
POOL_MINCONN = 1
POOL_MAXCONN = 10

_pool = None


def _get_pool():
    """Lazily create the connection pool on first use."""
    global _pool
    if _pool is None:
        if not DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL environment variable is NOT set in Railway! "
                "Go to your backend service -> Variables tab and add DATABASE_URL."
            )

        # In case the URL begins with postgres://, standardize it
        dsn = DATABASE_URL
        if dsn.startswith("postgres://"):
            dsn = dsn.replace("postgres://", "postgresql://", 1)

        _pool = pool.ThreadedConnectionPool(
            POOL_MINCONN,
            POOL_MAXCONN,
            dsn=dsn,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
    return _pool


def get_db():
    """FastAPI dependency: yields a pooled connection and returns it after."""
    pool_instance = _get_pool()
    conn = pool_instance.getconn()
    try:
        yield conn
    finally:
        pool_instance.putconn(conn)