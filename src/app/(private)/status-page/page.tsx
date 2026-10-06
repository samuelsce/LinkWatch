import Link from "next/link";
import { requireUser } from "@/server/session";
import { getDatabase } from "@/server/db";
import { StatusPageService } from "@/features/status-pages/service";
import { StatusPageForm } from "@/components/status-page-form";

export default async function StatusSettings() {
  const user = await requireUser();
  const database = getDatabase();
  const [page, monitors] = await Promise.all([
    new StatusPageService(database).get(user.id),
    database.monitor.findMany({ where: { ownerId: user.id }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return <><h1 className="text-3xl font-semibold">Sua página de status</h1><p className="mt-3 muted">Publique somente os serviços que deseja compartilhar.</p>{page && <p className="mt-4 text-sm">{page.published ? "Publicada" : "Despublicada"} · {page.published ? <Link href={`/status/${page.slug}`} className="link underline">Abrir página pública</Link> : "Visitantes recebem 404 enquanto a página estiver despublicada."}</p>}<StatusPageForm key={page?.updatedAt.toISOString() ?? "new"} page={page ? { title: page.title, description: page.description, slug: page.slug, published: page.published, updatedAt: page.updatedAt.toISOString(), monitors: page.monitors.map((item) => ({ monitorId: item.monitorId, publicName: item.publicName })) } : null} monitors={monitors} /></>;
}
