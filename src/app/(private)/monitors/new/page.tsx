import { requireUser } from "@/server/session";
import { MonitorForm } from "@/components/monitor-form";

export default async function NewMonitor() {
  await requireUser();
  return <><h1 className="text-3xl font-semibold">Novo monitor</h1><p className="mt-3 muted">Configure o serviço que você quer acompanhar.</p><MonitorForm /></>;
}
