#!/bin/bash
set -e

# Run the normal postgres entrypoint (which handles init if data dir is empty)
/usr/local/bin/docker-entrypoint.sh postgres &

# Wait for Postgres to start
until pg_isready -U postgres -h localhost; do
  echo "Waiting for Postgres..."
  sleep 2
done

# Run your SQL file every time container starts
if [ -f /docker-entrypoint-initdb.d/init.sql ]; then
  echo "Executing init.sql..."
  psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/init.sql || true
fi

# Keep container running in foreground
wait -n