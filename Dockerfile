# Railway Backend Dockerfile — FastAPI only (no nginx)
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.prod.txt .
RUN pip install --no-cache-dir -r requirements.prod.txt

# Copy backend source
COPY backend/ ./backend/

# Set Python path so "from app.xxx import" works
ENV PYTHONPATH=backend

# Railway injects $PORT at runtime — default 8000 for local docker run
EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --app-dir backend
