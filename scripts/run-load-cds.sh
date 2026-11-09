#!/usr/bin/env bash
set -euo pipefail
# Load ods.status_nasabah from CSV. Runs as anvaia (app role).
# Expects on EC2: /tmp/005_status_nasabah.sql and /tmp/status_nasabah_v2.csv
PW=$(docker inspect anvaia-bag-analytics-service --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^EXEC_DB_PASSWORD=' | cut -d= -f2-)
if [ -z "$PW" ]; then echo "ERROR: could not read EXEC_DB_PASSWORD" >&2; exit 1; fi

docker run --rm \
  -v /tmp/005_status_nasabah.sql:/q.sql:ro \
  -v /tmp/status_nasabah_v2.csv:/tmp/status_nasabah_v2.csv:ro \
  -e PGPASSWORD="$PW" \
  postgres:17-alpine \
  psql -h anvaia-db.c3e0ica8k5o5.ap-southeast-3.rds.amazonaws.com -U anvaia -d bag_demo -v ON_ERROR_STOP=1 -f /q.sql
