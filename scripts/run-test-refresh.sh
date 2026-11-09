#!/usr/bin/env bash
set -euo pipefail
# Run the manual refresh test as anvaia (app role). Reads password from container.
PW=$(docker inspect anvaia-bag-analytics-service --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^EXEC_DB_PASSWORD=' | cut -d= -f2-)
docker run --rm -v /tmp/test-refresh.sql:/q.sql:ro \
  -e PGPASSWORD="$PW" \
  postgres:17-alpine \
  psql -h anvaia-db.c3e0ica8k5o5.ap-southeast-3.rds.amazonaws.com -U anvaia -d bag_demo -v ON_ERROR_STOP=1 -f /q.sql
