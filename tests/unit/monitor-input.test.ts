import { describe, expect, it } from "vitest";
import { monitorInput, readMonitorLimit } from "../../src/domain/monitor-input";

const valid = { name: "API", url: "https://example.com/health", intervalSeconds: "300", timeoutMs: "10000", expectedStatus: "200" };

describe("monitor input", () => {
  it("normalizes fields and coerces form numbers", () => {
    expect(monitorInput.parse({ ...valid, name: "  API  ", url: "https://EXAMPLE.com" })).toMatchObject({ name: "API", url: "https://example.com/", intervalSeconds: 300 });
  });
  it.each([
    "ftp://example.com", "https://user:secret@example.com", "http://localhost", "http://host.internal",
    "http://127.1", "http://2130706433", "http://0x7f000001", "http://[::1]", "http://[::ffff:127.0.0.1]",
    "http://10.0.0.1", "http://169.254.169.254", "http://192.168.1.1", "http://[fc00::1]",
    "http://example.com:8080", "https://example.com/#fragment", "https://example.com/\nhealth",
  ])("rejects unsafe or unsupported URL %s", (url) => {
    expect(monitorInput.safeParse({ ...valid, url }).success).toBe(false);
  });
  it.each(["http://example.com", "https://example.com:443/health?mode=public", "https://8.8.8.8", "https://[2606:4700:4700::1111]"])("accepts public target %s", (url) => {
    expect(monitorInput.safeParse({ ...valid, url }).success).toBe(true);
  });
  it.each([
    { name: " " }, { name: "x".repeat(81) }, { intervalSeconds: "42" }, { timeoutMs: "1999" },
    { timeoutMs: "15001" }, { expectedStatus: "199" }, { expectedStatus: "600" }, { expectedStatus: "200.5" },
  ])("rejects invalid configuration %j", (change) => {
    expect(monitorInput.safeParse({ ...valid, ...change }).success).toBe(false);
  });
  it("does not trust ownerId from submitted data", () => {
    expect(monitorInput.parse({ ...valid, ownerId: "attacker-selected-owner" })).not.toHaveProperty("ownerId");
  });
});

it("validates the server monitor limit", () => {
  expect(readMonitorLimit({})).toBe(10);
  expect(readMonitorLimit({ MONITOR_LIMIT: "2" })).toBe(2);
  expect(() => readMonitorLimit({ MONITOR_LIMIT: "-1" })).toThrow("MONITOR_LIMIT");
});
