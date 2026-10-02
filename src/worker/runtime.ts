import type { PrismaClient } from "../generated/prisma/client";
import { probe, type ProbeResult } from "../monitoring/probe";
import { Scheduler, type Reservation } from "../monitoring/scheduler";
import { retainChecks } from "../monitoring/retention";

type Log = (event: Record<string, string | number | boolean>) => void;

export class WorkerRuntime {
  private readonly scheduler: Scheduler;
  private readonly active = new Set<Promise<void>>();
  private readonly shutdown = new AbortController();
  private stopped = false;
  private maintenanceAt = 0;

  constructor(
    private readonly database: PrismaClient,
    private readonly log: Log,
    private readonly collect: (job: Reservation, signal: AbortSignal) => Promise<ProbeResult> = probe,
  ) { this.scheduler = new Scheduler(database); }

  async tick() {
    if (this.stopped) return;
    const jobs = await this.scheduler.reserve(5 - this.active.size);
    for (const job of jobs) {
      const task = this.execute(job);
      this.active.add(task);
      void task.finally(() => this.active.delete(task));
    }
    if (Date.now() >= this.maintenanceAt) {
      this.maintenanceAt = Date.now() + 60000;
      this.log({ event: "retention_completed", deleted: await retainChecks(this.database) });
    }
  }

  private async execute(job: Reservation) {
    try {
      this.log({ event: "check_started", monitorId: job.monitorId, runId: job.runId, scheduleDelayMs: Math.max(0, Date.now() - job.scheduledAt.getTime()) });
      let result: ProbeResult;
      try { result = await this.collect(job, this.shutdown.signal); }
      catch { result = { outcome: "COLLECTOR_ERROR", errorCode: "COLLECTOR_INTERNAL" }; }
      const accepted = await this.scheduler.complete(job, result);
      this.log({ event: accepted ? "check_completed" : "check_discarded", monitorId: job.monitorId, runId: job.runId, outcome: result.outcome });
    } catch { this.log({ event: "check_persistence_failed", monitorId: job.monitorId, runId: job.runId }); }
  }

  async drain() {
    this.stopped = true;
    const timer = setTimeout(() => this.shutdown.abort(), 20000);
    try { await Promise.allSettled([...this.active]); }
    finally { clearTimeout(timer); }
  }
}
