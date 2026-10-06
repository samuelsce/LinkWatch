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
  const panel = page.getByRole("link", { name: "Abrir meu painel" });
  await expect(panel).toBeFocused();
  expect(await panel.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.screenshot({ path: info.outputPath("home-desktop.png"), fullPage: true });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login$/);
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
