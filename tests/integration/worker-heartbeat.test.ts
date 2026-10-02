import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { createDatabaseClient } from "../../src/db/client";
import { writeHeartbeat } from "../../src/worker/heartbeat";

const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);
const workerId = `test-worker-${randomUUID()}`;

afterAll(async () => {
  try { await database.workerHeartbeat.deleteMany({ where: { workerId } }); }
  finally { await database.$disconnect(); }
});

it("replaces stale heartbeat using the database clock without adding duplicate workers", async () => {
  await database.workerHeartbeat.create({ data: { workerId, lastSeenAt: new Date("2000-01-01T00:00:00Z"), version: "old" } });
  await writeHeartbeat(database, workerId);
  await writeHeartbeat(database, workerId);
  const rows = await database.$queryRaw<Array<{ age: number; version: string }>>`
    SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - "lastSeenAt"))::float AS age, "version"
    FROM "WorkerHeartbeat" WHERE "workerId" = ${workerId}
  `;
  expect(rows).toHaveLength(1);
  expect(rows[0]!.age).toBeGreaterThanOrEqual(0);
  expect(rows[0]!.age).toBeLessThan(5);
  expect(rows[0]!.version).toBe("0.1.0");
});
