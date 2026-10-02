import type { PrismaClient } from "../generated/prisma/client";
import packageInfo from "../../package.json" with { type: "json" };

export async function writeHeartbeat(database: PrismaClient, workerId: string) {
  // Use the database clock, keeping freshness comparisons consistent.
  await database.$executeRaw`
    INSERT INTO "WorkerHeartbeat" ("workerId", "lastSeenAt", "version")
    VALUES (${workerId}, CURRENT_TIMESTAMP, ${packageInfo.version})
    ON CONFLICT ("workerId") DO UPDATE
    SET "lastSeenAt" = CURRENT_TIMESTAMP, "version" = EXCLUDED."version"
  `;
}
