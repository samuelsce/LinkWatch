import { ownedMonitor } from "@/server/owned-monitor";
import { MonitorForm } from "@/components/monitor-form";

export default async function EditMonitor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const monitor = await ownedMonitor(id);
  return <><h1 className="text-3xl font-semibold">Editar monitor</h1><p className="mt-3 muted">Atualize a configuração do serviço.</p><MonitorForm initial={{ id, updatedAt: monitor.updatedAt.toISOString(), name: monitor.name, url: monitor.url, intervalSeconds: monitor.intervalSeconds, timeoutMs: monitor.timeoutMs, expectedStatus: monitor.expectedStatus }} /></>;
}
