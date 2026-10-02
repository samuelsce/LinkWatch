import { setTimeout as delay } from "node:timers/promises";

type WorkerEvent = "worker_started" | "worker_heartbeat_failed" | "worker_stopped";
type LoopDependencies = {
  heartbeat: () => Promise<void>;
  log: (event: WorkerEvent) => void;
  wait?: (signal: AbortSignal) => Promise<void>;
};

async function waitForNextHeartbeat(signal: AbortSignal) {
  try {
    await delay(5000, undefined, { signal });
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}

// M0 runs only a heartbeat. Scheduling and HTTP probes are delivered in M2.
export async function runWorkerLoop(dependencies: LoopDependencies, signal: AbortSignal) {
  const wait = dependencies.wait ?? waitForNextHeartbeat;
  if (signal.aborted) return;

  // Fail startup if the database/schema is unavailable; do not claim readiness.
  await dependencies.heartbeat();
  dependencies.log("worker_started");

  while (!signal.aborted) {
    await wait(signal);
    if (signal.aborted) break;
    try {
      await dependencies.heartbeat();
    } catch {
      dependencies.log("worker_heartbeat_failed");
    }
  }

  dependencies.log("worker_stopped");
}
