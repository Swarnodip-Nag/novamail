import { test, expect } from "@playwright/test";

test.describe("NovaMail Smoke Tests", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page).toHaveTitle(/NovaMail/);
  });

  test("login page accessible", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    const content = await page.content();
    expect(content).toContain("NovaMail");
  });

  test("PWA manifest exists", async ({ page }) => {
    await page.goto("http://localhost:3000");
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestLink).toBeDefined();
  });
});
