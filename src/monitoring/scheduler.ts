import { randomUUID } from "node:crypto";
import type { PrismaClient, Prisma } from "../generated/prisma/client";
import { checkTransition } from "../domain/check-transition";
import type { ProbeResult } from "./probe";

export type Reservation = {
  monitorId: string; runId: string; token: string; revision: number;
  url: string; timeoutMs: number; expectedStatus: number; scheduledAt: Date;
};

async function clock(tx: Prisma.TransactionClient) {
  const [row] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  return row!.now;
}

export class Scheduler {
  constructor(private readonly database: PrismaClient) {}

  async reserve(slots: number): Promise<Reservation[]> {
    if (!Number.isInteger(slots) || slots < 1 || slots > 5) return [];
    return this.database.$transaction(async (tx) => {
      const ids = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Monitor"
        WHERE "enabled" = true AND "nextCheckAt" <= clock_timestamp()
          AND ("leaseUntil" IS NULL OR "leaseUntil" <= clock_timestamp())
        ORDER BY "nextCheckAt", "id" LIMIT ${slots} FOR UPDATE SKIP LOCKED
      `;
      const reservations: Reservation[] = [];
      for (const { id } of ids) {
        const monitor = await tx.monitor.findUniqueOrThrow({ where: { id } });
        const now = await clock(tx);
        const token = randomUUID();
        const leaseUntil = new Date(now.getTime() + monitor.timeoutMs + 30000);
        // An expired lease retries the same cycle, with a new fencing token.
        const active = await tx.checkRun.findFirst({ where: { monitorId: id, state: { not: "COMPLETED" } }, orderBy: { scheduledAt: "asc" } });
        const run = active
          ? await tx.checkRun.update({ where: { id: active.id }, data: { state: "RUNNING", startedAt: now, leaseToken: token, leaseUntil, attemptCount: { increment: 1 } } })
          : await tx.checkRun.create({ data: { monitorId: id, scheduledAt: monitor.nextCheckAt, revision: monitor.configRevision, state: "RUNNING", startedAt: now, leaseToken: token, leaseUntil, attemptCount: 1 } });
        // Worker activity must not invalidate the user's form version.
        await tx.$executeRaw`UPDATE "Monitor" SET "leaseToken" = ${token}::uuid, "leaseUntil" = ${leaseUntil} WHERE "id" = ${id}::uuid`;
        reservations.push({ monitorId: id, runId: run.id, token, revision: run.revision, url: monitor.url, timeoutMs: monitor.timeoutMs, expectedStatus: monitor.expectedStatus, scheduledAt: run.scheduledAt });
      }
      return reservations;
    });
  }

  async complete(reservation: Reservation, result: ProbeResult): Promise<boolean> {
    return this.database.$transaction(async (tx) => {
      const ids = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Monitor" WHERE "id" = ${reservation.monitorId}::uuid FOR UPDATE`;
      if (!ids.length) return false;
      const monitor = await tx.monitor.findUniqueOrThrow({ where: { id: reservation.monitorId } });
      const run = await tx.checkRun.findUnique({ where: { id: reservation.runId } });
      const now = await clock(tx);
      if (!monitor.enabled || monitor.configRevision !== reservation.revision || monitor.leaseToken !== reservation.token || !monitor.leaseUntil || monitor.leaseUntil <= now || !run || run.monitorId !== monitor.id || run.state !== "RUNNING" || run.leaseToken !== reservation.token || run.revision !== reservation.revision || !run.leaseUntil || run.leaseUntil <= now) return false;
      const transition = checkTransition(monitor, result, now);
      await tx.checkRun.update({ where: { id: run.id }, data: {
        state: "COMPLETED", completedAt: now, outcome: result.outcome,
        httpStatus: result.httpStatus ?? null, latencyMs: result.latencyMs ?? null, errorCode: result.errorCode ?? null,
        leaseToken: null, leaseUntil: null,
      } });
      if (transition.incident === "resolve") await tx.incident.updateMany({ where: { monitorId: monitor.id, endedAt: null }, data: { endedAt: now, endReason: "RECOVERED" } });
      if (transition.incident === "open" && !await tx.incident.findFirst({ where: { monitorId: monitor.id, endedAt: null } })) {
        await tx.incident.create({ data: { monitorId: monitor.id, startedAt: transition.firstFailureAt!, confirmedAt: now, failureCode: result.errorCode ?? "ENDPOINT_FAILURE" } });
      }
      const endpointObservation = result.outcome === "SUCCESS" || result.outcome === "FAILURE";
      await tx.monitor.update({ where: { id: monitor.id }, data: {
        status: transition.status, consecutiveFailures: transition.consecutiveFailures, firstFailureAt: transition.firstFailureAt,
        ...(endpointObservation ? { lastCompletedAt: now } : {}),
        leaseToken: null, leaseUntil: null,
        nextCheckAt: new Date(now.getTime() + monitor.intervalSeconds * 1000),
        updatedAt: monitor.updatedAt,
      } });
      return true;
    });
  }
}
