import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";
import { createDatabaseClient } from "../../src/db/client";
import { WorkerRuntime } from "../../src/worker/runtime";
import { probe, requestHeaders } from "../../src/monitoring/probe";
import type { ProbeResult } from "../../src/monitoring/probe";

it("the running collector persists a real HTTP outage and recovery, and drains on shutdown", async () => {
  const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);
  let status = 200;
  const server = createServer((_request, response) => { response.writeHead(status); response.end("fixture"); });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  const owner = await database.user.create({ data: {} });
  const events: string[] = [];
  const runtime = new WorkerRuntime(database, (event) => events.push(String(event.event)), (job, signal) => probe(job, signal, {
    resolve: async () => [{ address: "93.184.216.34", family: 4 }],
    headers: (target, abort) => requestHeaders({ ...target, address: "127.0.0.1", family: 4, url: new URL(`http://fixture.example.com:${port}/health`) }, abort),
  }));
  try {
    const monitor = await database.monitor.create({ data: { ownerId: owner.id, name: "HTTP cycle", url: "http://fixture.example.com/health", timeoutMs: 2000, intervalSeconds: 60 } });
    const expected = ["ONLINE", "UNSTABLE", "OFFLINE", "ONLINE"];
    for (let index = 0; index < 4; index++) {
      status = index === 1 || index === 2 ? 503 : 200;
      // Advance the fixture's due time, without shortening production intervals.
      await database.$executeRaw`UPDATE "Monitor" SET "nextCheckAt" = ${new Date(Date.now() - (index + 1) * 1000)} WHERE "id" = ${monitor.id}::uuid`;
      await runtime.tick();
      for (let attempt = 0; attempt < 100 && events.filter((event) => event === "check_completed").length <= index; attempt++) await delay(10);
      expect((await database.monitor.findUniqueOrThrow({ where: { id: monitor.id } })).status).toBe(expected[index]);
    }
    expect(await database.checkRun.count({ where: { monitorId: monitor.id, state: "COMPLETED" } })).toBe(4);
    expect(await database.incident.findMany({ where: { monitorId: monitor.id } })).toHaveLength(1);
    expect(await database.incident.findFirst({ where: { monitorId: monitor.id } })).toMatchObject({ endReason: "RECOVERED" });
    await runtime.drain();
    await database.$executeRaw`UPDATE "Monitor" SET "nextCheckAt" = clock_timestamp() WHERE "id" = ${monitor.id}::uuid`;
    await runtime.tick();
    expect(await database.checkRun.count({ where: { monitorId: monitor.id } })).toBe(4);
  } finally {
    await runtime.drain();
    await database.user.delete({ where: { id: owner.id } });
    await database.$disconnect();
    server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

it("reserves only five concurrent jobs and leaves the sixth unclaimed until a slot is free", async () => {
  const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);
  const owner = await database.user.create({ data: {} });
  const finish: Array<(value: ProbeResult) => void> = [];
  const runtime = new WorkerRuntime(database, () => {}, () => new Promise<ProbeResult>((resolve) => finish.push(resolve)));
  try {
    await database.monitor.createMany({ data: Array.from({ length: 6 }, (_, index) => ({ ownerId: owner.id, name: `Slot ${index}`, url: "https://example.com/health" })) });
    await runtime.tick(); await runtime.tick();
    expect(finish).toHaveLength(5);
    expect(await database.checkRun.count({ where: { monitor: { ownerId: owner.id }, state: "RUNNING" } })).toBe(5);
    finish.forEach((resolve) => resolve({ outcome: "SUCCESS", latencyMs: 10, httpStatus: 200 }));
    await runtime.drain();
  } finally {
    finish.forEach((resolve) => resolve({ outcome: "COLLECTOR_ERROR" }));
    await runtime.drain();
    await database.user.delete({ where: { id: owner.id } });
    await database.$disconnect();
  }
});
