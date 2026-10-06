import { test, expect } from "@playwright/test";

test("landing supports keyboard navigation, reduced motion and a working favicon", async ({ page, request }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("Exemplo ilustrativo")).toBeVisible();
  const icon = page.locator('link[rel="icon"][type="image/svg+xml"]');
  const href = await icon.getAttribute("href");
  expect(href).toBeTruthy();
  const response = await request.get(href!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
  expect((await request.get("/favicon.ico")).ok()).toBe(true);
  expect(await page.locator(".signal-trace").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "LinkWatch, início" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Entrar com GitHub" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Alternar tema" })).toBeFocused();
  await page.keyboard.press("Tab");
  const panel = page.getByRole("link", { name: "Abrir meu painel" });
  await expect(panel).toBeFocused();
  expect(await panel.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.screenshot({ path: info.outputPath("home-desktop.png"), fullPage: true });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login$/);
});

test("theme follows the device, persists manual choices and synchronizes tabs", async ({ page, context }, info) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => { if (/hydration|hydrated/i.test(message.text())) hydrationErrors.push(message.text()); });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page).toHaveTitle("LinkWatch | Monitor de sites e APIs");
  await page.screenshot({ path: info.outputPath("home-dark-desktop.png"), fullPage: true });
  const toggle = page.getByRole("button", { name: "Alternar tema" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("linkwatch.theme"))).toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: "Entrar com GitHub" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const second = await context.newPage();
  try {
    await second.goto("/");
    await toggle.click();
    await expect(second.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({ path: info.outputPath("login-dark-mobile.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await second.close(); }
  expect(hydrationErrors).toEqual([]);
});

test("saved dark preference is applied before React loads", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("linkwatch.theme", "dark"));
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.locator("html").evaluate((element) => getComputedStyle(element).colorScheme)).toBe("dark");
});

test("theme still switches and navigates when browser storage is blocked", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Storage blocked", "SecurityError"); } }));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: "Entrar com GitHub" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("landing and sign-in remain readable at mobile and tablet widths", async ({ page }, info) => {
  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 800 });
    for (const route of ["/", "/login"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${route === "/" ? "home" : "login"}-${width}.png`), fullPage: true, animations: "disabled" });
    }
  }
});
