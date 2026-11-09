# pg_cron MV refresh scheduling (bag_demo on RDS anvaia-db)

Schedules `ods.refresh_corporate_insight()` to run at **00/06/12/18 WIB**
(`0 17,23,5,11 * * *` UTC — RDS pg_cron runs in UTC).

## What it refreshes (in order)
1. `ods.mv_h` (base materialized view)
2. `ods.mv_ci_kpi`, `ods.mv_ci_branch`, `ods.mv_ci_dist` (corporate-insight summary MVs)

`ods.trb_score` is a TABLE (populated by upstream ETL), so it is not refreshed here.

## One-time install (already done)
pg_cron needs `shared_preload_libraries` set via a custom DB parameter group + a
reboot, and the extension must be created by the RDS master user (`postgres`).

1. Create custom param group (family `postgres17`), set:
   - `shared_preload_libraries = pg_cron`
   - `cron.database_name = bag_demo`
2. Attach to instance `anvaia-db` and **reboot**.
3. As `postgres`, run `backend/analytics-service/sql/004_pg_cron_refresh.sql`
   (creates extension, function, schedule, grants).

## Operate
- Scheduling SQL: `backend/analytics-service/sql/004_pg_cron_refresh.sql`
- Run as postgres on EC2: `run-pgcron-as-postgres.sh` (expects `PGPASSWORD` in env)
- Manual refresh test (as anvaia): `test-refresh.sql` via `run-test-refresh.sh`
- Verify schedule + run history (as postgres): `verify-cron.sql` via `run-verify-cron.sh`

Note: pg_cron's `cron.job` view only shows jobs owned by the current user. The job
is owned by `postgres`, so query it as `postgres` to see it / its run history.
