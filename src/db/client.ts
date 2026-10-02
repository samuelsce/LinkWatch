import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { readDatabaseUrl } from "../config/env";

export function createDatabaseClient(connectionString = readDatabaseUrl()) {
  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    // Prisma's pg adapter expects timestamp values returned in UTC.
    options: "-c timezone=UTC",
  });
  return new PrismaClient({ adapter });
}
