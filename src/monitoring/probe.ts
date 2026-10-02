import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import ipaddr from "ipaddr.js";
import { publicHttpUrl } from "../domain/monitor-input";

export type ProbeResult = {
  outcome: "SUCCESS" | "FAILURE" | "BLOCKED" | "COLLECTOR_ERROR";
  httpStatus?: number;
  latencyMs?: number;
  errorCode?: string;
};
export type Target = { url: URL; address: string; family: 4 | 6 };
type Address = { address: string; family: number };
type Dependencies = {
  resolve: (hostname: string) => Promise<Address[]>;
  headers: (target: Target, signal: AbortSignal) => Promise<number>;
};

export function publicAddress(address: string) {
  try { return ipaddr.process(address).range() === "unicast"; } catch { return false; }
}

// A dedicated, non-pooled connection avoids proxy environment variables and
// previously resolved sockets. Keep the hostname for Host, TLS SNI/certificates.
export function requestHeaders(target: Target, signal: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = (target.url.protocol === "https:" ? httpsRequest : httpRequest)(target.url, {
      method: "GET", agent: false, signal, family: target.family,
      maxHeaderSize: 16384,
      headers: { "User-Agent": "LinkWatch/1.0", Accept: "*/*", Connection: "close" },
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, [{ address: target.address, family: target.family }]);
        else callback(null, target.address, target.family);
      },
    }, (response) => {
      // Do not follow redirects or download/store the response body.
      resolve(response.statusCode ?? 0);
      response.destroy();
      request.destroy();
    });
    request.once("upgrade", (_response, socket) => { socket.destroy(); reject(Object.assign(new Error(), { code: "HTTP_UPGRADE" })); });
    request.once("error", reject);
    request.end();
  });
}

const production: Dependencies = {
  resolve: (hostname) => lookup(hostname, { all: true, verbatim: true }),
  headers: requestHeaders,
};

async function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let listener!: () => void;
  try {
    return await Promise.race([work, new Promise<never>((_resolve, reject) => {
      listener = () => reject(signal.reason);
      signal.addEventListener("abort", listener, { once: true });
      if (signal.aborted) listener();
    })]);
  } finally { signal.removeEventListener("abort", listener); }
}

export async function probe(
  input: { url: string; timeoutMs: number; expectedStatus: number },
  shutdown?: AbortSignal,
  dependencies: Dependencies = production,
): Promise<ProbeResult> {
  if (!publicHttpUrl(input.url)) return { outcome: "BLOCKED", errorCode: "URL_POLICY" };
  if (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 1 || input.timeoutMs > 15000) return { outcome: "COLLECTOR_ERROR", errorCode: "INVALID_TIMEOUT" };
  const timeout = AbortSignal.timeout(input.timeoutMs);
  const signal = shutdown ? AbortSignal.any([timeout, shutdown]) : timeout;
  const started = performance.now();
  let phase: "dns" | "http" = "dns";
  try {
    signal.throwIfAborted();
    const url = new URL(input.url);
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = ipaddr.isValid(hostname)
      ? [{ address: hostname, family: ipaddr.parse(hostname).kind() === "ipv4" ? 4 : 6 }]
      : await abortable(dependencies.resolve(hostname), signal);
    // A mixed public/private DNS response is rejected in its entirety.
    if (!addresses.length) return { outcome: "FAILURE", errorCode: "DNS" };
    if (addresses.some((entry) => !publicAddress(entry.address) || ![4, 6].includes(entry.family))) return { outcome: "BLOCKED", errorCode: "DNS_POLICY" };
    const selected = addresses[0]!;
    phase = "http";
    const httpStatus = await abortable(dependencies.headers({ url, address: selected.address, family: selected.family as 4 | 6 }, signal), signal);
    const latencyMs = Math.max(0, Math.round(performance.now() - started));
    if (httpStatus < 100 || httpStatus > 599) return { outcome: "FAILURE", errorCode: "HTTP_PROTOCOL" };
    return httpStatus === input.expectedStatus
      ? { outcome: "SUCCESS", httpStatus, latencyMs }
      : { outcome: "FAILURE", httpStatus, latencyMs, errorCode: "HTTP_STATUS" };
  } catch (error) {
    if (shutdown?.aborted) return { outcome: "COLLECTOR_ERROR", errorCode: "SHUTDOWN" };
    if (timeout.aborted) return { outcome: "FAILURE", errorCode: "TIMEOUT" };
    const code = (error as { code?: string })?.code ?? "";
    if (phase === "dns" && ["ENOTFOUND", "EAI_AGAIN", "ETIMEOUT", "ENODATA", "ESERVFAIL"].includes(code)) return { outcome: "FAILURE", errorCode: "DNS" };
    if (/CERT|TLS|SSL/.test(code) || code === "DEPTH_ZERO_SELF_SIGNED_CERT") return { outcome: "FAILURE", errorCode: "TLS" };
    if (["ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "EPIPE", "ETIMEDOUT"].includes(code)) return { outcome: "FAILURE", errorCode: "CONNECTION" };
    if (code.startsWith("HPE_") || code === "HTTP_UPGRADE") return { outcome: "FAILURE", errorCode: "HTTP_PROTOCOL" };
    return { outcome: "COLLECTOR_ERROR", errorCode: "PROBE_INTERNAL" };
  }
}
