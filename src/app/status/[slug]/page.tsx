import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabase } from "@/server/db";
import { readPublicPage } from "@/features/status-pages/public";
import { statusLabels } from "@/domain/visible-status";
import { LocalTime } from "@/components/local-time";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";
export default async function PublicStatus({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await readPublicPage(getDatabase(), slug);
  if (!page) notFound();
  return <div className="mx-auto min-h-screen max-w-3xl px-5 sm:px-8">
    <header className="site-header border-b border-soft"><Link href="/" aria-label="LinkWatch, início"><Brand /></Link><div className="header-actions"><span className="hidden text-sm muted sm:inline">Status dos serviços</span><ThemeToggle /></div></header>
    <main className="py-10" id="main-content">
      <h1 className="break-words text-3xl font-semibold tracking-tight">{page.title}</h1>
      {page.description && <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed muted">{page.description}</p>}
      <h2 className="public-summary surface mt-8 rounded-md py-5 px-6 text-lg font-semibold">{page.summary}</h2>
      <p className="mt-3 text-xs muted">Atualizado em <LocalTime value={page.observedAt} />. Recarregue para atualizar.</p>
      <ul className="monitor-list mt-8">{page.services.map((service, index) => <li key={index} className="monitor-row p-5 sm:p-6">
        <div className="flex flex-wrap justify-between gap-3"><h3 className="min-w-0 max-w-full break-words text-lg font-semibold">{service.name}</h3><span className={`status-badge ${service.state === "ONLINE" ? "positive" : service.state === "OFFLINE" ? "negative" : ["UNKNOWN", "PAUSED"].includes(service.state) ? "muted" : "warning"}`}><span className="status-dot !mr-0" aria-hidden="true" />{statusLabels[service.state]}</span></div>
        <p className="mt-3 text-sm muted">Disponibilidade observada (24 h): <span className="font-semibold text-[var(--ink)]">{service.availability === null ? "Sem dados" : `${service.availability.toFixed(2).replace(".", ",")}%`}</span> · {service.samples} amostras</p>
        <p className="mt-2 text-xs muted">Última coleta: {service.lastCompletedAt ? <LocalTime value={service.lastCompletedAt} /> : "Sem dados"}</p>
        {service.incidents.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm link">Incidentes recentes</summary><ul className="mt-3 space-y-3">{service.incidents.map((incident, i) => <li key={i} className="border-t border-soft pt-3 text-sm"><p className="font-medium">{incident.endedAt ? incident.endReason === "RECOVERED" ? "Recuperado" : "Encerrado por mudança de configuração" : "Incidente aberto"}</p><p className="mt-2 muted">Início: <LocalTime value={incident.startedAt} />{incident.endedAt && <> · Fim: <LocalTime value={incident.endedAt} /></>}</p></li>)}</ul></details>}
      </li>)}</ul>
      <p className="mt-6 text-xs leading-relaxed muted">Disponibilidade por verificações de endpoint, sem garantia de SLA. Períodos sem coleta e erros operacionais não contam nas amostras. Serviços pausados não indicam disponibilidade atual.</p>
    </main>
    <footer className="site-footer"><span>Monitoramento com LinkWatch</span></footer>
  </div>;
}
