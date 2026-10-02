import { randomBytes, randomUUID } from "node:crypto";
import { test, expect, type BrowserContext } from "@playwright/test";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const owners: string[] = [];

async function session(context: BrowserContext, name: string, expired = false) {
  const id = randomUUID();
  const token = randomBytes(32).toString("base64url");
  await pool.query('INSERT INTO "User" (id, name) VALUES ($1, $2)', [id, name]);
  owners.push(id);
  await pool.query('INSERT INTO "Session" (id, "sessionToken", "userId", expires) VALUES ($1, $2, $3, $4)', [randomUUID(), token, id, new Date(Date.now() + (expired ? -60000 : 3600000))]);
  await context.addCookies([{ name: "authjs.session-token", value: token, url: "http://localhost:3100", httpOnly: true, sameSite: "Lax" }]);
  return { id, token };
}

test.afterAll(async () => {
  try { await pool.query('DELETE FROM "User" WHERE id = ANY($1::uuid[])', [owners]); }
  finally { await pool.end(); }
});

test("anonymous and expired sessions cannot enter private routes", async ({ page, context }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await session(context, "Expired", true);
  await page.goto("/monitors/new");
  await expect(page).toHaveURL(/\/login$/);
});

test("creates, validates, edits, pauses, resumes and deletes a monitor", async ({ page, context }) => {
  await session(context, "E2E owner");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Seu primeiro serviço começa aqui" })).toBeVisible();
  await page.getByRole("link", { name: "Novo monitor", exact: true }).click();
  await page.getByLabel("Nome do monitor").fill("Minha API");
  await page.getByLabel("URL pública").fill("http://127.0.0.1");
  await page.getByRole("button", { name: "Criar monitor", exact: true }).click();
  await expect(page.getByText("Use uma URL HTTP/HTTPS pública", { exact: false })).toBeVisible();
  await page.getByLabel("URL pública").fill("https://example.com/health");
  await page.getByRole("button", { name: "Criar monitor", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Minha API", exact: true })).toBeVisible();
  await expect(page.getByText("Aguardando primeira verificação", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Editar monitor", exact: true }).click();
  await page.getByLabel("Nome do monitor").fill("Minha API editada");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("heading", { name: "Minha API editada", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pausar monitor", exact: true }).click();
  await expect(page.getByText("Pausado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retomar monitor", exact: true }).click();
  await expect(page.getByText("Aguardando primeira verificação", { exact: true })).toBeVisible();
  await page.getByText("Excluir monitor", { exact: true }).click();
  await page.getByLabel("Confirmo que quero excluir este monitor.").check();
  await page.getByRole("button", { name: "Excluir definitivamente", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Seu primeiro serviço começa aqui" })).toBeVisible();
});

test("a second account cannot read or mutate the first account's monitor", async ({ browser }) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  try {
    const owner = await session(first, "First owner");
    await session(second, "Second owner");
    const id = randomUUID();
    await pool.query('INSERT INTO "Monitor" (id, "ownerId", name, url, "updatedAt") VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)', [id, owner.id, "Secret monitor", "https://example.com/private"]);
    const otherPage = await second.newPage();
    await otherPage.goto("/dashboard");
    await expect(otherPage.getByText("Secret monitor")).toHaveCount(0);
    await otherPage.goto(`/monitors/${id}`);
    await expect(otherPage.getByRole("heading", { name: "Monitor não encontrado" })).toBeVisible();
    // Submit a genuine action form with another owner's ID; hidden fields are untrusted.
    await otherPage.goto("/monitors/new");
    await otherPage.getByLabel("Nome do monitor").fill("Hijacked");
    await otherPage.getByLabel("URL pública").fill("https://example.com/hijacked");
    const { rows } = await pool.query('SELECT "updatedAt" FROM "Monitor" WHERE id = $1', [id]);
    await otherPage.locator("form").last().evaluate((form, data) => {
      for (const [name, value] of Object.entries(data)) {
        const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; form.appendChild(input);
      }
    }, { id, updatedAt: rows[0].updatedAt.toISOString() });
    await otherPage.getByRole("button", { name: "Criar monitor", exact: true }).click();
    await expect(otherPage.getByRole("alert").filter({ hasText: "Monitor não encontrado." })).toBeVisible();
    const unchanged = await pool.query('SELECT name FROM "Monitor" WHERE id = $1', [id]);
    expect(unchanged.rows[0].name).toBe("Secret monitor");
  } finally { await first.close(); await second.close(); }
});

test("logout removes the database session and rejects its old cookie", async ({ page, context, request }) => {
  const user = await session(context, "Logout test");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  const result = await pool.query('SELECT id FROM "Session" WHERE "sessionToken" = $1', [user.token]);
  expect(result.rowCount).toBe(0);
  const response = await request.get("/dashboard", { headers: { Cookie: `authjs.session-token=${user.token}` }, maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/login");
});

test("mobile form has labels and fits a narrow viewport", async ({ page, context }) => {
  await session(context, "Mobile test");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/monitors/new");
  await expect(page.getByLabel("URL pública")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("GitHub sign-in uses the configured client and callback without requesting repository access", async ({ page }) => {
  await page.route("https://github.com/login/oauth/authorize**", (route) => route.fulfill({ status: 200, body: "OAuth navigation intercepted by test" }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar com GitHub", exact: true }).click();
  await page.waitForURL("https://github.com/login/oauth/authorize**");
  const url = new URL(page.url());
  expect(url.searchParams.get("client_id")).toBe("e2e-client-id");
  expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3100/api/auth/callback/github");
  expect(url.searchParams.get("scope")).toBe("read:user user:email");
});

test("rejects a server action submitted with an untrusted Origin", async ({ page, context }) => {
  const user = await session(context, "Origin test");
  await page.goto("/monitors/new");
  await page.getByLabel("Nome do monitor").fill("Cross origin attempt");
  await page.getByLabel("URL pública").fill("https://example.com/health");
  await page.route("**/monitors/new", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    // Send through the API client: browsers retain their own Origin on navigation.
    const result = await route.fetch({ headers: { ...route.request().headers(), origin: "https://untrusted.example" } });
    await route.fulfill({ response: result });
  });
  const response = page.waitForResponse((result) => result.request().method() === "POST" && result.url().endsWith("/monitors/new"));
  await page.getByRole("button", { name: "Criar monitor", exact: true }).click();
  expect((await response).status()).toBe(500);
  expect((await pool.query('SELECT id FROM "Monitor" WHERE "ownerId" = $1', [user.id])).rowCount).toBe(0);
});

test("shows real stored observations, incident recovery and history windows on mobile", async ({ page, context }) => {
  const user = await session(context, "History test");
  const id = randomUUID();
  const now = new Date();
  await pool.query('INSERT INTO "Monitor" (id, "ownerId", name, url, status, "lastCompletedAt", "updatedAt") VALUES ($1,$2,$3,$4,\'ONLINE\',$5,$5)', [id, user.id, "Observed service", "https://example.com/health", now]);
  for (const [index, outcome] of ["FAILURE", "FAILURE", "SUCCESS"].entries()) {
    const time = new Date(now.getTime() - (3 - index) * 1000);
    await pool.query('INSERT INTO "CheckRun" (id,"monitorId","scheduledAt",revision,"startedAt","completedAt",state,outcome,"latencyMs") VALUES ($1,$2,$3,1,$3,$3,\'COMPLETED\',$4,$5)', [randomUUID(), id, time, outcome, outcome === "SUCCESS" ? 82 : null]);
  }
  await pool.query('INSERT INTO "Incident" (id,"monitorId","startedAt","confirmedAt","endedAt","endReason","failureCode") VALUES ($1,$2,$3,$4,$5,\'RECOVERED\',\'HTTP_STATUS\')', [randomUUID(), id, new Date(now.getTime() - 3000), new Date(now.getTime() - 2000), now]);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/monitors/${id}`);
  await expect(page.getByText("33,33%", { exact: true })).toBeVisible();
  await expect(page.getByText("Recuperado", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("82 ms");
  await page.getByRole("link", { name: "7 dias", exact: true }).click();
  await expect(page).toHaveURL(/hours=168$/);
  await expect(page.getByRole("link", { name: "7 dias", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
