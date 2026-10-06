import type { Monitor } from "../generated/prisma/client";
import { visibleStatus, statusLabels } from "../domain/visible-status";

export function MonitorStatus({ monitor, now }: { monitor: Pick<Monitor, "enabled" | "status" | "lastCompletedAt" | "intervalSeconds" | "timeoutMs">; now: number }) {
  const state = visibleStatus(monitor, now);
  const color = state === "ONLINE" ? "positive" : state === "OFFLINE" ? "negative" : ["STALE", "UNSTABLE"].includes(state) ? "warning" : "muted";
  return <span className={`status-badge ${color}`}><span className="status-dot !mr-0" aria-hidden="true" /><span>{statusLabels[state]}</span></span>;
}
