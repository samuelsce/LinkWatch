import { spawnSync } from "node:child_process";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error("Set TEST_DATABASE_URL to a dedicated disposable PostgreSQL database. Integration tests apply migrations there.");
  process.exit(1);
}

// Never fall back to the application's DATABASE_URL.
const env = { ...process.env, DATABASE_URL: testUrl };
for (const args of [
  ["node_modules/prisma/build/index.js", "generate"],
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.integration.config.ts"],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env });
  if (result.error || result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
