import { notFound } from "next/navigation";
import { getDatabase } from "@/server/db";
import { readPublicPage } from "@/features/status-pages/public";
import { statusLabels } from "@/domain/visible-status";
import { LocalTime } from "@/components/local-time";

export const dynamic = "force-dynamic";
export default async function PublicStatus({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await readPublicPage(getDatabase(), slug);
  if (!page) notFound();
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-12"><p className="text-sm font-semibold text-sky-300">LinkWatch · Status dos serviços</p><h1 className="mt-5 break-words text-3xl font-semibold">{page.title}</h1>{page.description && <p className="mt-4 whitespace-pre-wrap break-words text-slate-400">{page.description}</p>}<h2 className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-5 text-lg font-semibold">{page.summary}</h2><p className="mt-3 text-sm text-slate-400">Atualizado em <LocalTime value={page.observedAt} />. Recarregue para atualizar.</p>
    <ul className="mt-8 space-y-5">{page.services.map((service, index) => <li key={index} className="rounded-xl border border-slate-800 p-5"><div className="flex flex-wrap justify-between gap-3"><h3 className="break-words text-xl font-semibold">{service.name}</h3><span className={service.state === "ONLINE" ? "text-green-300" : service.state === "PAUSED" ? "text-slate-400" : "text-amber-300"}>{statusLabels[service.state]}</span></div><p className="mt-3 text-sm text-slate-300">Disponibilidade observada (24 h): {service.availability === null ? "Sem dados" : `${service.availability.toFixed(2).replace(".", ",")}%`} · {service.samples} amostras</p><p className="mt-2 text-sm text-slate-400">Última coleta: {service.lastCompletedAt ? <LocalTime value={service.lastCompletedAt} /> : "Sem dados"}</p>{service.incidents.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm text-sky-300">Incidentes recentes</summary><ul className="mt-3 space-y-3">{service.incidents.map((incident, i) => <li key={i} className="border-t border-slate-800 pt-3 text-sm"><p>{incident.endedAt ? incident.endReason === "RECOVERED" ? "Recuperado" : "Encerrado por mudança de configuração" : "Incidente aberto"}</p><p className="mt-2 text-slate-400">Início: <LocalTime value={incident.startedAt} />{incident.endedAt && <> · Fim: <LocalTime value={incident.endedAt} /></>}</p></li>)}</ul></details>}</li>)}</ul>
    <p className="mt-8 text-sm leading-relaxed text-slate-400">Disponibilidade por verificações de endpoint, sem garantia de SLA. Períodos sem coleta e erros operacionais não contam nas amostras. Serviços pausados aparecem separadamente e não indicam disponibilidade atual.</p>
  </main>;
}
