import { requireUser } from "@/server/session";
import Link from "next/link";
import { getDatabase } from "@/server/db";
import { MonitorService } from "@/features/monitors/service";
import { readMonitorLimit } from "@/domain/monitor-input";
import { MonitorStatus } from "@/components/monitor-status";
import { databaseTime } from "@/server/current-time";

export default async function Dashboard() {
  const user = await requireUser();
  const monitors = await new MonitorService(getDatabase()).list(user.id);
  const limit = readMonitorLimit();
  const now = await databaseTime();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold">Seus monitores</h1><p className="mt-2 text-sm text-slate-400">{monitors.length} de {limit} monitores cadastrados</p></div>{monitors.length < limit && <Link href="/monitors/new" className="rounded-lg bg-sky-400 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-300">Novo monitor</Link>}</div>
      <p className="mt-6 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">Cadastro disponível. A coleta automática de disponibilidade será adicionada na próxima entrega.</p>
      {!monitors.length ? <section className="mt-8 rounded-xl border border-dashed border-slate-700 p-10 text-center"><h2 className="text-xl font-semibold">Seu primeiro serviço começa aqui</h2><p className="mt-3 text-slate-400">Cadastre um site ou endpoint público para preparar o monitoramento.</p><Link href="/monitors/new" className="mt-6 inline-block text-sky-400 underline">Criar primeiro monitor</Link></section> : <ul className="mt-8 grid gap-4">
        {monitors.map((monitor) => <li key={monitor.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><Link href={`/monitors/${monitor.id}`} className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><h2 className="text-lg font-semibold">{monitor.name}</h2><p className="mt-2 max-w-full text-sm break-all text-slate-400">{monitor.url}</p></div><div className="space-y-2"><MonitorStatus monitor={monitor} now={now} /><p className="text-sm text-slate-400">A cada {monitor.intervalSeconds / 60} min</p></div></Link></li>)}
      </ul>}
    </>
  );
}
