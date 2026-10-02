# ─── Stage 1: Python backend ─────────────────────────────────────────────────
FROM python:3.12-slim AS backend

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.prod.txt .
RUN pip install --no-cache-dir -r requirements.prod.txt

# Copy application code
COPY backend/         ./backend/
COPY ml/              ./ml/
COPY data/processed/  ./data/processed/

# Environment (DATABASE_URL must be injected at runtime via env var)
ENV PYTHONPATH=/app/backend
ENV PORT=8000

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app/backend"]


# ─── Stage 2: Frontend build ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
# In production the frontend calls /api/* directly (same origin or env var)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build


# ─── Stage 3: Serve frontend via nginx + proxy API ───────────────────────────
FROM nginx:alpine AS frontend

COPY --from=frontend-build /frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
