import type { Monitor } from "../generated/prisma/client";
import { visibleStatus, statusLabels } from "../domain/visible-status";

export function MonitorStatus({ monitor, now }: { monitor: Pick<Monitor, "enabled" | "status" | "lastCompletedAt" | "intervalSeconds" | "timeoutMs">; now: number }) {
  const state = visibleStatus(monitor, now);
  const label = statusLabels[state];
  const color = state === "ONLINE" ? "text-green-300" : state === "OFFLINE" ? "text-rose-300" : ["STALE", "UNSTABLE"].includes(state) ? "text-amber-300" : "text-slate-300";
  return <span className={`inline-flex items-center gap-2 text-sm ${color}`}><span aria-hidden="true">●</span><span>{label}</span></span>;
}
