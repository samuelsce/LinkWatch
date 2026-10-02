import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "../../src/db/client";

const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);
const ownerIds: string[] = [];
let ownerA: string;
let ownerB: string;

beforeAll(async () => {
  const first = await database.user.create({ data: { name: "integration-owner-a" } });
  ownerIds.push(first.id);
  ownerA = first.id;
  const second = await database.user.create({ data: { name: "integration-owner-b" } });
  ownerIds.push(second.id);
  ownerB = second.id;
});

afterAll(async () => {
  try {
    if (ownerIds.length) await database.user.deleteMany({ where: { id: { in: ownerIds } } });
  } finally {
    await database.$disconnect();
  }
});

function createMonitor(ownerId = ownerA) {
  return database.monitor.create({ data: { ownerId, name: "Integration API", url: "https://example.com/health" } });
}

describe("PostgreSQL invariants", () => {
  it("returns timestamps without shifting the database timezone", async () => {
    const [row] = await database.$queryRaw<Array<{ stamp: Date; epoch: number }>>`
      SELECT CURRENT_TIMESTAMP AS stamp,
        (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::double precision AS epoch
    `;
    expect(Math.abs(row!.stamp.getTime() - row!.epoch)).toBeLessThan(1);
  });
  it("creates a monitor with explicit default configuration", async () => {
    const monitor = await createMonitor();
    expect(monitor).toMatchObject({ intervalSeconds: 300, timeoutMs: 10000, expectedStatus: 200, status: "UNKNOWN", enabled: true });
  });

  it("rejects an unsupported interval even without application validation", async () => {
    await expect(database.monitor.create({ data: {
      ownerId: ownerA, name: "Invalid interval", url: "https://example.com", intervalSeconds: 42,
    } })).rejects.toThrow("Monitor_interval_valid");
  });

  it("permits only one open incident under concurrent writes", async () => {
    const monitor = await createMonitor();
    const startedAt = new Date();
    const data = { monitorId: monitor.id, startedAt, confirmedAt: startedAt, failureCode: "TIMEOUT" };
    const results = await Promise.allSettled([
      database.incident.create({ data }), database.incident.create({ data }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await database.incident.count({ where: { monitorId: monitor.id, endedAt: null } })).toBe(1);
  });

  it("allows a new incident after the previous one is resolved", async () => {
    const monitor = await createMonitor();
    const startedAt = new Date();
    const incident = await database.incident.create({ data: { monitorId: monitor.id, startedAt, confirmedAt: startedAt, failureCode: "TIMEOUT" } });
    await database.incident.update({ where: { id: incident.id }, data: { endedAt: new Date(), endReason: "RECOVERED" } });
    await database.incident.create({ data: { monitorId: monitor.id, startedAt, confirmedAt: startedAt, failureCode: "TIMEOUT" } });
    expect(await database.incident.count({ where: { monitorId: monitor.id } })).toBe(2);
  });

  it("rejects publication of another owner's monitor", async () => {
    const page = await database.statusPage.create({ data: { ownerId: ownerA, slug: `integration-${ownerA}`, title: "Test status" } });
    const foreignMonitor = await createMonitor(ownerB);
    await expect(database.statusPageMonitor.create({ data: {
      statusPageId: page.id, monitorId: foreignMonitor.id, ownerId: ownerA, publicName: "Private service",
    } })).rejects.toMatchObject({ code: "P2003" });
    const ownMonitor = await createMonitor(ownerA);
    await database.statusPageMonitor.create({ data: {
      statusPageId: page.id, monitorId: ownMonitor.id, ownerId: ownerA, publicName: "Public service",
    } });
    expect(await database.statusPageMonitor.count({ where: { statusPageId: page.id } })).toBe(1);
  });

  it("prevents duplicate check cycles and inconsistent completed checks", async () => {
    const monitor = await createMonitor();
    const scheduledAt = new Date();
    const data = { monitorId: monitor.id, scheduledAt, revision: 1 };
    await database.checkRun.create({ data });
    await expect(database.checkRun.create({ data })).rejects.toMatchObject({ code: "P2002" });
    await expect(database.checkRun.create({ data: {
      ...data, scheduledAt: new Date(scheduledAt.getTime() + 1000), state: "COMPLETED",
    } })).rejects.toThrow("CheckRun_completion_consistent");
  });

  it("removes checks and incidents when their monitor is deleted", async () => {
    const monitor = await createMonitor();
    const now = new Date();
    await database.checkRun.create({ data: { monitorId: monitor.id, scheduledAt: now, revision: 1 } });
    await database.incident.create({ data: { monitorId: monitor.id, startedAt: now, confirmedAt: now, failureCode: "TIMEOUT" } });
    await database.monitor.delete({ where: { id: monitor.id } });
    expect(await database.checkRun.count({ where: { monitorId: monitor.id } })).toBe(0);
    expect(await database.incident.count({ where: { monitorId: monitor.id } })).toBe(0);
  });
});
