import Link from "next/link";
import { ownedMonitor } from "@/server/owned-monitor";
import { MonitorStatus } from "@/components/monitor-status";
import { MonitorControls } from "@/components/monitor-controls";
import { databaseTime } from "@/server/current-time";
import { getDatabase } from "@/server/db";
import { monitorHistory, historyWindows } from "@/features/monitors/history";
import { MonitorHistory } from "@/components/monitor-history";

export default async function MonitorDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ hours?: string }> }) {
  const { id } = await params;
  const monitor = await ownedMonitor(id);
  const now = await databaseTime();
  const requested = Number((await searchParams).hours ?? 24);
  const hours = historyWindows.includes(requested as 24 | 168 | 720) ? requested : 24;
  const history = await monitorHistory(getDatabase(), monitor.ownerId, id, hours);
  return (
    <>
      <Link href="/dashboard" className="text-sm link">Voltar aos monitores</Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 max-w-full"><h1 className="text-3xl font-semibold break-words">{monitor.name}</h1><p className="mt-3 text-sm break-all muted">{monitor.url}</p><div className="mt-4"><MonitorStatus monitor={monitor} now={now} /></div></div><Link href={`/monitors/${id}/edit`} className="button-secondary px-4 py-2">Editar monitor</Link></div>
      <dl className="mt-8 grid gap-4 border-y border-soft py-6 sm:grid-cols-3">
        {[ ["Intervalo", `${monitor.intervalSeconds / 60} minutos`], ["Timeout", `${monitor.timeoutMs / 1000} segundos`], ["HTTP esperado", monitor.expectedStatus] ].map(([label, value]) => <div key={label} className="px-1"><dt className="text-sm muted">{label}</dt><dd className="mt-3 text-xl font-semibold">{value}</dd></div>)}
      </dl>
      <MonitorHistory id={id} hours={hours} history={history} />
      <MonitorControls id={id} updatedAt={monitor.updatedAt.toISOString()} enabled={monitor.enabled} />
    </>
  );
}
