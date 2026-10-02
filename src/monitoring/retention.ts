import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client";

export async function retainChecks(database: PrismaClient): Promise<number> {
  const token = randomUUID();
  // A five-minute crash lease becomes a daily schedule after cleanup.
  const claimed = await database.$queryRaw<Array<{ token: string }>>`
    INSERT INTO "MaintenanceLease" ("name", "token", "expiresAt")
    VALUES ('check-retention', ${token}::uuid, clock_timestamp() + interval '5 minutes')
    ON CONFLICT ("name") DO UPDATE SET "token" = EXCLUDED."token", "expiresAt" = EXCLUDED."expiresAt"
    WHERE "MaintenanceLease"."expiresAt" <= clock_timestamp() RETURNING "token"
  `;
  if (!claimed.length) return 0;
  let deleted = 0;
  let full = false;
  for (let batch = 0; batch < 10; batch++) {
    const count = await database.$transaction(async (tx) => {
      const lease = await tx.$queryRaw<Array<{ token: string }>>`
        SELECT "token" FROM "MaintenanceLease" WHERE "name" = 'check-retention'
        AND "token" = ${token}::uuid AND "expiresAt" > clock_timestamp() FOR UPDATE
      `;
      if (!lease.length) return 0;
      return tx.$executeRaw`
        WITH expired AS (
          SELECT "id" FROM "CheckRun" WHERE "state" = 'COMPLETED'
            AND "completedAt" < clock_timestamp() - interval '30 days'
          ORDER BY "completedAt" LIMIT 1000 FOR UPDATE SKIP LOCKED
        ) DELETE FROM "CheckRun" WHERE "id" IN (SELECT "id" FROM expired)
      `;
    });
    deleted += count;
    full = count === 1000;
    if (!full) break;
  }
  // A large backlog is resumed in an hour instead of monopolizing the worker.
  await database.$executeRaw`
    UPDATE "MaintenanceLease" SET "expiresAt" = clock_timestamp() + (${full ? 3600 : 86400} * interval '1 second')
    WHERE "name" = 'check-retention' AND "token" = ${token}::uuid
  `;
  return deleted;
}
