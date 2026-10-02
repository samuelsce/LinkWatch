import "dotenv/config";
import { readWorkerId } from "../config/env";
import { createDatabaseClient } from "../db/client";
import { writeHeartbeat } from "./heartbeat";
import { runWorkerLoop } from "./loop";

async function main() {
  const workerId = readWorkerId();
  const database = createDatabaseClient();
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    await runWorkerLoop({
      heartbeat: () => writeHeartbeat(database, workerId),
      log: (event) => console.log(JSON.stringify({ event, workerId, mode: "heartbeat_only", time: new Date().toISOString() })),
    }, controller.signal);
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    await database.$disconnect();
  }
}

main().catch(() => {
  // Driver errors may include credentials; log a fixed, actionable message.
  console.error(JSON.stringify({ event: "worker_startup_failed", message: "Check DATABASE_URL, PostgreSQL availability, migrations and WORKER_ID." }));
  process.exitCode = 1;
});
