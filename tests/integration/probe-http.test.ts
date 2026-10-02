import { createServer } from "node:http";
import { createServer as createTlsServer } from "node:https";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { probe, requestHeaders, type Target } from "../../src/monitoring/probe";

let port: number;
let hits = 0;
const server = createServer((request, response) => {
  hits++;
  if (request.url === "/timeout") return;
  if (request.url === "/redirect") { response.writeHead(302, { Location: `http://127.0.0.1:${port}/forbidden` }); response.end(); return; }
  if (request.url === "/host") { response.writeHead(request.headers.host === `fixture.example.com:${port}` ? 200 : 400); response.end(); return; }
  response.writeHead(200); response.flushHeaders(); // Body never finishes.
});
beforeAll(async () => { await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve)); port = (server.address() as AddressInfo).port; });
afterAll(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); });

// This transport mapping exists only in this test harness, never in app config.
const headers = (target: Target, signal: AbortSignal) => requestHeaders({ ...target, address: "127.0.0.1", family: 4, url: new URL(`http://fixture.example.com:${port}${target.url.pathname}`) }, signal);
const dependencies = { resolve: async () => [{ address: "93.184.216.34", family: 4 }], headers };
const input = { url: "http://fixture.example.com/ok", timeoutMs: 1000, expectedStatus: 200 };

it("finishes at headers even when the server never finishes its body", async () => {
  expect(await probe(input, undefined, dependencies)).toMatchObject({ outcome: "SUCCESS", httpStatus: 200 });
});
it("does not request the redirect target", async () => {
  const before = hits;
  expect(await probe({ ...input, url: "http://fixture.example.com/redirect", expectedStatus: 302 }, undefined, dependencies)).toMatchObject({ outcome: "SUCCESS", httpStatus: 302 });
  expect(hits - before).toBe(1);
});
it("retains the hostname in Host while connecting to the pinned address", async () => {
  expect(await probe({ ...input, url: "http://fixture.example.com/host" }, undefined, dependencies)).toMatchObject({ outcome: "SUCCESS" });
});
it("aborts a request that never sends headers", async () => {
  expect(await probe({ ...input, url: "http://fixture.example.com/timeout", timeoutMs: 30 }, undefined, dependencies)).toEqual({ outcome: "FAILURE", errorCode: "TIMEOUT" });
});

it("rejects an actual self-signed TLS certificate", async () => {
  const tls = createTlsServer({ key: readFileSync("tests/fixtures/tls-test-key.pem"), cert: readFileSync("tests/fixtures/tls-test-cert.pem") }, (_request, response) => response.end("ok"));
  await new Promise<void>((resolve) => tls.listen(0, "127.0.0.1", resolve));
  const tlsPort = (tls.address() as AddressInfo).port;
  try {
    const result = await probe({ ...input, url: "https://fixture.example.com/health" }, undefined, {
      ...dependencies,
      headers: (target, signal) => requestHeaders({ ...target, address: "127.0.0.1", family: 4, url: new URL(`https://fixture.example.com:${tlsPort}/health`) }, signal),
    });
    expect(result).toEqual({ outcome: "FAILURE", errorCode: "TLS" });
  } finally { tls.closeAllConnections(); await new Promise<void>((resolve) => tls.close(() => resolve())); }
});
