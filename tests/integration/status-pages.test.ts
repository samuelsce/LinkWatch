import { afterAll, afterEach, beforeEach, expect, it } from "vitest";
import { createDatabaseClient } from "../../src/db/client";
import { StatusPageService } from "../../src/features/status-pages/service";
import { readPublicPage } from "../../src/features/status-pages/public";
import { monitorHistory } from "../../src/features/monitors/history";

const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);
const service = new StatusPageService(database);
let owner: string;
let other: string;
let id: string;
beforeEach(async () => {
  owner = (await database.user.create({ data: { name: "Private identity", email: `private-${crypto.randomUUID()}@example.com` } })).id;
  other = (await database.user.create({ data: {} })).id;
  id = (await database.monitor.create({ data: { ownerId: owner, name: "Secret internal label", url: "https://example.com/private?token=do-not-expose", status: "ONLINE", lastCompletedAt: new Date() } })).id;
});
afterEach(async () => { await database.user.deleteMany({ where: { id: { in: [owner, other] } } }); });
afterAll(async () => { await database.$disconnect(); });
const configuration = () => ({ title: "Public status", description: "Public description", slug: `status-${owner}`, monitors: [{ id, publicName: "Public API" }] });

it("starts unpublished and returns a strict public projection without private fields", async () => {
  const draft = await service.save(owner, configuration());
  expect(await readPublicPage(database, draft.slug)).toBeNull();
  const now = new Date();
  await database.checkRun.create({ data: { monitorId: id, scheduledAt: now, completedAt: now, revision: 1, state: "COMPLETED", outcome: "FAILURE", errorCode: "PRIVATE_TECHNICAL_DETAIL" } });
  await database.incident.create({ data: { monitorId: id, startedAt: now, confirmedAt: now, failureCode: "PRIVATE_INCIDENT_DETAIL" } });
  await service.save(owner, { ...configuration(), published: true, updatedAt: draft.updatedAt.toISOString() });
  const result = await readPublicPage(database, draft.slug);
  expect(result?.services[0]).toMatchObject({ name: "Public API", samples: 1, availability: 0 });
  expect(Object.keys(result!.services[0]!).sort()).toEqual(["availability", "incidents", "lastCompletedAt", "name", "samples", "state"]);
  const text = JSON.stringify(result);
  for (const secret of [owner, id, "do-not-expose", "Secret internal label", "Private identity", "PRIVATE_TECHNICAL_DETAIL", "PRIVATE_INCIDENT_DETAIL", "example.com"]) expect(text).not.toContain(secret);
});
it("rejects foreign selections and leaves previous configuration unchanged", async () => {
  const own = await service.save(owner, configuration());
  const foreign = await database.monitor.create({ data: { ownerId: other, name: "Foreign", url: "https://example.com" } });
  await expect(service.save(owner, { ...configuration(), updatedAt: own.updatedAt.toISOString(), published: true, monitors: [{ id: foreign.id, publicName: "Hijacked" }] })).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(await service.get(owner)).toMatchObject({ published: false, monitors: [{ monitorId: id }] });
  expect(await service.get(other)).toBeNull();
});
it("handles slug competition and stale forms without overwriting data", async () => {
  const slug = `shared-${owner}`;
  const results = await Promise.allSettled([service.save(owner, { ...configuration(), slug }), service.save(other, { title: "Other", slug, monitors: [] })]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect((results.find((result) => result.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ code: "SLUG_TAKEN" });
  const winningOwner = await service.get(owner) ? owner : other;
  const previous = (await service.get(winningOwner))!;
  await service.save(winningOwner, { title: "Changed", slug, monitors: [], updatedAt: previous.updatedAt.toISOString() });
  await expect(service.save(winningOwner, { title: "Stale", slug, monitors: [], updatedAt: previous.updatedAt.toISOString() })).rejects.toMatchObject({ code: "CONFLICT" });
});
it("unpublishing and slug rename remove the old public endpoint", async () => {
  const page = await service.save(owner, { ...configuration(), published: true });
  const renamed = await service.save(owner, { ...configuration(), slug: `new-${owner}`, published: true, updatedAt: page.updatedAt.toISOString() });
  expect(await readPublicPage(database, page.slug)).toBeNull();
  expect(await readPublicPage(database, renamed.slug)).not.toBeNull();
  await service.save(owner, { ...configuration(), slug: renamed.slug, published: false, updatedAt: renamed.updatedAt.toISOString() });
  expect(await readPublicPage(database, renamed.slug)).toBeNull();
});
it("publishes only selected services and handles paused-only and empty selections", async () => {
  await database.monitor.create({ data: { ownerId: owner, name: "Never selected", url: "https://example.com" } });
  await database.monitor.update({ where: { id }, data: { enabled: false, status: "PAUSED" } });
  const page = await service.save(owner, { ...configuration(), published: true });
  expect(await readPublicPage(database, page.slug)).toMatchObject({ summary: "Nenhum serviço ativo publicado", services: [{ name: "Public API", state: "PAUSED" }] });
  await service.save(owner, { ...configuration(), monitors: [], published: true, updatedAt: page.updatedAt.toISOString() });
  expect(await readPublicPage(database, page.slug)).toMatchObject({ summary: "Nenhum serviço ativo publicado", services: [] });
});
it("graph buckets retain gaps, failures and operational errors without inventing zero latency", async () => {
  const now = Date.now();
  const entries = [{ ago: 1200000, outcome: "SUCCESS" as const, latencyMs: 100 }, { ago: 1200001, outcome: "SUCCESS" as const, latencyMs: 200 }, { ago: 600000, outcome: "FAILURE" as const, latencyMs: null }, { ago: 1000, outcome: "BLOCKED" as const, latencyMs: null }];
  for (const entry of entries) {
    const time = new Date(now - entry.ago);
    await database.checkRun.create({ data: { monitorId: id, scheduledAt: time, completedAt: time, revision: 1, state: "COMPLETED", outcome: entry.outcome, latencyMs: entry.latencyMs } });
  }
  for (const [hours, seconds] of [[24, 300], [168, 3600], [720, 21600]]) {
    const history = await monitorHistory(database, owner, id, hours);
    expect(history.bucketSeconds).toBe(seconds);
    expect(history.buckets.reduce((total, bucket) => total + bucket.samples, 0)).toBe(3);
    expect(history.buckets.some((bucket) => bucket.samples === 0 && bucket.averageMs === null)).toBe(true);
    expect(history.p95Ms).toBe(200);
  }
  const history = await monitorHistory(database, owner, id);
  expect(history.buckets.find((bucket) => bucket.failures)?.averageMs).toBeNull();
  expect(history.buckets.find((bucket) => bucket.operational)?.averageMs).toBeNull();
});
