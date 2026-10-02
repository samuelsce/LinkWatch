import type { Monitor } from "../generated/prisma/client";

export function MonitorStatus({ monitor, now }: { monitor: Pick<Monitor, "enabled" | "status" | "lastCompletedAt" | "intervalSeconds" | "timeoutMs">; now: number }) {
  let label = "Aguardando primeira verificação", color = "text-slate-300";
  if (!monitor.enabled) { label = "Pausado"; color = "text-slate-400"; }
  else if (monitor.lastCompletedAt && now - monitor.lastCompletedAt.getTime() > monitor.intervalSeconds * 2000 + monitor.timeoutMs + 30000) { label = "Sem dados recentes"; color = "text-amber-300"; }
  else if (monitor.status === "ONLINE") { label = "Online"; color = "text-green-300"; }
  else if (monitor.status === "UNSTABLE") { label = "Instável"; color = "text-amber-300"; }
  else if (monitor.status === "OFFLINE") { label = "Offline"; color = "text-rose-300"; }
  return <span className={`inline-flex items-center gap-2 text-sm ${color}`}><span aria-hidden="true">●</span><span>{label}</span></span>;
}
