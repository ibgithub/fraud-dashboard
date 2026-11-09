SELECT jobid, schedule, jobname, database, username, active FROM cron.job;
SELECT jobid, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 5;
