import type { PrismaClient } from "../../generated/prisma/client";
import { statusPageInput } from "./input";

export class StatusPageError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "CONFLICT" | "SLUG_TAKEN") { super(code); }
}

export class StatusPageService {
  constructor(private readonly database: PrismaClient) {}
  get(ownerId: string) {
    return this.database.statusPage.findUnique({ where: { ownerId }, include: { monitors: { orderBy: { position: "asc" } } } });
  }
  async save(ownerId: string, input: unknown) {
    const data = statusPageInput.parse(input);
    try {
      return await this.database.$transaction(async (tx) => {
        const owners = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "User" WHERE "id" = ${ownerId}::uuid FOR UPDATE`;
        if (!owners.length) throw new StatusPageError("NOT_FOUND");
        // Fixed owner -> monitor -> page lock order. Owner serialization covers
        // first creation; monitor locks also serialize deletion/publication.
        const owned = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Monitor" WHERE "ownerId" = ${ownerId}::uuid ORDER BY "id" FOR UPDATE`;
        const allowed = new Set(owned.map((row) => row.id));
        if (data.monitors.some((item) => !allowed.has(item.id))) throw new StatusPageError("NOT_FOUND");
        const previous = await tx.statusPage.findUnique({ where: { ownerId } });
        if (previous && previous.updatedAt.toISOString() !== data.updatedAt || !previous && data.updatedAt) throw new StatusPageError("CONFLICT");
        const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
        const pageData = { title: data.title, description: data.description || null, slug: data.slug, published: data.published, updatedAt: new Date(Math.max(clock!.now.getTime(), (previous?.updatedAt.getTime() ?? 0) + 1)) };
        const page = previous
          ? await tx.statusPage.update({ where: { id: previous.id }, data: pageData })
          : await tx.statusPage.create({ data: { ...pageData, ownerId } });
        await tx.statusPageMonitor.deleteMany({ where: { statusPageId: page.id } });
        if (data.monitors.length) await tx.statusPageMonitor.createMany({ data: data.monitors.map((item, position) => ({ statusPageId: page.id, ownerId, monitorId: item.id, publicName: item.publicName, position })) });
        return page;
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") throw new StatusPageError("SLUG_TAKEN");
      throw error;
    }
  }
}
