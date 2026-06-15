import { expect, test } from "@playwright/test";
import { exerciseUiWorkload, openShop } from "../support/juice";

test("abre el menú de cuenta y navega al login", async ({ page }) => {
  await openShop(page);
  await page.locator("#navbarAccount").click();
  await page.getByRole("menuitem", { name: "Go to login page" }).click();
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await exerciseUiWorkload(page, 3);
});
