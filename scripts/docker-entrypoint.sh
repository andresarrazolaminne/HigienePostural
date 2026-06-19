#!/bin/sh
set -e

mkdir -p "${UPLOAD_DIR:-/data/uploads}"

echo "Running database migrations..."
alembic upgrade head

if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "Seeding demo users (RUN_SEED=1)..."
  python scripts/seed_demo.py
fi

echo "Starting API on port ${PORT:-8080}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}"
