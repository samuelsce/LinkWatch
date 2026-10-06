import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

test("security headers cover pages, health endpoints, errors and favicons", async ({ request }) => {
  const routes = [["/", 200], ["/login", 200], ["/api/auth/providers", 200], ["/api/health/live", 200], ["/api/health/ready", 200], ["/favicon.ico", 200], ["/status/does-not-exist", 404], ["/dashboard", 307]] as const;
  for (const [path, status] of routes) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(status);
    const headers = response.headers();
    expect(headers["content-security-policy"]).toBe("frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  }
});

test("the browser refuses to embed LinkWatch in another site's frame", async ({ page }, info) => {
  const target = new URL("/", info.project.use.baseURL).href;
  // Use a real loopback server: intercepted pages have no resolved network
  // address and may trigger browser local-network checks before CSP.
  const fixture = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(`<html><body><iframe src="${target}"></iframe></body></html>`);
  });
  await new Promise<void>((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  const embeddingSite = `http://127.0.0.1:${(fixture.address() as AddressInfo).port}/`;
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") violations.push(message.text());
  });
  try {
    await page.goto(embeddingSite);
    await expect.poll(() => violations.some((message) => /frame-ancestors|X-Frame-Options/i.test(message))).toBe(true);
    expect(page.frames().some((frame) => frame.url() === target)).toBe(false);
  } finally {
    await new Promise<void>((resolve, reject) => fixture.close((error) => error ? reject(error) : resolve()));
  }
});
