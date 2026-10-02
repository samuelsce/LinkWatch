-- A monitor has one active cycle; retries replace its token, not its identity.
CREATE UNIQUE INDEX "CheckRun_one_active_per_monitor_idx"
  ON "CheckRun" ("monitorId") WHERE "state" <> 'COMPLETED';
