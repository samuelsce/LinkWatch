import type { PrismaClient } from "../../generated/prisma/client";
import { MonitorError } from "./service";

export const historyWindows = [24, 168, 720] as const;

export async function monitorHistory(database: PrismaClient, ownerId: string, monitorId: string, hours: number = 24) {
  if (!historyWindows.includes(hours as 24 | 168 | 720)) throw new Error("INVALID_WINDOW");
  const monitor = await database.monitor.findFirst({ where: { id: monitorId, ownerId } });
  if (!monitor) throw new MonitorError("NOT_FOUND");
  const [clock] = await database.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  const since = new Date(clock!.now.getTime() - hours * 3600000);
  const [summary] = await database.$queryRaw<Array<{ samples: number; successes: number; operational: number; averageMs: number | null; p95Ms: number | null; late: number }>>`
    SELECT COUNT(*) FILTER (WHERE "outcome" IN ('SUCCESS', 'FAILURE'))::int AS samples,
      COUNT(*) FILTER (WHERE "outcome" = 'SUCCESS')::int AS successes,
      COUNT(*) FILTER (WHERE "outcome" IN ('BLOCKED', 'COLLECTOR_ERROR'))::int AS operational,
      AVG("latencyMs") FILTER (WHERE "outcome" = 'SUCCESS')::float8 AS "averageMs",
      percentile_disc(0.95) WITHIN GROUP (ORDER BY "latencyMs") FILTER (WHERE "outcome" = 'SUCCESS') AS "p95Ms",
      COUNT(*) FILTER (WHERE "startedAt" > "scheduledAt" + interval '30 seconds')::int AS late
    FROM "CheckRun" WHERE "monitorId" = ${monitorId}::uuid AND "completedAt" >= ${since}
      AND "completedAt" <= ${clock!.now} AND "state" = 'COMPLETED'
  `;
  const [checks, incidents] = await Promise.all([
    database.checkRun.findMany({ where: { monitorId, state: "COMPLETED", completedAt: { gte: since, lte: clock!.now } }, orderBy: { completedAt: "desc" }, take: 50 }),
    database.incident.findMany({ where: { monitorId }, orderBy: { startedAt: "desc" }, take: 20 }),
  ]);
  const [gaps] = await database.$queryRaw<Array<{ gaps: number }>>`
    SELECT COUNT(*)::int AS gaps FROM (
      SELECT "completedAt", lag("completedAt") OVER (ORDER BY "completedAt") AS previous
      FROM "CheckRun" WHERE "monitorId" = ${monitorId}::uuid AND "revision" = ${monitor.configRevision}
        AND "completedAt" >= ${since} AND "completedAt" <= ${clock!.now}
        AND "outcome" IN ('SUCCESS', 'FAILURE')
    ) observations WHERE "completedAt" - previous > (${monitor.intervalSeconds * 2 + monitor.timeoutMs / 1000 + 30} * interval '1 second')
  `;
  const fresh = monitor.lastCompletedAt && clock!.now.getTime() - monitor.lastCompletedAt.getTime() <= monitor.intervalSeconds * 2000 + monitor.timeoutMs + 30000;
  return { ...summary!, gaps: gaps!.gaps, availability: summary!.samples ? summary!.successes / summary!.samples * 100 : null, checks, incidents, since, now: clock!.now, stale: monitor.enabled && !fresh };
}
