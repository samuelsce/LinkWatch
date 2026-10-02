import { describe, expect, it, vi } from "vitest";
import { runWorkerLoop } from "../../src/worker/loop";

describe("worker lifecycle", () => {
  it("does not start after shutdown was requested", async () => {
    const controller = new AbortController();
    controller.abort();
    const heartbeat = vi.fn();
    await runWorkerLoop({ heartbeat, log: vi.fn() }, controller.signal);
    expect(heartbeat).not.toHaveBeenCalled();
  });

  it("fails startup when the database is unavailable", async () => {
    const log = vi.fn();
    await expect(runWorkerLoop({
      heartbeat: async () => { throw new Error("database unavailable"); }, log,
    }, new AbortController().signal)).rejects.toThrow("database unavailable");
    expect(log).not.toHaveBeenCalled();
  });

  it("waits for an in-flight heartbeat before stopping", async () => {
    const controller = new AbortController();
    let finish!: () => void;
    const heartbeat = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const log = vi.fn();
    const running = runWorkerLoop({ heartbeat, log }, controller.signal);
    controller.abort();
    expect(log).not.toHaveBeenCalledWith("worker_stopped");
    finish();
    await running;
    expect(heartbeat).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenLastCalledWith("worker_stopped");
  });

  it("recovers from a later failure without overlapping heartbeats", async () => {
    const controller = new AbortController();
    let calls = 0;
    const log = vi.fn();
    await runWorkerLoop({
      heartbeat: async () => {
        calls++;
        if (calls === 2) throw new Error("temporary failure with private details");
        if (calls === 3) controller.abort();
      },
      wait: async () => {},
      log,
    }, controller.signal);
    expect(calls).toBe(3);
    expect(log.mock.calls).toEqual([["worker_started"], ["worker_heartbeat_failed"], ["worker_stopped"]]);
  });

  it("shutdown interrupts the waiting period", async () => {
    const controller = new AbortController();
    const heartbeat = vi.fn(async () => {});
    const running = runWorkerLoop({ heartbeat, log: vi.fn() }, controller.signal);
    await Promise.resolve();
    controller.abort();
    await running;
    expect(heartbeat).toHaveBeenCalledTimes(1);
  });
  it("stops scheduling and waits for active work to drain", async () => {
    const controller = new AbortController();
    let finish!: () => void;
    const drain = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const log = vi.fn();
    const running = runWorkerLoop({ heartbeat: async () => {}, tick: async () => { controller.abort(); }, drain, log }, controller.signal);
    for (let attempt = 0; attempt < 10 && !finish; attempt++) await Promise.resolve();
    expect(drain).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalledWith("worker_stopped");
    finish(); await running;
    expect(log).toHaveBeenLastCalledWith("worker_stopped");
  });
});
