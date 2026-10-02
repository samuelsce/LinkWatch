import { setTimeout as delay } from "node:timers/promises";

type WorkerEvent = "worker_started" | "worker_heartbeat_failed" | "worker_tick_failed" | "worker_stopped";
type LoopDependencies = {
  heartbeat: () => Promise<void>;
  log: (event: WorkerEvent) => void;
  wait?: (signal: AbortSignal) => Promise<void>;
  tick?: () => Promise<void>;
  drain?: () => Promise<void>;
};

async function waitForNextHeartbeat(signal: AbortSignal) {
  try {
    await delay(5000, undefined, { signal });
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}

export async function runWorkerLoop(dependencies: LoopDependencies, signal: AbortSignal) {
  const wait = dependencies.wait ?? waitForNextHeartbeat;
  if (signal.aborted) return;

  // Fail startup if the database/schema is unavailable; do not claim readiness.
  await dependencies.heartbeat();
  dependencies.log("worker_started");

  const tick = async () => {
    if (signal.aborted) return;
    try { await dependencies.tick?.(); }
    catch { dependencies.log("worker_tick_failed"); }
  };
  await tick();

  while (!signal.aborted) {
    await wait(signal);
    if (signal.aborted) break;
    await tick();
    try {
      await dependencies.heartbeat();
    } catch {
      dependencies.log("worker_heartbeat_failed");
    }
  }

  await dependencies.drain?.();
  dependencies.log("worker_stopped");
}
