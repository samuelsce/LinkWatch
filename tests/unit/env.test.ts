import { describe, expect, it } from "vitest";
import { readDatabaseUrl, readWorkerId } from "../../src/config/env";

describe("database configuration", () => {
  it("requires explicit database configuration", () => {
    expect(() => readDatabaseUrl({})).toThrow("DATABASE_URL is required");
  });

  it.each(["postgresql://user:pass@localhost:5432/linkwatch", "postgres://user:pass@db/linkwatch"])("accepts PostgreSQL URL %s", (url) => {
    expect(readDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it.each(["https://user:secret@example.com/db", "postgresql://localhost", "user:secret"])("rejects invalid URL without leaking credentials", (url) => {
    expect(() => readDatabaseUrl({ DATABASE_URL: url })).toThrow("DATABASE_URL must be a PostgreSQL URL");
    try { readDatabaseUrl({ DATABASE_URL: url }); } catch (error) {
      expect(String(error)).not.toContain("secret");
    }
  });
});

describe("worker identity", () => {
  it("defaults to a local development identity", () => {
    expect(readWorkerId({})).toBe("local-worker");
  });

  it("accepts a distinct process identity", () => {
    expect(readWorkerId({ WORKER_ID: "worker-production_2" })).toBe("worker-production_2");
  });

  it.each(["", "worker\nforged_log", "x".repeat(101)])("rejects malformed identities", (workerId) => {
    expect(() => readWorkerId({ WORKER_ID: workerId })).toThrow("WORKER_ID");
  });
});
