import { randomUUID } from "node:crypto";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { afterAll, expect, it } from "vitest";
import { createDatabaseClient } from "../../src/db/client";

const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);
const adapter = PrismaAdapter(database);
const owners: string[] = [];

afterAll(async () => {
  try { await database.user.deleteMany({ where: { id: { in: owners } } }); }
  finally { await database.$disconnect(); }
});

it("persists a GitHub identity and resolves its database session through the official adapter", async () => {
  const user = await adapter.createUser!({ id: randomUUID(), email: `adapter-${randomUUID()}@example.invalid`, emailVerified: null, name: "Adapter test" });
  owners.push(user.id);
  const providerAccountId = randomUUID();
  await adapter.linkAccount!({ userId: user.id, type: "oauth", provider: "github", providerAccountId });
  expect((await adapter.getUserByAccount!({ provider: "github", providerAccountId }))?.id).toBe(user.id);
  const sessionToken = randomUUID();
  await adapter.createSession!({ userId: user.id, sessionToken, expires: new Date(Date.now() + 60000) });
  expect((await adapter.getSessionAndUser!(sessionToken))?.user.id).toBe(user.id);
  await adapter.deleteSession!(sessionToken);
  expect(await adapter.getSessionAndUser!(sessionToken)).toBeNull();
});
