import type { ProbeResult } from "../monitoring/probe";

type State = { status: "UNKNOWN" | "ONLINE" | "UNSTABLE" | "OFFLINE" | "PAUSED"; consecutiveFailures: number; firstFailureAt: Date | null };

export function checkTransition(previous: State, result: ProbeResult, now: Date) {
  if (result.outcome === "SUCCESS") return {
    status: "ONLINE" as const, consecutiveFailures: 0, firstFailureAt: null,
    incident: "resolve" as const,
  };
  // Missing endpoint observations break the consecutive-failure sequence,
  // but never resolve an existing incident or refresh endpoint freshness.
  if (result.outcome !== "FAILURE") return {
    status: previous.status, consecutiveFailures: 0, firstFailureAt: null, incident: "none" as const,
  };
  const consecutiveFailures = previous.consecutiveFailures + 1;
  return {
    status: consecutiveFailures >= 2 ? "OFFLINE" as const : "UNSTABLE" as const,
    consecutiveFailures, firstFailureAt: previous.firstFailureAt ?? now,
    incident: consecutiveFailures >= 2 ? "open" as const : "none" as const,
  };
}
