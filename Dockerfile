# Railway Backend Dockerfile — FastAPI only
FROM python:3.12-slim

# Install dependencies
WORKDIR /app
COPY requirements.prod.txt .
RUN pip install --no-cache-dir -r requirements.prod.txt

# Copy backend source and ml directory
COPY backend/ ./backend/
COPY ml/ ./ml/

# Switch into backend so Python finds the "app" package directly
# (uvicorn app.main:app resolves to /app/backend/app/main.py)
WORKDIR /app/backend

EXPOSE 8000

# Railway injects $PORT at runtime
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
