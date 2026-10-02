import { defineConfig } from "vitest/config";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required; use a dedicated disposable test database.");
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    hookTimeout: 15000,
    testTimeout: 10000,
  },
});
