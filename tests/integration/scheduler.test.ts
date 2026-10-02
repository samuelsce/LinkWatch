import { afterEach, beforeEach, afterAll, expect, it } from "vitest";
import { createDatabaseClient } from "../../src/db/client";
import { MonitorService } from "../../src/features/monitors/service";
import { monitorHistory } from "../../src/features/monitors/history";
import { Scheduler } from "../../src/monitoring/scheduler";
import { retainChecks } from "../../src/monitoring/retention";
import type { ProbeResult } from "../../src/monitoring/probe";

const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);
const scheduler = new Scheduler(database);
const service = new MonitorService(database);
let owner: string;
let id: string;
let serial = 0;
const input = { name: "Scheduler fixture", url: "https://example.com/health", intervalSeconds: 60, timeoutMs: 2000, expectedStatus: 200 };
beforeEach(async () => {
  owner = (await database.user.create({ data: {} })).id;
  id = (await service.create(owner, input)).id;
});
afterEach(async () => { await database.user.delete({ where: { id: owner } }); });
afterAll(async () => { await database.$disconnect(); });
async function due() {
  await database.$executeRaw`UPDATE "Monitor" SET "nextCheckAt" = ${new Date(Date.now() - ++serial * 1000)} WHERE "id" = ${id}::uuid`;
}
async function check(result: ProbeResult) {
  await due(); const [job] = await scheduler.reserve(1);
  expect(job!.monitorId).toBe(id);
  expect(await scheduler.complete(job!, result)).toBe(true);
  return database.checkRun.findUniqueOrThrow({ where: { id: job!.runId } });
}
it("competing schedulers reserve a single cycle once", async () => {
  const batches = await Promise.all([scheduler.reserve(1), new Scheduler(database).reserve(1)]);
  expect(batches.flat()).toHaveLength(1);
  expect(await database.checkRun.count({ where: { monitorId: id } })).toBe(1);
});
it("PostgreSQL rejects a second unfinished cycle even from a different writer", async () => {
  await scheduler.reserve(1);
  await expect(database.checkRun.create({ data: { monitorId: id, scheduledAt: new Date(Date.now() + 10000), revision: 1 } })).rejects.toThrow();
});
it("rolls back the entire completion if result persistence fails", async () => {
  const [job] = await scheduler.reserve(1);
  await expect(scheduler.complete(job!, { outcome: "FAILURE", errorCode: "x".repeat(100) })).rejects.toThrow();
  expect(await database.checkRun.findUnique({ where: { id: job!.runId } })).toMatchObject({ state: "RUNNING", completedAt: null });
  expect((await service.get(owner, id)).status).toBe("UNKNOWN");
  expect(await database.incident.count({ where: { monitorId: id } })).toBe(0);
});
it("recovers an expired lease on the same run and fences the previous worker", async () => {
  const [old] = await scheduler.reserve(1);
  const expired = new Date(Date.now() - 1000);
  await database.monitor.update({ where: { id }, data: { leaseUntil: expired } });
  await database.checkRun.update({ where: { id: old!.runId }, data: { leaseUntil: expired } });
  const [retry] = await scheduler.reserve(1);
  expect(retry!.runId).toBe(old!.runId); expect(retry!.token).not.toBe(old!.token);
  expect(await scheduler.complete(old!, { outcome: "FAILURE" })).toBe(false);
  expect(await scheduler.complete(retry!, { outcome: "SUCCESS", httpStatus: 200, latencyMs: 5 })).toBe(true);
  expect(await scheduler.complete(retry!, { outcome: "FAILURE" })).toBe(false);
  expect(await database.checkRun.findUnique({ where: { id: retry!.runId } })).toMatchObject({ attemptCount: 2, outcome: "SUCCESS" });
});
it("a worker cannot finish with an expired lease even before recovery", async () => {
  const [job] = await scheduler.reserve(1);
  await database.monitor.update({ where: { id }, data: { leaseUntil: new Date(Date.now() - 1000) } });
  expect(await scheduler.complete(job!, { outcome: "SUCCESS" })).toBe(false);
});
it.each(["pause", "edit", "delete"])("rejects late completion after %s", async (action) => {
  const [job] = await scheduler.reserve(1);
  const monitor = await service.get(owner, id);
  if (action === "pause") await service.setEnabled(owner, id, monitor.updatedAt.toISOString(), false);
  if (action === "edit") await service.update(owner, id, monitor.updatedAt.toISOString(), { ...input, expectedStatus: 204 });
  if (action === "delete") await service.remove(owner, id, monitor.updatedAt.toISOString());
  expect(await scheduler.complete(job!, { outcome: "FAILURE" })).toBe(false);
  expect(await database.incident.count({ where: { monitorId: id } })).toBe(0);
});
it("a name edit does not invalidate a reservation and collection preserves form versions", async () => {
  const before = await service.get(owner, id);
  const [job] = await scheduler.reserve(1);
  expect((await service.get(owner, id)).updatedAt).toEqual(before.updatedAt);
  const renamed = await service.update(owner, id, before.updatedAt.toISOString(), { ...input, name: "Renamed" });
  expect(await scheduler.complete(job!, { outcome: "SUCCESS" })).toBe(true);
  expect((await service.get(owner, id)).updatedAt).toEqual(renamed.updatedAt);
});
it("persists the complete failure/incident/recovery cycle without duplicate incidents", async () => {
  const first = await check({ outcome: "FAILURE", errorCode: "TIMEOUT" });
  expect((await service.get(owner, id)).status).toBe("UNSTABLE");
  expect(await database.incident.count({ where: { monitorId: id } })).toBe(0);
  await check({ outcome: "FAILURE", errorCode: "TIMEOUT" });
  await check({ outcome: "FAILURE", errorCode: "CONNECTION" });
  const incident = await database.incident.findFirstOrThrow({ where: { monitorId: id } });
  expect(incident.startedAt).toEqual(first.completedAt);
  expect(incident.endedAt).toBeNull();
  expect((await service.get(owner, id)).status).toBe("OFFLINE");
  await check({ outcome: "SUCCESS", latencyMs: 82, httpStatus: 200 });
  expect(await database.incident.count({ where: { monitorId: id } })).toBe(1);
  expect(await database.incident.findUnique({ where: { id: incident.id } })).toMatchObject({ endReason: "RECOVERED" });
  expect((await service.get(owner, id)).status).toBe("ONLINE");
  const history = await monitorHistory(database, owner, id);
  expect(history).toMatchObject({ samples: 4, successes: 1, availability: 25, p95Ms: 82, averageMs: 82 });
});
it("operational errors do not refresh endpoint freshness or resolve an incident", async () => {
  await check({ outcome: "FAILURE" }); await check({ outcome: "FAILURE" });
  const previous = await service.get(owner, id);
  await check({ outcome: "BLOCKED", errorCode: "DNS_POLICY" });
  expect((await service.get(owner, id)).lastCompletedAt).toEqual(previous.lastCompletedAt);
  expect(await database.incident.count({ where: { monitorId: id, endedAt: null } })).toBe(1);
  expect(await monitorHistory(database, owner, id)).toMatchObject({ samples: 2, availability: 0, operational: 1 });
});
it("computes nearest-rank p95, leaves empty availability null, and isolates owners", async () => {
  expect(await monitorHistory(database, owner, id)).toMatchObject({ samples: 0, availability: null, p95Ms: null });
  for (let value = 1; value <= 20; value++) await check({ outcome: "SUCCESS", httpStatus: 200, latencyMs: value });
  expect(await monitorHistory(database, owner, id)).toMatchObject({ p95Ms: 19, averageMs: 10.5, availability: 100, samples: 20 });
  const other = await database.user.create({ data: {} });
  try { await expect(monitorHistory(database, other.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" }); }
  finally { await database.user.delete({ where: { id: other.id } }); }
});
it("retains active runs and incidents while deleting only expired completed checks", async () => {
  const old = new Date(Date.now() - 31 * 86400000);
  await database.checkRun.create({ data: { monitorId: id, scheduledAt: old, startedAt: old, completedAt: old, revision: 1, state: "COMPLETED", outcome: "FAILURE" } });
  const active = await database.checkRun.create({ data: { monitorId: id, scheduledAt: new Date(old.getTime() + 1), revision: 1 } });
  const incident = await database.incident.create({ data: { monitorId: id, startedAt: old, confirmedAt: old, failureCode: "TIMEOUT" } });
  await database.maintenanceLease.deleteMany({ where: { name: "check-retention" } });
  const counts = await Promise.all([retainChecks(database), retainChecks(database)]);
  expect(counts.reduce((sum, count) => sum + count, 0)).toBe(1);
  expect(await database.checkRun.findUnique({ where: { id: active.id } })).not.toBeNull();
  expect(await database.incident.findUnique({ where: { id: incident.id } })).not.toBeNull();
  await database.maintenanceLease.deleteMany({ where: { name: "check-retention" } });
});
it("filters UTC windows and exposes missed observations independently of availability", async () => {
  const times = [Date.now() - 3 * 86400000, Date.now() - 3600000, Date.now() - 600000];
  for (const time of times) {
    await database.checkRun.create({ data: { monitorId: id, scheduledAt: new Date(time), startedAt: new Date(time), completedAt: new Date(time), revision: 1, state: "COMPLETED", outcome: "SUCCESS", latencyMs: 10 } });
  }
  expect(await monitorHistory(database, owner, id, 24)).toMatchObject({ samples: 2, gaps: 1, availability: 100, stale: true });
  expect(await monitorHistory(database, owner, id, 168)).toMatchObject({ samples: 3, gaps: 2 });
});
