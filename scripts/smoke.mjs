import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";

if (!process.env.TEST_DATABASE_URL) {
  console.error("TEST_DATABASE_URL is required. Run integration tests first to migrate a disposable test database.");
  process.exit(1);
}

const workerId = `smoke-${randomUUID()}`;
const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL, WORKER_ID: workerId };
const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 3000 });
let web;
let worker;

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 3000);
  force.unref();
  await exited;
  clearTimeout(force);
}

try {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));

  worker = spawn(process.execPath, ["--import", "tsx", "src/worker/index.ts"], { env, windowsHide: true });
  let workerOutput = "";
  worker.stdout.on("data", chunk => { workerOutput += chunk; });
  worker.stderr.on("data", chunk => { workerOutput += chunk; });
  for (let attempt = 0; attempt < 75 && !workerOutput.includes("worker_started"); attempt++) await delay(200);
  assert(workerOutput.includes("worker_started"), `Worker failed to start: ${workerOutput}`);
  const heartbeat = await pool.query('SELECT "workerId" FROM "WorkerHeartbeat" WHERE "workerId" = $1', [workerId]);
  assert.equal(heartbeat.rowCount, 1);

  web = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env, stdio: "ignore", windowsHide: true,
  });
  const base = `http://127.0.0.1:${port}`;
  let live;
  for (let attempt = 0; attempt < 75; attempt++) {
    try { live = await fetch(`${base}/api/health/live`, { signal: AbortSignal.timeout(2000) }); if (live.ok) break; } catch {}
    await delay(200);
  }
  assert.equal(live?.status, 200, "web liveness");
  const ready = await fetch(`${base}/api/health/ready`);
  assert.equal(ready.status, 200, "database readiness");
  assert.equal(ready.headers.get("cache-control"), "no-store");
  const page = await fetch(base);
  assert.equal(page.status, 200, "homepage");
  assert((await page.text()).includes("Seus serviços online"));
  console.log("Smoke passed: production web, database readiness and standalone worker heartbeat.");
} finally {
  await stopChild(worker);
  await stopChild(web);
  try { await pool.query('DELETE FROM "WorkerHeartbeat" WHERE "workerId" = $1', [workerId]); }
  finally { await pool.end(); }
}
