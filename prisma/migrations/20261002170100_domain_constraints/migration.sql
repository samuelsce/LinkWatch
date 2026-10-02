-- Keep domain invariants in PostgreSQL, including for concurrent writers.
ALTER TABLE "Monitor"
  ADD CONSTRAINT "Monitor_name_nonempty" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "Monitor_interval_valid" CHECK ("intervalSeconds" IN (60, 300, 900)),
  ADD CONSTRAINT "Monitor_timeout_valid" CHECK ("timeoutMs" BETWEEN 2000 AND 15000),
  ADD CONSTRAINT "Monitor_expected_status_valid" CHECK ("expectedStatus" BETWEEN 200 AND 599),
  ADD CONSTRAINT "Monitor_revision_positive" CHECK ("configRevision" > 0),
  ADD CONSTRAINT "Monitor_failures_nonnegative" CHECK ("consecutiveFailures" >= 0),
  ADD CONSTRAINT "Monitor_lease_paired" CHECK (("leaseToken" IS NULL) = ("leaseUntil" IS NULL));

CREATE INDEX "Monitor_active_schedule_idx" ON "Monitor" ("nextCheckAt") WHERE "enabled" = true;

ALTER TABLE "CheckRun"
  ADD CONSTRAINT "CheckRun_revision_positive" CHECK ("revision" > 0),
  ADD CONSTRAINT "CheckRun_attempts_nonnegative" CHECK ("attemptCount" >= 0),
  ADD CONSTRAINT "CheckRun_latency_nonnegative" CHECK ("latencyMs" IS NULL OR "latencyMs" >= 0),
  ADD CONSTRAINT "CheckRun_http_status_valid" CHECK ("httpStatus" IS NULL OR "httpStatus" BETWEEN 100 AND 599),
  ADD CONSTRAINT "CheckRun_completion_consistent" CHECK (
    ("state" = 'COMPLETED' AND "completedAt" IS NOT NULL AND "outcome" IS NOT NULL)
    OR ("state" <> 'COMPLETED' AND "completedAt" IS NULL AND "outcome" IS NULL)
  ),
  ADD CONSTRAINT "CheckRun_lease_paired" CHECK (("leaseToken" IS NULL) = ("leaseUntil" IS NULL)),
  ADD CONSTRAINT "CheckRun_completion_order" CHECK ("completedAt" IS NULL OR "startedAt" IS NULL OR "completedAt" >= "startedAt");

ALTER TABLE "Incident"
  ADD CONSTRAINT "Incident_confirmation_order" CHECK ("confirmedAt" >= "startedAt"),
  ADD CONSTRAINT "Incident_end_order" CHECK ("endedAt" IS NULL OR "endedAt" >= "confirmedAt"),
  ADD CONSTRAINT "Incident_end_consistent" CHECK (("endedAt" IS NULL) = ("endReason" IS NULL));

CREATE UNIQUE INDEX "Incident_one_open_per_monitor_idx" ON "Incident" ("monitorId") WHERE "endedAt" IS NULL;

ALTER TABLE "StatusPage"
  ADD CONSTRAINT "StatusPage_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT "StatusPage_title_nonempty" CHECK (length(btrim("title")) > 0);

ALTER TABLE "StatusPageMonitor"
  ADD CONSTRAINT "StatusPageMonitor_position_nonnegative" CHECK ("position" >= 0),
  ADD CONSTRAINT "StatusPageMonitor_name_nonempty" CHECK (length(btrim("publicName")) > 0);
