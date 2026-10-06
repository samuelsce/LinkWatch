import type { PrismaClient } from "../../generated/prisma/client";
import { publicSummary, visibleStatus } from "../../domain/visible-status";
import { statusSlug } from "./input";

export async function readPublicPage(database: PrismaClient, slug: string) {
  if (!statusSlug.safeParse(slug).success) return null;
  // A consistent snapshot pairs publication/selection with observations.
  return database.$transaction(async (tx) => {
    const page = await tx.statusPage.findFirst({ where: { slug, published: true }, select: {
      title: true, description: true,
      monitors: { orderBy: { position: "asc" }, select: {
        publicName: true,
        monitor: { select: { id: true, enabled: true, status: true, lastCompletedAt: true, intervalSeconds: true, timeoutMs: true, createdAt: true,
          incidents: { orderBy: { startedAt: "desc" }, take: 10, select: { startedAt: true, confirmedAt: true, endedAt: true, endReason: true } },
        } },
      } },
    } });
    if (!page) return null;
    const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
    const ids = page.monitors.map((item) => item.monitor.id);
    const since = new Date(clock!.now.getTime() - 24 * 3600000);
    const counts = ids.length ? await tx.$queryRaw<Array<{ id: string; samples: number; successes: number }>>`
      SELECT "monitorId" AS id, COUNT(*)::int AS samples, COUNT(*) FILTER (WHERE "outcome" = 'SUCCESS')::int AS successes
      FROM "CheckRun" WHERE "monitorId" = ANY(${ids}::uuid[]) AND "state" = 'COMPLETED'
        AND "outcome" IN ('SUCCESS', 'FAILURE') AND "completedAt" >= ${since} AND "completedAt" <= ${clock!.now}
      GROUP BY "monitorId"
    ` : [];
    const byId = new Map(counts.map((item) => [item.id, item]));
    const services = page.monitors.map(({ publicName, monitor }) => {
      const count = byId.get(monitor.id);
      // Explicit return projection: no spread of database objects/IDs/config.
      return {
        name: publicName, state: visibleStatus(monitor, clock!.now.getTime()),
        availability: count?.samples ? count.successes / count.samples * 100 : null,
        samples: count?.samples ?? 0, lastCompletedAt: monitor.lastCompletedAt?.toISOString() ?? null,
        incidents: monitor.incidents.map((incident) => ({ startedAt: incident.startedAt.toISOString(), endedAt: incident.endedAt?.toISOString() ?? null, endReason: incident.endReason })),
      };
    });
    return { title: page.title, description: page.description, summary: publicSummary(services.map((item) => item.state)), services, observedAt: clock!.now.toISOString() };
  }, { isolationLevel: "RepeatableRead", timeout: 10000 });
}
