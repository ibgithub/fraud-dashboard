#!/usr/bin/env bash
set -euo pipefail

# Extract bag_demo password from the running analytics-service container env.
PW=$(docker inspect anvaia-bag-analytics-service --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^EXEC_DB_PASSWORD=' | cut -d= -f2-)

if [ -z "$PW" ]; then
  echo "ERROR: could not read EXEC_DB_PASSWORD" >&2
  exit 1
fi

docker run --rm -v /tmp/004_pg_cron_refresh.sql:/q.sql:ro \
  -e PGPASSWORD="$PW" \
  postgres:17-alpine \
  psql -h anvaia-db.c3e0ica8k5o5.ap-southeast-3.rds.amazonaws.com -U anvaia -d bag_demo -v ON_ERROR_STOP=1 -f /q.sql
