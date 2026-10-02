import type { PrismaClient, Prisma } from "../../generated/prisma/client";
import { expectedUpdate, monitorId, monitorInput, readMonitorLimit } from "../../domain/monitor-input";

export class MonitorError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "LIMIT" | "CONFLICT") { super(code); }
}

export class MonitorService {
  constructor(private readonly database: PrismaClient, private readonly limit = readMonitorLimit()) {}

  list(ownerId: string) {
    return this.database.monitor.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
  }

  async get(ownerId: string, id: string) {
    if (!monitorId.safeParse(id).success) throw new MonitorError("NOT_FOUND");
    const monitor = await this.database.monitor.findFirst({ where: { id, ownerId } });
    if (!monitor) throw new MonitorError("NOT_FOUND");
    return monitor;
  }

  async create(ownerId: string, input: unknown) {
    const data = monitorInput.parse(input);
    return this.database.$transaction(async (tx) => {
      // Serialize creates for this owner: a count without a lock races.
      const owners = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "User" WHERE "id" = ${ownerId}::uuid FOR UPDATE`;
      if (!owners.length) throw new MonitorError("NOT_FOUND");
      if (await tx.monitor.count({ where: { ownerId } }) >= this.limit) throw new MonitorError("LIMIT");
      return tx.monitor.create({ data: { ...data, ownerId } });
    });
  }

  private async lock(tx: Prisma.TransactionClient, ownerId: string, id: string, updatedAt: string) {
    if (!monitorId.safeParse(id).success) throw new MonitorError("NOT_FOUND");
    if (!expectedUpdate.safeParse(updatedAt).success) throw new MonitorError("CONFLICT");
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Monitor" WHERE "id" = ${id}::uuid AND "ownerId" = ${ownerId}::uuid FOR UPDATE
    `;
    if (!rows.length) throw new MonitorError("NOT_FOUND");
    const monitor = await tx.monitor.findUniqueOrThrow({ where: { id } });
    if (monitor.updatedAt.getTime() !== new Date(updatedAt).getTime()) throw new MonitorError("CONFLICT");
    return monitor;
  }

  private async now(tx: Prisma.TransactionClient) {
    const [row] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
    return row!.now;
  }

  private async invalidateRuns(tx: Prisma.TransactionClient, id: string, now: Date) {
    // Monitor is locked first; finalization in M2 will use this same order.
    await tx.checkRun.updateMany({
      where: { monitorId: id, state: { not: "COMPLETED" } },
      data: { state: "COMPLETED", outcome: "COLLECTOR_ERROR", completedAt: now, leaseToken: null, leaseUntil: null, errorCode: "CONFIGURATION_CHANGED" },
    });
  }

  async update(ownerId: string, id: string, updatedAt: string, input: unknown) {
    const data = monitorInput.parse(input);
    return this.database.$transaction(async (tx) => {
      const previous = await this.lock(tx, ownerId, id, updatedAt);
      const now = await this.now(tx);
      const targetChanged = previous.url !== data.url;
      const configChanged = targetChanged || previous.intervalSeconds !== data.intervalSeconds || previous.timeoutMs !== data.timeoutMs || previous.expectedStatus !== data.expectedStatus;
      if (configChanged) await this.invalidateRuns(tx, id, now);
      if (targetChanged) {
        await tx.incident.updateMany({ where: { monitorId: id, endedAt: null }, data: { endedAt: now, endReason: "CONFIG_CHANGED" } });
      }
      return tx.monitor.update({ where: { id }, data: {
        ...data,
        ...(configChanged ? {
          configRevision: { increment: 1 }, leaseToken: null, leaseUntil: null,
          nextCheckAt: now, consecutiveFailures: 0, firstFailureAt: null,
        } : {}),
        ...(targetChanged ? { lastCompletedAt: null, status: previous.enabled ? "UNKNOWN" : "PAUSED" } : {}),
        // Guarantee strictly increasing timestamps even for rapid mutations.
        updatedAt: new Date(Math.max(now.getTime(), previous.updatedAt.getTime() + 1)),
      } });
    });
  }

  async setEnabled(ownerId: string, id: string, updatedAt: string, enabled: boolean) {
    return this.database.$transaction(async (tx) => {
      const previous = await this.lock(tx, ownerId, id, updatedAt);
      if (previous.enabled === enabled) return previous;
      const now = await this.now(tx);
      await this.invalidateRuns(tx, id, now);
      return tx.monitor.update({ where: { id }, data: {
        enabled, status: enabled ? "UNKNOWN" : "PAUSED", configRevision: { increment: 1 },
        leaseToken: null, leaseUntil: null,
        ...(enabled ? { nextCheckAt: now, consecutiveFailures: 0, firstFailureAt: null, lastCompletedAt: null } : {}),
        updatedAt: new Date(Math.max(now.getTime(), previous.updatedAt.getTime() + 1)),
      } });
    });
  }

  async remove(ownerId: string, id: string, updatedAt: string) {
    return this.database.$transaction(async (tx) => {
      await this.lock(tx, ownerId, id, updatedAt);
      await tx.monitor.delete({ where: { id } });
    });
  }
}
