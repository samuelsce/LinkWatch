import Link from "next/link";
import { ownedMonitor } from "@/server/owned-monitor";
import { MonitorStatus } from "@/components/monitor-status";
import { MonitorControls } from "@/components/monitor-controls";
import { databaseTime } from "@/server/current-time";

export default async function MonitorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const monitor = await ownedMonitor(id);
  const now = await databaseTime();
  return (
    <>
      <Link href="/dashboard" className="text-sm text-sky-400">← Seus monitores</Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold break-words">{monitor.name}</h1><p className="mt-3 text-sm break-all text-slate-400">{monitor.url}</p><div className="mt-4"><MonitorStatus monitor={monitor} now={now} /></div></div><Link href={`/monitors/${id}/edit`} className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800">Editar monitor</Link></div>
      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        {[ ["Intervalo", `${monitor.intervalSeconds / 60} minutos`], ["Timeout", `${monitor.timeoutMs / 1000} segundos`], ["HTTP esperado", monitor.expectedStatus] ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><dt className="text-sm text-slate-400">{label}</dt><dd className="mt-3 text-xl font-semibold">{value}</dd></div>)}
      </dl>
      <section className="mt-8 rounded-xl border border-dashed border-slate-700 p-6"><h2 className="text-lg font-semibold">Histórico de verificações</h2><p className="mt-3 text-slate-400">Sem dados. A coleta automática ainda não está disponível nesta versão.</p></section>
      <MonitorControls id={id} updatedAt={monitor.updatedAt.toISOString()} enabled={monitor.enabled} />
    </>
  );
}
