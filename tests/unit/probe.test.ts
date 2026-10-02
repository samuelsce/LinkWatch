import { describe, expect, it, vi } from "vitest";
import { probe, publicAddress, type Target } from "../../src/monitoring/probe";

const input = { url: "https://example.com/health", timeoutMs: 1000, expectedStatus: 200 };
const resolve = async () => [{ address: "93.184.216.34", family: 4 }];

describe("outbound URL policy and probe classification", () => {
  it.each(["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "192.0.2.1", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "2001:db8::1"])("blocks nonpublic address %s", (address) => expect(publicAddress(address)).toBe(false));
  it("rejects mixed DNS results before opening a connection", async () => {
    const headers = vi.fn();
    expect(await probe(input, undefined, { resolve: async () => [...await resolve(), { address: "10.0.0.1", family: 4 }], headers })).toEqual({ outcome: "BLOCKED", errorCode: "DNS_POLICY" });
    expect(headers).not.toHaveBeenCalled();
  });
  it("passes the single validated IP and original hostname to transport", async () => {
    const headers = vi.fn(async (target: Target) => target.url.hostname === "example.com" ? 200 : 400);
    const resolver = vi.fn(resolve);
    expect(await probe(input, undefined, { resolve: resolver, headers })).toMatchObject({ outcome: "SUCCESS", httpStatus: 200 });
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(headers.mock.calls[0]![0]).toMatchObject({ address: "93.184.216.34", family: 4 });
  });
  it.each([301, 503])("treats unexpected status %s as failure", async (status) => {
    expect(await probe(input, undefined, { resolve, headers: async () => status })).toMatchObject({ outcome: "FAILURE", errorCode: "HTTP_STATUS", httpStatus: status });
  });
  it("allows an explicitly expected redirect code", async () => {
    expect(await probe({ ...input, expectedStatus: 301 }, undefined, { resolve, headers: async () => 301 })).toMatchObject({ outcome: "SUCCESS" });
  });
  it.each([["ENOTFOUND", "DNS"], ["ECONNREFUSED", "CONNECTION"], ["CERT_HAS_EXPIRED", "TLS"], ["HPE_HEADER_OVERFLOW", "HTTP_PROTOCOL"]])("sanitizes network error %s", async (code, errorCode) => {
    const fail = async () => { throw Object.assign(new Error("private URL and token"), { code }); };
    expect(await probe(input, undefined, { resolve: code === "ENOTFOUND" ? fail : resolve, headers: fail })).toEqual({ outcome: "FAILURE", errorCode });
  });
  it("separates internal exceptions from endpoint failures", async () => {
    expect(await probe(input, undefined, { resolve, headers: async () => { throw new Error("secret"); } })).toEqual({ outcome: "COLLECTOR_ERROR", errorCode: "PROBE_INTERNAL" });
  });
  it("bounds DNS time with the total deadline", async () => {
    // Keep a ref'ed timer because AbortSignal.timeout deliberately does not keep Node alive.
    const alive = setTimeout(() => {}, 1000);
    try { expect(await probe({ ...input, timeoutMs: 20 }, undefined, { resolve: () => new Promise(() => {}), headers: vi.fn() })).toEqual({ outcome: "FAILURE", errorCode: "TIMEOUT" }); }
    finally { clearTimeout(alive); }
  });
  it("shutdown is operational, not a target outage", async () => {
    const controller = new AbortController(); controller.abort();
    expect(await probe(input, controller.signal)).toEqual({ outcome: "COLLECTOR_ERROR", errorCode: "SHUTDOWN" });
  });
});
