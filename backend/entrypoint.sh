#!/bin/sh
set -e

mkdir -p /app/data/knowledge_base /app/data/dce_uploads /app/data/exports

if [ "${1:-}" = "uvicorn" ]; then
  echo "Running Alembic migrations..."
  alembic upgrade head
fi

exec "$@"
