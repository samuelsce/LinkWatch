import { expect, it } from "vitest";
import { checkTransition } from "../../src/domain/check-transition";

const initial = { status: "UNKNOWN" as const, consecutiveFailures: 0, firstFailureAt: null };
it("confirms outage on second failure, preserving the first failure time", () => {
  const first = checkTransition(initial, { outcome: "FAILURE" }, new Date(1000));
  const second = checkTransition(first, { outcome: "FAILURE" }, new Date(2000));
  expect(first).toMatchObject({ status: "UNSTABLE", incident: "none" });
  expect(second).toMatchObject({ status: "OFFLINE", incident: "open", firstFailureAt: new Date(1000) });
});
it("success resets an isolated failure and resolves an open incident", () => {
  const failure = checkTransition(initial, { outcome: "FAILURE" }, new Date());
  expect(checkTransition(failure, { outcome: "SUCCESS" }, new Date())).toMatchObject({ status: "ONLINE", consecutiveFailures: 0, firstFailureAt: null, incident: "resolve" });
});
it.each(["BLOCKED", "COLLECTOR_ERROR"] as const)("%s never assumes recovery and breaks failure sequence", (outcome) => {
  expect(checkTransition({ status: "OFFLINE", consecutiveFailures: 3, firstFailureAt: new Date() }, { outcome }, new Date())).toMatchObject({ status: "OFFLINE", consecutiveFailures: 0, firstFailureAt: null, incident: "none" });
});
