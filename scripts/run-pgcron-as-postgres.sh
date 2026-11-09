#!/usr/bin/env bash
set -euo pipefail

# Expects PGPASSWORD (postgres master password) to be passed in the environment.
if [ -z "${PGPASSWORD:-}" ]; then
  echo "ERROR: PGPASSWORD not set" >&2
  exit 1
fi

docker run --rm -v /tmp/004_pg_cron_refresh.sql:/q.sql:ro \
  -e PGPASSWORD="$PGPASSWORD" \
  postgres:17-alpine \
  psql -h anvaia-db.c3e0ica8k5o5.ap-southeast-3.rds.amazonaws.com -U postgres -d bag_demo -v ON_ERROR_STOP=1 -f /q.sql
