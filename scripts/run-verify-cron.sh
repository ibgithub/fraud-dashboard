#!/usr/bin/env bash
set -euo pipefail
if [ -z "${PGPASSWORD:-}" ]; then echo "ERROR: PGPASSWORD not set" >&2; exit 1; fi
docker run --rm -v /tmp/verify-cron.sql:/q.sql:ro \
  -e PGPASSWORD="$PGPASSWORD" \
  postgres:17-alpine \
  psql -h anvaia-db.c3e0ica8k5o5.ap-southeast-3.rds.amazonaws.com -U postgres -d bag_demo -f /q.sql
