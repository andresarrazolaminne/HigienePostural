#!/bin/sh
# Un solo contenedor: API en 127.0.0.1:8080 + nginx en :80 (sin DNS entre contenedores).
set -e

mkdir -p "${UPLOAD_DIR:-/data/uploads}"

echo "Running database migrations..."
alembic upgrade head

if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "Seeding demo users (RUN_SEED=1)..."
  python scripts/seed_demo.py
fi

echo "Starting API on 127.0.0.1:8080..."
uvicorn app.main:app --host 127.0.0.1 --port 8080 &
API_PID=$!

for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if wget -q -O /dev/null http://127.0.0.1:8080/health 2>/dev/null; then
    echo "API ready."
    break
  fi
  sleep 1
done

trap 'kill "$API_PID" 2>/dev/null; wait "$API_PID" 2>/dev/null' EXIT TERM INT

echo "Starting nginx on :80..."
exec nginx -g 'daemon off;'
