import { z } from "zod";
export const statusSlug = z.string().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const statusPageInput = z.object({
  title: z.string().trim().min(1, "Informe um título.").max(120),
  description: z.string().trim().max(500).default(""),
  slug: statusSlug,
  published: z.boolean().default(false),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
  monitors: z.array(z.object({ id: z.uuid(), publicName: z.string().trim().min(1).max(80) })).max(100)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, "Não repita monitores."),
});
export type StatusPageInput = z.output<typeof statusPageInput>;
