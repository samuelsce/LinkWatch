type MonitorState = { enabled: boolean; status: string; lastCompletedAt: Date | null; intervalSeconds: number; timeoutMs: number; createdAt?: Date };
export type VisibleStatus = "UNKNOWN" | "ONLINE" | "UNSTABLE" | "OFFLINE" | "PAUSED" | "STALE";
export const statusLabels: Record<VisibleStatus, string> = { UNKNOWN: "Aguardando primeira verificação", ONLINE: "Online", UNSTABLE: "Instável", OFFLINE: "Offline", PAUSED: "Pausado", STALE: "Sem dados recentes" };
export function visibleStatus(monitor: MonitorState, now: number): VisibleStatus {
  if (!monitor.enabled) return "PAUSED";
  const observed = monitor.lastCompletedAt ?? monitor.createdAt;
  if (observed && now - observed.getTime() > monitor.intervalSeconds * 2000 + monitor.timeoutMs + 30000) return "STALE";
  if (!monitor.lastCompletedAt) return "UNKNOWN";
  return ["ONLINE", "UNSTABLE", "OFFLINE"].includes(monitor.status) ? monitor.status as VisibleStatus : "UNKNOWN";
}
export function publicSummary(states: VisibleStatus[]) {
  const active = states.filter((state) => state !== "PAUSED");
  if (!active.length) return "Nenhum serviço ativo publicado";
  if (active.some((state) => state === "OFFLINE")) return "Há serviços indisponíveis";
  if (active.some((state) => state !== "ONLINE")) return "Há serviços instáveis ou sem dados recentes";
  return "Todos os serviços ativos estão online";
}
