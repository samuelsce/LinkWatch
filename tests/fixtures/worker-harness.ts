// Dedicated test-process entrypoint. Never imported by src/ or deployed.
import { createDatabaseClient } from "../../src/db/client";
import { WorkerRuntime } from "../../src/worker/runtime";
import { runWorkerLoop } from "../../src/worker/loop";
import { writeHeartbeat } from "../../src/worker/heartbeat";
import { probe, requestHeaders } from "../../src/monitoring/probe";
import { setTimeout as delay } from "node:timers/promises";

const url = process.env.TEST_DATABASE_URL;
const port = Number(process.env.LINKWATCH_FIXTURE_PORT);
if (!url || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("An isolated test database and HTTP fixture are required.");
const database = createDatabaseClient(url);
const stop = new AbortController();
process.once("SIGTERM", () => stop.abort());
process.once("SIGINT", () => stop.abort());
const runtime = new WorkerRuntime(database, () => {}, (job, signal) => probe(job, signal, {
  resolve: async () => [{ address: "93.184.216.34", family: 4 }],
  headers: (target, abort) => requestHeaders({ ...target, address: "127.0.0.1", family: 4, url: new URL(`http://fixture.example.com:${port}/health`) }, abort),
}));
try {
  await runWorkerLoop({ heartbeat: () => writeHeartbeat(database, process.env.WORKER_ID!), tick: () => runtime.tick(), drain: () => runtime.drain(), log: () => {}, wait: async (signal) => { try { await delay(100, undefined, { signal }); } catch { if (!signal.aborted) throw new Error("test wait failed"); } } }, stop.signal);
} finally { await runtime.drain(); await database.$disconnect(); }
