import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("unauthenticated visitors are redirected to the login page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("login page renders the institutional portal", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Institutional Portal")).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
});
