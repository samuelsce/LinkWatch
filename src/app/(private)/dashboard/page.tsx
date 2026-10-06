import { requireUser } from "@/server/session";
import Link from "next/link";
import { getDatabase } from "@/server/db";
import { MonitorService } from "@/features/monitors/service";
import { readMonitorLimit } from "@/domain/monitor-input";
import { MonitorStatus } from "@/components/monitor-status";
import { databaseTime } from "@/server/current-time";
import { visibleStatus } from "@/domain/visible-status";

export default async function Dashboard() {
  const user = await requireUser();
  const monitors = await new MonitorService(getDatabase()).list(user.id);
  const limit = readMonitorLimit();
  const now = await databaseTime();
  const states = monitors.map((monitor) => visibleStatus(monitor, now));
  const metrics = [
    ["Online", states.filter((state) => state === "ONLINE").length],
    ["Instáveis/offline", states.filter((state) => state === "UNSTABLE" || state === "OFFLINE").length],
    ["Sem observação recente", states.filter((state) => state === "UNKNOWN" || state === "STALE").length],
    ["Pausados", states.filter((state) => state === "PAUSED").length],
  ];
  return <>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-semibold">Seus monitores</h1><p className="mt-2 text-sm muted">{monitors.length} de {limit} monitores cadastrados</p></div>{monitors.length < limit && <Link href="/monitors/new" className="button-primary px-5 py-3"><span aria-hidden="true" className="text-lg">+</span>Novo monitor</Link>}</div>
    <dl className="metrics mt-8 grid grid-cols-2 sm:grid-cols-4">{metrics.map(([label, count]) => <div key={label} className="metric"><dt className="text-sm muted">{label}</dt><dd className="mt-3 text-3xl font-semibold tracking-tight">{count}</dd></div>)}</dl>
    <div className="mt-9 mb-4 flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Serviços monitorados</h2><p className="text-sm muted">Recarregue a página para atualizar.</p></div>
    {!monitors.length ? <section className="surface rounded-lg border border-dashed border-soft px-6 py-12 text-center"><h2 className="text-xl font-semibold">Seu primeiro serviço começa aqui</h2><p className="mt-3 muted">Cadastre um site ou endpoint público para começar a acompanhar sua disponibilidade.</p><Link href="/monitors/new" className="button-secondary mt-6 px-5 py-3">Criar primeiro monitor</Link></section> : <ul className="monitor-list">
      {monitors.map((monitor) => <li key={monitor.id} className="monitor-row"><Link href={`/monitors/${monitor.id}`} className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0 max-w-full"><h3 className="break-words text-base font-semibold">{monitor.name}</h3><p className="mt-1 max-w-full text-sm break-all muted">{monitor.url}</p></div><div className="space-y-2"><MonitorStatus monitor={monitor} now={now} /><p className="text-xs muted">A cada {monitor.intervalSeconds / 60} min</p></div></Link></li>)}
    </ul>}
    <p className="mt-5 text-sm muted">As verificações continuam mesmo com o painel fechado.</p>
  </>;
}
