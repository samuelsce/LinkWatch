import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "../../src/db/client";
import { MonitorService } from "../../src/features/monitors/service";

const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);
const service = new MonitorService(database);
const owners: string[] = [];
let ownerA: string, ownerB: string;
const input = { name: "Service test", url: "https://example.com/health", intervalSeconds: 300, timeoutMs: 10000, expectedStatus: 200 };

beforeAll(async () => {
  for (let index = 0; index < 2; index++) owners.push((await database.user.create({ data: { name: `service-owner-${index}` } })).id);
  [ownerA, ownerB] = owners as [string, string];
});
afterAll(async () => {
  try { await database.user.deleteMany({ where: { id: { in: owners } } }); }
  finally { await database.$disconnect(); }
});

describe("monitor ownership and concurrency", () => {
  it("derives ownership from the authenticated owner, not submitted fields", async () => {
    const monitor = await service.create(ownerA, { ...input, ownerId: ownerB });
    expect(monitor.ownerId).toBe(ownerA);
    expect((await service.list(ownerB)).map((row) => row.id)).not.toContain(monitor.id);
  });

  it("denies reading, editing, pausing and deleting another user's monitor", async () => {
    const monitor = await service.create(ownerA, input);
    const timestamp = monitor.updatedAt.toISOString();
    for (const operation of [
      () => service.get(ownerB, monitor.id),
      () => service.update(ownerB, monitor.id, timestamp, { ...input, name: "Hijacked" }),
      () => service.setEnabled(ownerB, monitor.id, timestamp, false),
      () => service.remove(ownerB, monitor.id, timestamp),
    ]) await expect(operation()).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await service.get(ownerA, monitor.id)).name).toBe(input.name);
  });

  it("serializes simultaneous creates to enforce the owner limit", async () => {
    const user = await database.user.create({ data: {} }); owners.push(user.id);
    const limited = new MonitorService(database, 1);
    const results = await Promise.allSettled([limited.create(user.id, input), limited.create(user.id, input)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await database.monitor.count({ where: { ownerId: user.id } })).toBe(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "LIMIT" });
  });

  it("rejects stale updates without overwriting a newer edit", async () => {
    const monitor = await service.create(ownerA, input);
    await service.update(ownerA, monitor.id, monitor.updatedAt.toISOString(), { ...input, name: "First edit" });
    await expect(service.update(ownerA, monitor.id, monitor.updatedAt.toISOString(), { ...input, name: "Stale edit" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await service.get(ownerA, monitor.id)).name).toBe("First edit");
  });

  it("invalidates active runs and closes incident when the target changes", async () => {
    const monitor = await service.create(ownerA, input);
    const leaseToken = randomUUID();
    const now = new Date(Date.now() - 1000);
    const previous = await database.monitor.update({ where: { id: monitor.id }, data: {
      status: "OFFLINE", consecutiveFailures: 2, firstFailureAt: now, leaseToken, leaseUntil: new Date(Date.now() + 60000),
    } });
    await database.checkRun.create({ data: { monitorId: monitor.id, scheduledAt: now, startedAt: now, revision: 1, state: "RUNNING", leaseToken, leaseUntil: new Date(Date.now() + 60000) } });
    await database.incident.create({ data: { monitorId: monitor.id, startedAt: now, confirmedAt: now, failureCode: "TIMEOUT" } });
    const changed = await service.update(ownerA, monitor.id, previous.updatedAt.toISOString(), { ...input, url: "https://example.com/other" });
    expect(changed).toMatchObject({ status: "UNKNOWN", configRevision: 2, leaseToken: null, consecutiveFailures: 0 });
    expect(await database.incident.findFirst({ where: { monitorId: monitor.id } })).toMatchObject({ endReason: "CONFIG_CHANGED" });
    expect(await database.checkRun.findFirst({ where: { monitorId: monitor.id } })).toMatchObject({ state: "COMPLETED", outcome: "COLLECTOR_ERROR", leaseToken: null });
  });

  it("pauses without inventing recovery, and resumes with cleared failure sequence", async () => {
    const monitor = await service.create(ownerA, input);
    const now = new Date();
    await database.incident.create({ data: { monitorId: monitor.id, startedAt: now, confirmedAt: now, failureCode: "TIMEOUT" } });
    const paused = await service.setEnabled(ownerA, monitor.id, monitor.updatedAt.toISOString(), false);
    expect(paused).toMatchObject({ enabled: false, status: "PAUSED", configRevision: 2 });
    expect(await database.incident.count({ where: { monitorId: monitor.id, endedAt: null } })).toBe(1);
    const resumed = await service.setEnabled(ownerA, monitor.id, paused.updatedAt.toISOString(), true);
    expect(resumed).toMatchObject({ enabled: true, status: "UNKNOWN", consecutiveFailures: 0, configRevision: 3 });
  });

  it("starts a new revision when expected status changes", async () => {
    const monitor = await service.create(ownerA, input);
    const updated = await service.update(ownerA, monitor.id, monitor.updatedAt.toISOString(), { ...input, expectedStatus: 204 });
    expect(updated.configRevision).toBe(2);
  });
});
