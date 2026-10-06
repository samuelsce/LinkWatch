import { describe, expect, it } from "vitest";
import { publicSummary, visibleStatus } from "../../src/domain/visible-status";
import { statusPageInput } from "../../src/features/status-pages/input";

const initial = { enabled: true, status: "ONLINE", lastCompletedAt: new Date(1000), intervalSeconds: 60, timeoutMs: 2000 };
describe("public status honesty", () => {
  it("does not claim online without an observation", () => expect(visibleStatus({ ...initial, lastCompletedAt: null }, 2000)).toBe("UNKNOWN"));
  it("shows stale even if the persisted state was online", () => expect(visibleStatus(initial, 200000)).toBe("STALE"));
  it("shows missing first observation as stale after the freshness window", () => expect(visibleStatus({ ...initial, createdAt: new Date(1000), lastCompletedAt: null }, 200000)).toBe("STALE"));
  it("keeps paused services separate from stale status", () => expect(visibleStatus({ ...initial, enabled: false }, 200000)).toBe("PAUSED"));
  it.each([{ states: [] }, { states: ["PAUSED"] as const }])("never claims an empty or paused-only page is operational", ({ states }) => expect(publicSummary([...states])).toBe("Nenhum serviço ativo publicado"));
  it.each(["UNKNOWN", "STALE", "UNSTABLE"] as const)("includes %s in degraded summary", (state) => expect(publicSummary(["ONLINE", state, "PAUSED"])).toBe("Há serviços instáveis ou sem dados recentes"));
  it("reports outages ahead of other missing data", () => expect(publicSummary(["UNKNOWN", "OFFLINE"])).toBe("Há serviços indisponíveis"));
  it("reports online only for fresh active services", () => expect(publicSummary(["ONLINE", "PAUSED"])).toBe("Todos os serviços ativos estão online"));
});
describe("explicit status-page configuration", () => {
  const draft = { title: "Status", slug: "my-status", monitors: [] };
  it("is private by default", () => expect(statusPageInput.parse(draft).published).toBe(false));
  it.each(["../secret", "MixedCase", "a--b", "-abc", "abc-", "ab", "a".repeat(81)])("rejects invalid slug %s", (slug) => expect(statusPageInput.safeParse({ ...draft, slug }).success).toBe(false));
  it("rejects duplicate monitor selection", () => {
    const monitor = { id: "55555555-5555-4555-8555-555555555555", publicName: "Public service" };
    expect(statusPageInput.safeParse({ ...draft, monitors: [monitor, monitor] }).success).toBe(false);
  });
});
