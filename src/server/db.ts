import "server-only";
import { createDatabaseClient } from "../db/client";

// Lazy creation lets static pages build without database credentials.
const globalDatabase = globalThis as unknown as {
  linkwatchDatabase?: ReturnType<typeof createDatabaseClient>;
};

export function getDatabase() {
  globalDatabase.linkwatchDatabase ??= createDatabaseClient();
  return globalDatabase.linkwatchDatabase;
}
